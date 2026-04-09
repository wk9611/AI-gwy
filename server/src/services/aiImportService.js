import fs from 'fs';
import path from 'path';
import axios from 'axios';
import prisma from '../db.js';

const VALID_CATEGORIES = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];

const SYSTEM_PROMPT = `你是一个公务员行测题目识别专家。请从用户提供的文本中提取所有行测题目，并以JSON数组格式返回。

每道题目需要包含以下字段：
- category: 题型分类，必须是以下之一：政治理论、常识判断、言语理解、数量关系、判断推理、资料分析
- content: 题目内容（完整题干）
- optionA: 选项A的内容（不含"A."前缀）
- optionB: 选项B的内容
- optionC: 选项C的内容
- optionD: 选项D的内容
- answer: 正确答案（A/B/C/D）
- explanation: 答案解析（如果原文没有解析，请根据题目生成简要解析）
- knowledgePoint: 对应知识点（简短标签）
- difficulty: 难度等级（1-5，根据题目复杂度判断）

题型分类规则：
- 政治理论：涉及马克思主义、毛泽东思想、中国特色社会主义理论、党的方针政策、时事政治等
- 常识判断：涉及法律、经济、历史、地理、科技、文化、生物、物理、化学等百科知识
- 言语理解：涉及阅读理解、逻辑填空、语句排序、病句辨析、主旨概括等语言类题目
- 数量关系：涉及数学运算、数字推理、方程求解、排列组合、概率等数学类题目
- 判断推理：涉及逻辑推理、定义判断、类比推理、图形推理等推理类题目
- 资料分析：涉及对统计数据、图表、百分比、增长率等数据的分析计算

请严格按照JSON数组格式输出，不要输出任何其他内容。如果无法识别答案，answer字段填写你认为最可能正确的选项。
输出格式示例：
[{"category":"常识判断","content":"题目内容","optionA":"...","optionB":"...","optionC":"...","optionD":"...","answer":"A","explanation":"...","knowledgePoint":"...","difficulty":3}]`;

/**
 * 从文件中提取纯文本
 */
export async function extractTextFromFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const buffer = fs.readFileSync(filePath);
      const uint8 = new Uint8Array(buffer);
      const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;
      const pages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => item.str).join(' '));
      }
      return pages.join('\n');
    } catch {
      throw new Error('PDF解析库未安装，云端部署暂不支持PDF上传，请使用TXT格式或本地部署');
    }
  }

  if (ext === '.docx' || ext === '.doc') {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch {
      throw new Error('Word解析库未安装，云端部署暂不支持Word上传，请使用TXT格式或本地部署');
    }
  }

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  throw new Error(`不支持的文件格式: ${ext}，请上传 PDF、Word 或 TXT 文件`);
}

/**
 * 从 AI 返回的文本中提取 JSON 数组（容错处理截断的 JSON）
 */
function extractJsonFromContent(content) {
  // 提取 JSON 部分
  let jsonStr = content;

  // 从 markdown 代码块中提取
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    // 提取第一个 [ 开始的内容
    const startIdx = content.indexOf('[');
    if (startIdx >= 0) {
      jsonStr = content.substring(startIdx);
    }
  }

  // 尝试直接解析
  try {
    return JSON.parse(jsonStr);
  } catch {
    // JSON 可能被截断，尝试修复：找到最后一个完整的 } 后闭合数组
    const lastCompleteObj = jsonStr.lastIndexOf('}');
    if (lastCompleteObj > 0) {
      const repaired = jsonStr.substring(0, lastCompleteObj + 1) + ']';
      try {
        return JSON.parse(repaired);
      } catch {
        // 再试：去掉最后一个不完整的对象
        const secondLast = jsonStr.lastIndexOf('},');
        if (secondLast > 0) {
          const repaired2 = jsonStr.substring(0, secondLast + 1) + ']';
          try {
            return JSON.parse(repaired2);
          } catch {
            return [];
          }
        }
      }
    }
    return [];
  }
}

/**
 * 调用通义千问 API 解析题目
 * 短文本用 qwen-plus，长文本用 qwen-long（支持百万token）
 */
export async function aiParseQuestions(text) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('未配置 DASHSCOPE_API_KEY 环境变量，请先设置通义千问 API Key');
  }

  // 根据文本长度选择模型
  const model = text.length > 15000 ? 'qwen-long' : 'qwen-plus';

  const response = await axios.post(
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `请从以下文本中提取行测题目：\n\n${text}` },
      ],
      temperature: 0.1,
      max_tokens: 16000,
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5分钟超时
    }
  );

  const content = response.data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 未返回有效内容');
  }

  const allQuestions = extractJsonFromContent(content);

  if (allQuestions.length === 0) {
    throw new Error('AI 未能从文本中识别出题目');
  }

  // 校验和清洗每道题
  return allQuestions.map((q, idx) => ({
    category: VALID_CATEGORIES.includes(q.category) ? q.category : '常识判断',
    content: String(q.content || '').trim(),
    optionA: String(q.optionA || '').trim(),
    optionB: String(q.optionB || '').trim(),
    optionC: String(q.optionC || '').trim(),
    optionD: String(q.optionD || '').trim(),
    answer: ['A', 'B', 'C', 'D'].includes(String(q.answer).toUpperCase()) ? String(q.answer).toUpperCase() : 'A',
    explanation: String(q.explanation || '暂无解析').trim(),
    knowledgePoint: q.knowledgePoint ? String(q.knowledgePoint).trim() : null,
    difficulty: Number(q.difficulty) >= 1 && Number(q.difficulty) <= 5 ? Number(q.difficulty) : 3,
  })).filter((q) => q.content && q.optionA && q.optionB && q.optionC && q.optionD);
}

/**
 * 将 AI 解析的题目批量入库
 */
export async function importAiParsedQuestions(questions) {
  let imported = 0;
  const errors = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    if (!q.content || !q.optionA || !q.optionB || !q.optionC || !q.optionD) {
      errors.push(`第${i + 1}题: 必填字段缺失`);
      continue;
    }

    if (!VALID_CATEGORIES.includes(q.category)) {
      errors.push(`第${i + 1}题: 无效分类 "${q.category}"`);
      continue;
    }

    await prisma.question.create({
      data: {
        category: q.category,
        content: q.content,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        answer: q.answer,
        explanation: q.explanation,
        knowledgePoint: q.knowledgePoint || null,
        difficulty: q.difficulty || 3,
        source: q.source || 'AI识别导入',
      },
    });
    imported++;
  }

  return { imported, total: questions.length, skipped: questions.length - imported, errors };
}
