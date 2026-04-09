import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// 获取错题列表（支持按分类筛选）
router.get('/', async (req, res) => {
  const { category, mastered, page = 1, pageSize = 20 } = req.query;

  const where = {};
  if (mastered !== undefined) where.mastered = mastered === 'true';

  // 需要关联 Question 表获取分类信息
  const wrongRecords = await prisma.wrongRecord.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    skip: (parseInt(page) - 1) * parseInt(pageSize),
    take: parseInt(pageSize),
  });

  // 附加题目信息
  const enriched = await Promise.all(
    wrongRecords.map(async (record) => {
      const question = await prisma.question.findUnique({ where: { id: record.questionId } });
      if (category && question?.category !== category) return null;
      return { ...record, question };
    })
  );

  const filtered = enriched.filter(Boolean);
  const total = filtered.length;

  res.json({ total, data: filtered });
});

// 错题统计（按分类）
router.get('/stats', async (req, res) => {
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

  res.json(stats);
});

// 标记为已掌握
router.put('/:id/master', async (req, res) => {
  const record = await prisma.wrongRecord.update({
    where: { id: parseInt(req.params.id) },
    data: { mastered: true },
  });
  res.json(record);
});

// 取消已掌握标记
router.put('/:id/unmaster', async (req, res) => {
  const record = await prisma.wrongRecord.update({
    where: { id: parseInt(req.params.id) },
    data: { mastered: false },
  });
  res.json(record);
});

// 删除错题记录
router.delete('/:id', async (req, res) => {
  await prisma.wrongRecord.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true });
});

// 练习时记录错题
router.post('/', async (req, res) => {
  const { questionId, userAnswer } = req.body;
  const existing = await prisma.wrongRecord.findFirst({ where: { questionId } });

  if (existing) {
    const updated = await prisma.wrongRecord.update({
      where: { id: existing.id },
      data: { count: existing.count + 1, userAnswer, mastered: false },
    });
    return res.json(updated);
  }

  const record = await prisma.wrongRecord.create({ data: { questionId, userAnswer } });
  res.json(record);
});

export default router;
