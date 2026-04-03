import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

/**
 * Результат обработки шаблона
 */
export interface ProcessResult {
  buffer: Buffer;
  replacedKeys: string[];
}

/**
 * Преобразует входные данные из формата { "${key}": "value" } в { "key": "value" }
 * для передачи в Docxtemplater.
 *
 * @param rawData - Объект с ключами вида "${key_name}"
 * @returns Объект с очищенными ключами вида "key_name"
 */
export function parseDataKeys(rawData: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(rawData)) {
    // Убираем обёртку ${ ... }
    const cleanKey = key.replace(/^\$\{/, '').replace(/}$/, '').trim();

    if (!cleanKey) {
      console.warn(`⚠️  Пропуск невалидного ключа: "${key}"`);
      continue;
    }

    result[cleanKey] = value;
  }

  return result;
}

/**
 * Обрабатывает .docx-шаблон, заменяя все вхождения ${key} на соответствующие значения.
 * Использует Docxtemplater с разделителями ${ и }, что позволяет корректно
 * обрабатывать плейсхолдеры даже если они разбиты на несколько XML-ранов.
 *
 * @param templateBuffer - Бинарное содержимое .docx-файла
 * @param data - Пары ключ-значение (ключи БЕЗ обёртки ${})
 * @returns Объект с готовым буфером и списком заменённых ключей
 * @throws Error при ошибках парсинга шаблона
 */
export function processDocument(
  templateBuffer: Buffer,
  data: Record<string, string>,
): ProcessResult {
  const zip = new PizZip(templateBuffer.toString('binary'));

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: {
      start: '${',
      end: '}',
    },
  });

  doc.render(data);

  const buffer = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  }) as Buffer;

  return {
    buffer,
    replacedKeys: Object.keys(data),
  };
}


