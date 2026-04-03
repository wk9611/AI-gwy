import { Router } from 'express';
import { crawlQuestions } from '../services/crawlerService.js';

const router = Router();

// 爬取题目
router.post('/', async (req, res) => {
  const { url, category } = req.body;
  if (!url) return res.status(400).json({ error: '请提供URL' });
  if (!category) return res.status(400).json({ error: '请指定题型分类' });

  try {
    const result = await crawlQuestions(url, category);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `爬取失败: ${err.message}` });
  }
});

export default router;
