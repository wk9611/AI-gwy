import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import XLSX from 'xlsx';
import { importFromFile } from '../services/importService.js';
import { extractTextFromFile, aiParseQuestions, importAiParsedQuestions } from '../services/aiImportService.js';

const router = Router();
const uploadDir = process.env.VERCEL ? '/tmp' : 'uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

// 上传 Excel/CSV 文件导入题目
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });

  try {
    const result = await importFromFile(req.file.path, req.file.originalname);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 下载导入模板
router.get('/template', (req, res) => {
  const headers = ['题型分类', '年份', '来源', '题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '答案解析', '知识点', '难度'];
  const example = ['常识判断', '2023', '2023年国考', '我国最高国家权力机关是？', '全国人民代表大会', '国务院', '最高人民法院', '中央军事委员会', 'A', '全国人民代表大会是我国最高国家权力机关...', '宪法基础', '2'];

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '题目模板');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=question_template.xlsx');
  res.send(Buffer.from(buf));
});

// AI 智能识别上传（PDF/Word/TXT）
router.post('/ai-upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });

  try {
    // 1. 提取文本
    const text = await extractTextFromFile(req.file.path, req.file.originalname);
    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: '文件内容为空或文本过短，无法识别题目' });
    }

    // 2. 调用 AI 解析
    const questions = await aiParseQuestions(text);

    res.json({
      found: questions.length,
      questions,
      textLength: text.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI 识别结果确认导入
router.post('/ai-confirm', async (req, res) => {
  const { questions } = req.body;
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: '没有可导入的题目' });
  }

  try {
    const result = await importAiParsedQuestions(questions);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
