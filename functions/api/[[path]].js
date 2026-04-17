import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const app = new Hono().basePath('/api');
app.use('*', cors());

function getPrisma(env) {
  const adapter = new PrismaLibSql({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
  return new PrismaClient({ adapter });
}

// 健康检查
app.get('/health', (c) => c.json({ status: 'ok' }));

// ====== 题目 ======
app.get('/questions/categories', async (c) => {
  const prisma = getPrisma(c.env);
  const categories = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
  const stats = await Promise.all(
    categories.map(async (cat) => ({
      category: cat,
      count: await prisma.question.count({ where: { category: cat } }),
    }))
  );
  return c.json(stats);
});

app.get('/questions', async (c) => {
  const prisma = getPrisma(c.env);
  const { category, page = '1', pageSize = '20', search, year, difficulty } = c.req.query();
  const where = {};
  if (category) where.category = category;
  if (year) where.year = parseInt(year);
  if (difficulty) where.difficulty = parseInt(difficulty);
  if (search) where.content = { contains: search };

  const [total, data] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize),
      orderBy: { id: 'desc' },
    }),
  ]);
  return c.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), data });
});

app.get('/questions/random', async (c) => {
  const prisma = getPrisma(c.env);
  const { category, count = '10' } = c.req.query();
  const where = {};
  if (category) where.category = category;
  const total = await prisma.question.count({ where });
  const take = Math.min(parseInt(count), total);
  if (take === 0) return c.json([]);

  const questions = await prisma.$queryRawUnsafe(
    `SELECT * FROM Question ${category ? `WHERE category = '${category}'` : ''} ORDER BY RANDOM() LIMIT ${take}`
  );
  return c.json(questions);
});

app.get('/questions/:id', async (c) => {
  const prisma = getPrisma(c.env);
  const question = await prisma.question.findUnique({ where: { id: parseInt(c.req.param('id')) } });
  if (!question) return c.json({ error: '题目不存在' }, 404);
  return c.json(question);
});

app.post('/questions', async (c) => {
  const prisma = getPrisma(c.env);
  const body = await c.req.json();
  if (!body.source) body.source = '手动添加';
  const question = await prisma.question.create({ data: body });
  return c.json(question, 201);
});

app.put('/questions/:id', async (c) => {
  const prisma = getPrisma(c.env);
  const body = await c.req.json();
  const question = await prisma.question.update({ where: { id: parseInt(c.req.param('id')) }, data: body });
  return c.json(question);
});

app.delete('/questions/:id', async (c) => {
  const prisma = getPrisma(c.env);
  await prisma.question.delete({ where: { id: parseInt(c.req.param('id')) } });
  return c.json({ success: true });
});

app.post('/questions/batch-delete', async (c) => {
  const prisma = getPrisma(c.env);
  const { ids } = await c.req.json();
  await prisma.question.deleteMany({ where: { id: { in: ids } } });
  return c.json({ success: true, deleted: ids.length });
});

// ====== 模拟考试 ======
app.post('/exams/generate', async (c) => {
  const prisma = getPrisma(c.env);
  const { totalCount = 120 } = await c.req.json();
  const distribution = [
    { category: '政治理论', ratio: 0.10 },
    { category: '常识判断', ratio: 0.17 },
    { category: '言语理解', ratio: 0.27 },
    { category: '数量关系', ratio: 0.13 },
    { category: '判断推理', ratio: 0.20 },
    { category: '资料分析', ratio: 0.13 },
  ];
  const questions = [];
  for (const { category, ratio } of distribution) {
    const count = Math.round(totalCount * ratio);
    const items = await prisma.$queryRawUnsafe(
      `SELECT * FROM Question WHERE category = '${category}' ORDER BY RANDOM() LIMIT ${count}`
    );
    questions.push(...items);
  }
  return c.json({ totalCount: questions.length, duration: 120 * 60, questions });
});

app.post('/exams/submit', async (c) => {
  const prisma = getPrisma(c.env);
  const { answers, duration } = await c.req.json();
  let correctCount = 0;
  const detailedAnswers = [];

  for (const { questionId, userAnswer } of answers) {
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    const isCorrect = question && question.answer === userAnswer;
    if (isCorrect) correctCount++;
    detailedAnswers.push({ questionId, userAnswer, correctAnswer: question?.answer, isCorrect });

    if (!isCorrect && question) {
      const existing = await prisma.wrongRecord.findFirst({ where: { questionId } });
      if (existing) {
        await prisma.wrongRecord.update({
          where: { id: existing.id },
          data: { count: existing.count + 1, userAnswer, mastered: false },
        });
      } else {
        await prisma.wrongRecord.create({ data: { questionId, userAnswer } });
      }
    }
  }

  const score = Math.round((correctCount / answers.length) * 100);
  const record = await prisma.examRecord.create({
    data: { score, totalCount: answers.length, correctCount, duration: duration || 0, answers: JSON.stringify(detailedAnswers) },
  });
  return c.json({ ...record, answers: detailedAnswers });
});

app.get('/exams/records', async (c) => {
  const prisma = getPrisma(c.env);
  const records = await prisma.examRecord.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  return c.json(records);
});

app.get('/exams/records/:id', async (c) => {
  const prisma = getPrisma(c.env);
  const record = await prisma.examRecord.findUnique({ where: { id: parseInt(c.req.param('id')) } });
  if (!record) return c.json({ error: '记录不存在' }, 404);
  return c.json({ ...record, answers: JSON.parse(record.answers) });
});

