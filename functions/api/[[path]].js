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

// AI 智能导入（仅支持文本直接发送给AI）
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
