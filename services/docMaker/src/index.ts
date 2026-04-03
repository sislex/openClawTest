import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import { parseDataKeys, processDocument } from './docMaker';

program
  .name('docMaker')
  .description('Заполняет .docx-шаблон данными из JSON-файла, заменяя ключи вида ${key}')
  .option('--template <path>', 'Путь к .docx шаблону', './templates/Template1.docx')
  .requiredOption('--data <path>', 'Путь к JSON-файлу с данными')
  .option('--out <path>', 'Путь для сохранения результирующего .docx', './output/result.docx')
  .parse(process.argv);

const opts = program.opts<{ template: string; data: string; out: string }>();

const templatePath = path.resolve(process.cwd(), opts.template);
const dataPath = path.resolve(process.cwd(), opts.data);
const outPath = path.resolve(process.cwd(), opts.out);

// ── Валидация входных файлов ─────────────────────────────────────────────────

if (!fs.existsSync(templatePath)) {
  console.error(`❌ Шаблон не найден: ${templatePath}`);
  process.exit(1);
}

if (!fs.existsSync(dataPath)) {
  console.error(`❌ Файл данных не найден: ${dataPath}`);
  process.exit(1);
}

// ── Загрузка данных ──────────────────────────────────────────────────────────

let rawData: Record<string, string>;

try {
  const content = fs.readFileSync(dataPath, 'utf-8');
  rawData = JSON.parse(content);
} catch (e) {
  console.error(`❌ Ошибка парсинга JSON: ${(e as Error).message}`);
  process.exit(1);
}

const data = parseDataKeys(rawData);
console.log(`📋 Загружено замен: ${Object.keys(data).length}`);

// ── Обработка шаблона ────────────────────────────────────────────────────────

try {
  const templateBuffer = fs.readFileSync(templatePath);
  const { buffer, replacedKeys } = processDocument(templateBuffer, data);

  // Создаём выходную директорию если не существует
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outPath, buffer);

  console.log(`✅ Документ сгенерирован: ${outPath}`);
  console.log(`   Заменены поля: ${replacedKeys.map((k) => `\${${k}}`).join(', ')}`);
} catch (error: unknown) {
  // Docxtemplater оборачивает ошибки в properties.errors
  const e = error as { properties?: { errors?: Array<{ message: string }> } } & Error;

  if (e.properties?.errors?.length) {
    console.error('❌ Ошибки в шаблоне:');
    for (const err of e.properties.errors) {
      console.error(`   • ${err.message}`);
    }
  } else {
    console.error(`❌ Ошибка: ${e.message}`);
  }

  process.exit(1);
}


