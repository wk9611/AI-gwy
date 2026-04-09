import XLSX from 'xlsx';
import prisma from '../db.js';

const VALID_CATEGORIES = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];

export async function importFromFile(filePath, originalName) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rows.length < 2) {
    throw new Error('文件中没有数据行');
  }

  // 跳过表头
  const dataRows = rows.slice(1).filter((row) => row.length >= 10);

  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const [category, year, source, content, optA, optB, optC, optD, answer, explanation, knowledgePoint, difficulty] = row;

    // 校验必填字段
    if (!category || !content || !optA || !optB || !optC || !optD || !answer || !explanation) {
      errors.push(`第${i + 2}行: 必填字段缺失`);
      skipped++;
      continue;
    }

    if (!VALID_CATEGORIES.includes(category)) {
      errors.push(`第${i + 2}行: 无效的题型分类 "${category}"`);
      skipped++;
      continue;
    }

    if (!['A', 'B', 'C', 'D'].includes(String(answer).toUpperCase())) {
      errors.push(`第${i + 2}行: 答案必须为 A/B/C/D`);
      skipped++;
      continue;
    }

    await prisma.question.create({
      data: {
        category: String(category),
        year: year ? parseInt(year) : null,
        source: source ? String(source) : null,
        content: String(content),
        optionA: String(optA),
        optionB: String(optB),
        optionC: String(optC),
        optionD: String(optD),
        answer: String(answer).toUpperCase(),
        explanation: String(explanation),
        knowledgePoint: knowledgePoint ? String(knowledgePoint) : null,
        difficulty: difficulty ? parseInt(difficulty) : 3,
      },
    });
    imported++;
  }

  return { imported, skipped, total: dataRows.length, errors };
}
