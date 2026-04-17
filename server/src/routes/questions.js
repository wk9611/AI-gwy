import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// 获取所有分类及题目数量统计
router.get('/categories', async (req, res) => {
  const categories = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
  const stats = await Promise.all(
    categories.map(async (cat) => {
      const count = await prisma.question.count({ where: { category: cat } });
      return { category: cat, count };
    })
  );
  res.json(stats);
});

// 查询题目列表（支持分页、分类筛选、搜索）
router.get('/', async (req, res) => {
  const { category, page = 1, pageSize = 20, search, year, difficulty } = req.query;
  const where = {};
  if (category) where.category = category;
  if (year) where.year = parseInt(year);
  if (difficulty) where.difficulty = parseInt(difficulty);
  if (search) where.content = { contains: search };

  const [total, questions] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize),
      orderBy: { id: 'desc' },
    }),
  ]);

  res.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), data: questions });
});

// 随机获取题目（用于练习和考试）
router.get('/random', async (req, res) => {
  const { category, count = 10 } = req.query;
  const where = {};
  if (category) where.category = category;

  const total = await prisma.question.count({ where });
  const take = Math.min(parseInt(count), total);

  if (take === 0) return res.json([]);

  // SQLite 随机查询
  const questions = await prisma.$queryRawUnsafe(
    `SELECT * FROM Question ${category ? `WHERE category = '${category}'` : ''} ORDER BY RANDOM() LIMIT ${take}`
  );
  res.json(questions);
});

// 获取单个题目
router.get('/:id', async (req, res) => {
  const question = await prisma.question.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!question) return res.status(404).json({ error: '题目不存在' });
  res.json(question);
});

// 创建题目
router.post('/', async (req, res) => {
  const data = { ...req.body };
  if (!data.source) data.source = '手动添加';
  const question = await prisma.question.create({ data });
  res.status(201).json(question);
});

// 更新题目
router.put('/:id', async (req, res) => {
  const question = await prisma.question.update({
    where: { id: parseInt(req.params.id) },
    data: req.body,
  });
  res.json(question);
});

// 删除题目
router.delete('/:id', async (req, res) => {
  await prisma.question.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true });
});

// 批量删除
router.post('/batch-delete', async (req, res) => {
  const { ids } = req.body;
  await prisma.question.deleteMany({ where: { id: { in: ids } } });
  res.json({ success: true, deleted: ids.length });
});

export default router;
