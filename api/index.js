import express from 'express';
import cors from 'cors';
import questionsRouter from '../server/src/routes/questions.js';
import examsRouter from '../server/src/routes/exams.js';
import wrongBookRouter from '../server/src/routes/wrong-book.js';
import importRouter from '../server/src/routes/import.js';
import crawlRouter from '../server/src/routes/crawl.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/questions', questionsRouter);
app.use('/api/exams', examsRouter);
app.use('/api/wrong-book', wrongBookRouter);
app.use('/api/import', importRouter);
app.use('/api/crawl', crawlRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

export default app;