// ====== 错题本 ======
app.get('/wrong-book', async (c) => {
  const prisma = getPrisma(c.env);
  const { category, mastered, page = '1', pageSize = '20' } = c.req.query();
  const where = {};
  if (mastered !== undefined) where.mastered = mastered === 'true';

  const wrongRecords = await prisma.wrongRecord.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    skip: (parseInt(page) - 1) * parseInt(pageSize),
    take: parseInt(pageSize),
  });

  const enriched = await Promise.all(
    wrongRecords.map(async (record) => {
      const question = await prisma.question.findUnique({ where: { id: record.questionId } });
      if (category && question?.category !== category) return null;
      return { ...record, question };
    })
  );
  const filtered = enriched.filter(Boolean);
  return c.json({ total: filtered.length, data: filtered });
});

app.get('/wrong-book/stats', async (c) => {
  const prisma = getPrisma(c.env);
  const categories = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
  const wrongRecords = await prisma.wrongRecord.findMany({ where: { mastered: false } });
  const questionIds = wrongRecords.map((r) => r.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, category: true },
  });
  const categoryMap = new Map(questions.map((q) => [q.id, q.category]));
  const stats = categories.map((cat) => ({
    category: cat,
    count: wrongRecords.filter((r) => categoryMap.get(r.questionId) === cat).length,
  }));
  return c.json(stats);
});

app.put('/wrong-book/:id/master', async (c) => {
  const prisma = getPrisma(c.env);
  const record = await prisma.wrongRecord.update({ where: { id: parseInt(c.req.param('id')) }, data: { mastered: true } });
  return c.json(record);
});

app.put('/wrong-book/:id/unmaster', async (c) => {
  const prisma = getPrisma(c.env);
  const record = await prisma.wrongRecord.update({ where: { id: parseInt(c.req.param('id')) }, data: { mastered: false } });
  return c.json(record);
});

app.delete('/wrong-book/:id', async (c) => {
  const prisma = getPrisma(c.env);
  await prisma.wrongRecord.delete({ where: { id: parseInt(c.req.param('id')) } });
  return c.json({ success: true });
});

app.post('/wrong-book', async (c) => {
  const prisma = getPrisma(c.env);
  const { questionId, userAnswer } = await c.req.json();
  const existing = await prisma.wrongRecord.findFirst({ where: { questionId } });
  if (existing) {
    const updated = await prisma.wrongRecord.update({
      where: { id: existing.id },
      data: { count: existing.count + 1, userAnswer, mastered: false },
    });
    return c.json(updated);
  }
  const record = await prisma.wrongRecord.create({ data: { questionId, userAnswer } });
  return c.json(record);
});

// AI 智能识别上传
const AI_SYSTEM_PROMPT = `你是一个公务员行测题目识别专家。请从用户提供的文本中提取所有行测题目，并以JSON数组格式返回。

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

function extractJsonFromAiContent(content) {
  let jsonStr = content;
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    const startIdx = content.indexOf('[');
    if (startIdx >= 0) jsonStr = content.substring(startIdx);
  }
  try {
    return JSON.parse(jsonStr);
  } catch {
    const lastCompleteObj = jsonStr.lastIndexOf('}');
    if (lastCompleteObj > 0) {
      try { return JSON.parse(jsonStr.substring(0, lastCompleteObj + 1) + ']'); } catch {}
      const secondLast = jsonStr.lastIndexOf('},');
      if (secondLast > 0) {
        try { return JSON.parse(jsonStr.substring(0, secondLast + 1) + ']'); } catch {}
      }
    }
    return [];
  }
}

app.post('/import/ai-upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!file) return c.json({ error: '请上传文件' }, 400);

    const name = file.name || '';
    const ext = name.substring(name.lastIndexOf('.')).toLowerCase();

    let text = '';
    if (ext === '.txt') {
      text = await file.text();
    } else {
      return c.json({ error: '云端部署仅支持 TXT 文件上传，PDF/Word 请使用本地部署' }, 400);
    }

    if (!text || text.trim().length < 20) {
      return c.json({ error: '文件内容为空或文本过短，无法识别题目' }, 400);
    }

    const apiKey = c.env?.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return c.json({ error: '未配置 DASHSCOPE_API_KEY 环境变量' }, 500);
    }

    const model = text.length > 15000 ? 'qwen-long' : 'qwen-plus';
    const aiResp = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: `请从以下文本中提取行测题目：\n\n${text}` },
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) return c.json({ error: 'AI 未返回有效内容' }, 500);

    const validCategories = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
    const allQuestions = extractJsonFromAiContent(content);
    if (allQuestions.length === 0) return c.json({ error: 'AI 未能从文本中识别出题目' }, 500);

    const questions = allQuestions.map((q) => ({
      category: validCategories.includes(q.category) ? q.category : '常识判断',
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

    return c.json({ found: questions.length, questions, textLength: text.length });
  } catch (err) {
    return c.json({ error: err.message || 'AI 识别失败' }, 500);
  }
});

// AI 识别结果确认导入
app.post('/import/ai-confirm', async (c) => {
  const prisma = getPrisma(c.env);
  const { questions } = await c.req.json();
  if (!questions?.length) return c.json({ error: '没有可导入的题目' }, 400);

  const validCategories = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
  let imported = 0;
  const errors = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.content || !q.optionA || !q.optionB || !q.optionC || !q.optionD) {
      errors.push(`第${i + 1}题: 必填字段缺失`);
      continue;
    }
    if (!validCategories.includes(q.category)) {
      errors.push(`第${i + 1}题: 无效分类`);
      continue;
    }
    await prisma.question.create({
      data: {
        category: q.category, content: q.content,
        optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
        answer: q.answer, explanation: q.explanation,
        knowledgePoint: q.knowledgePoint || null, difficulty: q.difficulty || 3,
        source: q.source || 'AI识别导入',
      },
    });
    imported++;
  }
  return c.json({ imported, total: questions.length, skipped: questions.length - imported, errors });
});

export default {
  fetch: app.fetch,
};
