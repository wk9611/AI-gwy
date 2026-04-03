import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 组卷：按比例从各题型抽题
router.post('/generate', async (req, res) => {
  const { totalCount = 120 } = req.body;

  // 行测各题型出题比例
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

  res.json({
    totalCount: questions.length,
    duration: 120 * 60, // 120分钟，单位秒
    questions,
  });
});

// 交卷
router.post('/submit', async (req, res) => {
  const { answers, duration } = req.body;
  // answers: [{ questionId, userAnswer }]

  let correctCount = 0;
  const detailedAnswers = [];

  for (const { questionId, userAnswer } of answers) {
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    const isCorrect = question && question.answer === userAnswer;
    if (isCorrect) correctCount++;

    detailedAnswers.push({ questionId, userAnswer, correctAnswer: question?.answer, isCorrect });

    // 答错的题自动加入错题本
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
    data: {
      score,
      totalCount: answers.length,
      correctCount,
      duration: duration || 0,
      answers: JSON.stringify(detailedAnswers),
    },
  });

  res.json({
    ...record,
    answers: detailedAnswers,
  });
});

// 考试记录列表
router.get('/records', async (req, res) => {
  const records = await prisma.examRecord.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(records);
});

// 考试记录详情
router.get('/records/:id', async (req, res) => {
  const record = await prisma.examRecord.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!record) return res.status(404).json({ error: '记录不存在' });
  res.json({ ...record, answers: JSON.parse(record.answers) });
});

export default router;
