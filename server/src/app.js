import express from 'express';
import cors from 'cors';
import questionsRouter from './routes/questions.js';
import examsRouter from './routes/exams.js';
import wrongBookRouter from './routes/wrong-book.js';
import importRouter from './routes/import.js';
import crawlRouter from './routes/crawl.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

app.use('/api/questions', questionsRouter);
app.use('/api/exams', examsRouter);
app.use('/api/wrong-book', wrongBookRouter);
app.use('/api/import', importRouter);
app.use('/api/crawl', crawlRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
