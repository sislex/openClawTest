import { parseDataKeys, processDocument } from '../docMaker';

// ── Мок модулей ──────────────────────────────────────────────────────────────
// Должны быть объявлены ДО импорта, jest.mock поднимается автоматически

jest.mock('pizzip', () => {
  return jest.fn().mockImplementation(() => ({ mockedZip: true }));
});

jest.mock('docxtemplater', () => {
  return jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    getZip: jest.fn().mockReturnValue({
      generate: jest.fn().mockReturnValue(Buffer.from('mocked-docx-output')),
    }),
  }));
});

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

// ─────────────────────────────────────────────────────────────────────────────
// parseDataKeys
// ─────────────────────────────────────────────────────────────────────────────
describe('parseDataKeys', () => {
  it('должен убирать обёртку ${ } из ключей', () => {
    const raw = {
      '${client_name}': 'Иванов ИИ',
      '${client_company}': 'ООО Компания',
    };
    expect(parseDataKeys(raw)).toEqual({
      client_name: 'Иванов ИИ',
      client_company: 'ООО Компания',
    });
  });

  it('должен оставлять ключи без обёртки как есть', () => {
    const raw = { plain_key: 'value', another: '123' };
    expect(parseDataKeys(raw)).toEqual({ plain_key: 'value', another: '123' });
  });

  it('должен обрабатывать смешанные ключи — часть с обёрткой, часть без', () => {
    const raw = {
      '${wrapped}': 'A',
      bare: 'B',
    };
    expect(parseDataKeys(raw)).toEqual({ wrapped: 'A', bare: 'B' });
  });

  it('должен обрезать пробелы внутри ключа', () => {
    const raw = { '${ spaced_key }': 'trimmed' };
    expect(parseDataKeys(raw)).toEqual({ spaced_key: 'trimmed' });
  });

  it('должен пропускать ключи, которые становятся пустыми после очистки', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = {
      '${  }': 'should_be_skipped',
      '${valid}': 'kept',
    };
    const result = parseDataKeys(raw);
    expect(result).toEqual({ valid: 'kept' });
    expect(result).not.toHaveProperty('');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('${  }'));
    consoleSpy.mockRestore();
  });

  it('должен возвращать пустой объект при пустом входе', () => {
    expect(parseDataKeys({})).toEqual({});
  });

  it('должен сохранять значение пустой строки', () => {
    const raw = { '${empty_field}': '' };
    expect(parseDataKeys(raw)).toEqual({ empty_field: '' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// processDocument
// ─────────────────────────────────────────────────────────────────────────────
describe('processDocument', () => {
  const MockPizZip = PizZip as jest.MockedClass<typeof PizZip>;
  const MockDocxtemplater = Docxtemplater as jest.MockedClass<typeof Docxtemplater>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Восстанавливаем стандартный мок после каждого теста
    MockDocxtemplater.mockImplementation(
      () =>
        ({
          render: jest.fn(),
          getZip: jest.fn().mockReturnValue({
            generate: jest.fn().mockReturnValue(Buffer.from('mocked-docx-output')),
          }),
        }) as unknown as Docxtemplater,
    );
  });

  it('должен возвращать Buffer с результирующим документом', () => {
    const templateBuffer = Buffer.from('fake-template-content');
    const data = { client_name: 'Иванов ИИ', amount: '100 000' };

    const { buffer, replacedKeys } = processDocument(templateBuffer, data);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.toString()).toBe('mocked-docx-output');
    expect(replacedKeys).toEqual(['client_name', 'amount']);
  });

  it('должен передавать шаблон в PizZip как binary-строку', () => {
    const templateBuffer = Buffer.from('template-bytes');
    processDocument(templateBuffer, {});

    expect(MockPizZip).toHaveBeenCalledWith(templateBuffer.toString('binary'));
  });

  it('должен инициализировать Docxtemplater с разделителями ${ и }', () => {
    processDocument(Buffer.from('tpl'), { key: 'val' });

    expect(MockDocxtemplater).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        delimiters: { start: '${', end: '}' },
        paragraphLoop: true,
        linebreaks: true,
      }),
    );
  });

  it('должен вызывать render() с переданными данными', () => {
    const data = { name: 'Петров', inn: '123456789' };
    processDocument(Buffer.from('tpl'), data);

    // mock.results[0].value — это объект, возвращённый конструктором (не this-контекст)
    const instance = MockDocxtemplater.mock.results[0].value as {
      render: jest.Mock;
    };
    expect(instance.render).toHaveBeenCalledWith(data);
  });

  it('должен вызывать generate() с DEFLATE-сжатием', () => {
    processDocument(Buffer.from('tpl'), {});

    const instance = MockDocxtemplater.mock.results[0].value as {
      getZip: jest.Mock;
    };
    // getZip().generate уже была вызвана внутри processDocument
    const generateMock: jest.Mock = instance.getZip.mock.results[0].value.generate;
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'nodebuffer', compression: 'DEFLATE' }),
    );
  });

  it('должен пробрасывать ошибки из Docxtemplater', () => {
    MockDocxtemplater.mockImplementationOnce(
      () =>
        ({
          render: jest.fn(() => {
            throw Object.assign(new Error('Template parse error'), {
              properties: { errors: [{ message: 'Unknown tag: ${bad_tag}' }] },
            });
          }),
          getZip: jest.fn(),
        }) as unknown as Docxtemplater,
    );

    expect(() => processDocument(Buffer.from('tpl'), { bad_tag: 'x' })).toThrow(
      'Template parse error',
    );
  });

  it('должен корректно работать с пустым объектом данных', () => {
    const { buffer, replacedKeys } = processDocument(Buffer.from('tpl'), {});
    expect(buffer).toBeInstanceOf(Buffer);
    expect(replacedKeys).toHaveLength(0);
  });

  it('должен передавать экземпляр PizZip в конструктор Docxtemplater', () => {
    const zipInstance = { mockedZip: true };
    MockPizZip.mockImplementationOnce(() => zipInstance as unknown as PizZip);

    processDocument(Buffer.from('tpl'), {});

    expect(MockDocxtemplater).toHaveBeenCalledWith(zipInstance, expect.anything());
  });
});


