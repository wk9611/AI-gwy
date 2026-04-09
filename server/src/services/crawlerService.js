import axios from 'axios';
import * as cheerio from 'cheerio';
import prisma from '../db.js';

/**
 * 通用爬虫：从目标页面提取题目数据
 * 支持常见的题目页面结构，会尝试多种选择器匹配
 */
export async function crawlQuestions(url, category) {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(html);
  const questions = [];

  // 尝试多种常见的题目结构选择器
  const selectors = [
    '.question-item',
    '.test-item',
    '.exam-question',
    '.ti-item',
    '.question',
    '.item',
  ];

  let questionElements = $([]);
  for (const sel of selectors) {
    const found = $(sel);
    if (found.length > 0) {
      questionElements = found;
      break;
    }
  }

  // 如果没有匹配到结构化选择器，尝试按文本模式解析
  if (questionElements.length === 0) {
    return parseFromText($, category);
  }

  questionElements.each((_, el) => {
    const $el = $(el);
    const content = extractText($el, ['.question-content', '.title', '.stem', 'h3', 'p:first']);
    const options = extractOptions($el, $);
    const answer = extractText($el, ['.answer', '.correct-answer', '.da']);
    const explanation = extractText($el, ['.explanation', '.analysis', '.jx', '.parse']);

    if (content && options.length === 4) {
      questions.push({
        category,
        content: cleanText(content),
        optionA: cleanText(options[0]),
        optionB: cleanText(options[1]),
        optionC: cleanText(options[2]),
        optionD: cleanText(options[3]),
        answer: extractAnswerLetter(answer),
        explanation: cleanText(explanation) || '暂无解析',
        knowledgePoint: null,
        difficulty: 3,
      });
    }
  });

  // 批量入库
  let imported = 0;
  for (const q of questions) {
    if (q.answer) {
      await prisma.question.create({ data: q });
      imported++;
    }
  }

  return { found: questions.length, imported, url };
}

function parseFromText($, category) {
  // 备用：尝试从页面纯文本中用正则提取题目
  const text = $('body').text();
  const pattern = /(\d+)[.、．]\s*([\s\S]*?)(?=A[.、．])(A[.、．]\s*[\s\S]*?)(?=B[.、．])(B[.、．]\s*[\s\S]*?)(?=C[.、．])(C[.、．]\s*[\s\S]*?)(?=D[.、．])(D[.、．]\s*[\s\S]*?)(?=(?:\d+[.、．])|【|答案|$)/g;

  const questions = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    questions.push({
      category,
      content: cleanText(match[2]),
      optionA: cleanText(match[3].replace(/^A[.、．]\s*/, '')),
      optionB: cleanText(match[4].replace(/^B[.、．]\s*/, '')),
      optionC: cleanText(match[5].replace(/^C[.、．]\s*/, '')),
      optionD: cleanText(match[6].replace(/^D[.、．]\s*/, '')),
      answer: 'A',
      explanation: '暂无解析（爬取数据需人工校验）',
      knowledgePoint: null,
      difficulty: 3,
    });
  }

  return { found: questions.length, imported: 0, needReview: true, questions };
}

function extractText($el, selectors) {
  for (const sel of selectors) {
    const text = $el.find(sel).first().text().trim();
    if (text) return text;
  }
  return '';
}

function extractOptions($el, $) {
  const optionSelectors = ['.option', '.choice', 'li', '.opt'];
  for (const sel of optionSelectors) {
    const opts = $el.find(sel);
    if (opts.length >= 4) {
      return opts.slice(0, 4).map((_, o) => $(o).text().trim()).get();
    }
  }
  return [];
}

function extractAnswerLetter(text) {
  const match = text.match(/[ABCD]/);
  return match ? match[0] : null;
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}
