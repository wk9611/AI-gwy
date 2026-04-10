import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import questionsRouter from './routes/questions.js';
import examsRouter from './routes/exams.js';
import wrongBookRouter from './routes/wrong-book.js';
import importRouter from './routes/import.js';
import crawlRouter from './routes/crawl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// API 路由
app.use('/api/questions', questionsRouter);
app.use('/api/exams', examsRouter);
app.use('/api/wrong-book', wrongBookRouter);
app.use('/api/import', importRouter);
app.use('/api/crawl', crawlRouter);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 生产环境：托管前端静态文件
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
