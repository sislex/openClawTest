# Инструкция: сервис docMaker для openclaw

## Что умеет сервис

docMaker генерирует готовые `.docx`-документы из шаблона.  
Вы передаёте шаблон договора/акта/письма с плейсхолдерами вида `${поле}` и JSON с данными — сервис возвращает заполненный документ.

**Примеры использования:**
- Автоматическое заполнение договоров с данными клиента
- Генерация актов, счётов, коммерческих предложений
- Массовое создание документов по списку контрагентов

---

## Как подготовить шаблон

Откройте любой `.docx`-файл и расставьте плейсхолдеры прямо в тексте:

```
Договор № ${contract_number} от ${contract_date}

Исполнитель: ООО «Ваша компания»
Заказчик: ${client_name}, ИНН ${client_inn}
Юридический адрес: ${client_address}

Стоимость работ составляет ${amount} (${amount_words}).

Подпись: _________________ ${manager_name}
```

> **Важно:** плейсхолдер должен быть написан целиком в одном стиле шрифта.  
> Если Word разбивает `${client_name}` на несколько частей при вводе — напишите его в Блокноте и вставьте через «Вставить без форматирования».

Сохраните шаблон в `/services/docMaker/templates/` на сервере.

---

## Формат данных

JSON-объект, где каждый ключ — это плейсхолдер из шаблона:

```json
{
  "${client_name}":    "Иванов Иван Иванович",
  "${client_company}": "ООО Супер компания",
  "${client_inn}":     "7701234567",
  "${client_address}": "г. Москва, ул. Ленина, д. 1",
  "${contract_number}":"№ 42/2026",
  "${contract_date}":  "03 апреля 2026 г.",
  "${amount}":         "150 000",
  "${amount_words}":   "Сто пятьдесят тысяч рублей 00 копеек",
  "${manager_name}":   "Сидоров С.С."
}
```

- Ключей может быть любое количество
- Если ключ есть в JSON, но отсутствует в шаблоне — он просто игнорируется
- Если плейсхолдер есть в шаблоне, но нет в JSON — он останется как есть

---

## Как вызвать из openclaw-скрипта

### Базовый пример

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

// 1. Собираем данные (например, собранные со страницы)
const data = {
  "${client_name}":    "Иванов Иван Иванович",
  "${client_company}": "ООО Супер компания",
  "${contract_date}":  "03 апреля 2026 г.",
  "${amount}":         "150 000",
};

// 2. Сохраняем во временный файл
const tmpData = '/tmp/doc_data.json';
fs.writeFileSync(tmpData, JSON.stringify(data, null, 2), 'utf-8');

// 3. Запускаем docMaker (шаблон и путь вывода — по умолчанию)
execSync(
  `npm run docMaker --prefix /services/docMaker -- --data ${tmpData}`,
  { stdio: 'inherit' }
);

// 4. Готовый файл лежит здесь:
// /services/docMaker/output/result.docx
```

### С явными путями

```javascript
execSync(
  'npm run docMaker --prefix /services/docMaker -- ' +
  '--template ./templates/Template1.docx ' +
  `--data ${tmpData} ` +
  '--out ./output/result.docx',
  { stdio: 'inherit' }
);
```

### Сохранить в openclaw-files (доступно с хоста)

```javascript
execSync(
  'npm run docMaker --prefix /services/docMaker -- ' +
  `--data ${tmpData} ` +
  '--out /openclaw-files/result.docx',
  { stdio: 'inherit' }
);
// Файл будет доступен на хосте: ./openclaw-files/result.docx
```

### Получить ошибку если что-то пошло не так

```javascript
try {
  execSync(
    `npm run docMaker --prefix /services/docMaker -- --data ${tmpData}`,
    { stdio: 'pipe' } // перехватываем вывод
  );
} catch (e) {
  console.error('docMaker завершился с ошибкой:', e.stderr?.toString());
}
```

---

## Параметры командной строки

| Параметр      | Обязательный | По умолчанию                    | Описание                       |
|---------------|:------------:|---------------------------------|--------------------------------|
| `--data`      | ✅           | —                               | Путь к JSON-файлу с данными    |
| `--template`  | —            | `./templates/Template1.docx`    | Путь к `.docx`-шаблону         |
| `--out`       | —            | `./output/result.docx`          | Путь для сохранения результата |

> Все пути разрешаются относительно `/services/docMaker/`

---

## Типичные сценарии

### Сценарий 1: Заполнить договор данными клиента со страницы

```javascript
// openclaw собрал данные с CRM-страницы
const clientName    = await page.$eval('#client-name', el => el.textContent.trim());
const clientCompany = await page.$eval('#company',     el => el.textContent.trim());
const contractDate  = new Date().toLocaleDateString('ru-RU', {
  day: 'numeric', month: 'long', year: 'numeric'
});

const data = {
  "${client_name}":    clientName,
  "${client_company}": clientCompany,
  "${contract_date}":  contractDate,
};

const tmpData = '/tmp/contract_data.json';
fs.writeFileSync(tmpData, JSON.stringify(data, null, 2));

execSync(
  `npm run docMaker --prefix /services/docMaker -- --data ${tmpData}`,
  { stdio: 'inherit' }
);
```

### Сценарий 2: Массовая генерация по списку

```javascript
const clients = [
  { "${client_name}": "Иванов И.И.", "${amount}": "50 000" },
  { "${client_name}": "Петров П.П.", "${amount}": "75 000" },
  { "${client_name}": "Сидоров С.С.", "${amount}": "120 000" },
];

for (const [i, clientData] of clients.entries()) {
  const tmpData = `/tmp/client_${i}.json`;
  fs.writeFileSync(tmpData, JSON.stringify(clientData, null, 2));

  execSync(
    'npm run docMaker --prefix /services/docMaker -- ' +
    `--data ${tmpData} ` +
    `--out /openclaw-files/contracts/contract_${i + 1}.docx`,
    { stdio: 'inherit' }
  );
}
// Файлы: ./openclaw-files/contracts/contract_1.docx, contract_2.docx ...
```

---

## Где лежат файлы

| Назначение        | Путь в контейнере                       | Путь на хосте                    |
|-------------------|-----------------------------------------|----------------------------------|
| Шаблоны           | `/services/docMaker/templates/`         | `./services/docMaker/templates/` |
| Результаты        | `/services/docMaker/output/`            | недоступно (не примонтировано)   |
| Результаты (хост) | `/openclaw-files/`                      | `./openclaw-files/`              |

> Чтобы файл был доступен на хосте — указывайте `--out /openclaw-files/имя_файла.docx`

