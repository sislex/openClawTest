# docMaker

CLI-сервис для автоматического заполнения `.docx`-шаблонов данными из JSON.  
Запускается напрямую из консоли или через `openclaw`.

---

## Структура

```
services/docMaker/
├── src/
│   ├── index.ts              — CLI точка входа
│   ├── docMaker.ts           — Основная логика (parseDataKeys, processDocument)
│   └── __tests__/
│       └── docMaker.test.ts  — Unit-тесты
├── templates/
│   └── Template1.docx        — Пример шаблона
├── output/                   — Результирующие файлы (создаётся автоматически)
├── data.example.json         — Пример файла данных
├── package.json
└── tsconfig.json
```

---

## Формат шаблона

В `.docx`-шаблоне используйте плейсхолдеры вида `${key_name}`:

```
Договор № ${contract_number} от ${contract_date}

Клиент: ${client_name}
Компания: ${client_company}
ИНН: ${client_inn}
Сумма: ${amount} руб.
```

---

## Формат входного JSON

```json
{
  "${client_name}": "Иванов Иван Иванович",
  "${client_company}": "ООО Супер компания",
  "${contract_date}": "03 апреля 2026 г.",
  "${amount}": "150 000"
}
```

Количество ключей произвольное. Ключи не обязательно должны быть все использованы в шаблоне.

---

## Запуск

### Локально (разработка)

```bash
cd services/docMaker
npm install
npm run docMaker -- --template ./templates/Template1.docx --data ./data.example.json --out ./output/result.docx
```

### В Docker-контейнере

```bash
npm run docMaker --prefix /services/docMaker -- \
  --template ./templates/Template1.docx \
  --data ./data.json \
  --out ./output/result.docx
```

или через `cd`:

```bash
cd /services/docMaker && npm run docMaker -- \
  --template ./templates/Template1.docx \
  --data ./data.json \
  --out ./output/result.docx
```

---

## Запуск из openclaw

В скрипте автоматизации openclaw используйте shell-команду:

```javascript
// Пример вызова из openclaw-скрипта
const { execSync } = require('child_process');

const data = {
  "${client_name}": "Иванов ИИ",
  "${contract_date}": "03.04.2026",
};

// Сохраняем данные во временный файл
const fs = require('fs');
fs.writeFileSync('/tmp/doc_data.json', JSON.stringify(data, null, 2));

// Вызываем docMaker
execSync(
  'npm run docMaker --prefix /services/docMaker -- ' +
  '--template ./templates/Template1.docx ' +
  '--data /tmp/doc_data.json ' +
  '--out /openclaw-files/result.docx',
  { stdio: 'inherit' }
);
```

Результирующий файл будет доступен по пути `/openclaw-files/result.docx`  
(примонтирован через volume `./openclaw-files:/openclaw-files`).

---

## Параметры CLI

| Параметр      | Обязательный | Описание                         |
|---------------|:------------:|----------------------------------|
| `--template`  | ✅           | Путь к `.docx`-шаблону           |
| `--data`      | ✅           | Путь к JSON-файлу с данными      |
| `--out`       | ✅           | Путь для сохранения результата   |

Все пути разрешаются относительно текущей рабочей директории (`cwd`).

---

## Тесты

```bash
cd services/docMaker
npm install
npm test                  # запуск тестов
npm run test:coverage     # с отчётом о покрытии
npm run test:watch        # режим наблюдения
```

---

## Сборка (production)

```bash
npm run build       # компиляция TypeScript → dist/
npm start -- --template ./templates/Template1.docx --data ./data.json --out ./output/result.docx
```

