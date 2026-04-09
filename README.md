# OpenClaw

Контейнеризированная среда для запуска [openclaw](https://openclaw.ai) с поддержкой Telegram-бота, AI-моделей и CLI-сервисов.

---

## Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone <repo-url>
cd openClaw
```

### 2. Настроить переменные окружения

Скопируйте шаблон и заполните своими токенами:

```bash
cp .env.example .env
```

Откройте `.env` и заполните значения:

```dotenv
# Модель по умолчанию для openclaw
OPENCLAW_MODEL=anthropic/claude-sonnet-4-6

# Telegram Bot Token — получить у @BotFather в Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Anthropic / Claude API Key — https://console.anthropic.com
CLAUDE_API_KEY=sk-ant-...
ANTHROPIC_API_KEY=sk-ant-...

# Google / Gemini API Key — https://aistudio.google.com/app/apikey
GEMINI_SEARCH_API_KEY=AIza...
GOOGLE_API_KEY=AIza...

# OpenAI API Key — https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-...
```

> ⚠️ **Никогда не коммитьте `.env` в git** — он добавлен в `.gitignore`.  
> Для команды используйте `.env.example` (без реальных значений).

### 3. Запустить контейнер

```bash
docker compose up -d
```

### 4. Проверить статус

```bash
docker exec -it openclaw-node openclaw status
```

---

## Переменные окружения

| Переменная             | Описание                                      | Где получить                                  |
|------------------------|-----------------------------------------------|-----------------------------------------------|
| `OPENCLAW_MODEL`       | Модель AI по умолчанию                        | `anthropic/claude-sonnet-4-6`, `openai/gpt-5.4` |
| `TELEGRAM_BOT_TOKEN`   | Токен Telegram-бота                           | [@BotFather](https://t.me/BotFather)          |
| `ANTHROPIC_API_KEY`    | API ключ Anthropic (Claude)                   | https://console.anthropic.com                 |
| `CLAUDE_API_KEY`       | Дублирует `ANTHROPIC_API_KEY`                 | https://console.anthropic.com                 |
| `GOOGLE_API_KEY`       | Google / Gemini API ключ                      | https://aistudio.google.com/app/apikey        |
| `GEMINI_SEARCH_API_KEY`| Дублирует `GOOGLE_API_KEY`                    | https://aistudio.google.com/app/apikey        |
| `OPENAI_API_KEY`       | OpenAI API ключ                               | https://platform.openai.com/api-keys          |

---

## Конфигурация

| Параметр           | Значение         |
|--------------------|------------------|
| Имя контейнера     | `openclaw-node`  |
| HTTP порт          | `3000`           |
| Desktop (noVNC)    | `3080`           |
| Gateway WebSocket  | `18789`          |

---

## Автоконфигурация

При первом запуске (или после удаления `openclaw-config/`) скрипт `openclaw-service/run` автоматически:

1. Создаёт `/config/.openclaw/openclaw.json` с начальными настройками
2. Устанавливает `gateway.mode=local` (запуск без systemd)
3. Открывает Telegram для всех пользователей (`dmPolicy=open`, `allowFrom=["*"]`)
4. Gateway автоматически генерирует auth-token

Ручная настройка не требуется — достаточно заполнить `.env` и запустить контейнер.

### Чистая переустановка

```bash
docker compose down
rm -rf openclaw-config
docker compose up -d --build
```

При следующем старте все настройки создадутся заново автоматически.

---

## Структура проекта

```
openClaw/
├── docker-compose.yml          — конфигурация Docker
├── Dockerfile                  — образ контейнера
├── .env                        — секреты (не в git!)
├── .env.example                — шаблон переменных окружения
├── openclaw/                   — монтируется как /app
├── openclaw-config/            — конфиг openclaw (не в git)
├── openclaw-files/             — рабочие файлы бота (не в git)
├── openclaw-service/
│   └── run                     — скрипт автозапуска gateway
└── services/
    └── docMaker/               — CLI-сервис генерации .docx
```

---

## Сервисы

### docMaker

CLI-сервис для автоматического заполнения `.docx`-шаблонов данными из JSON.

```bash
# Внутри контейнера
cd /services/docMaker && npm run docMaker -- \
  --template ./templates/Template1.docx \
  --data ./data.json \
  --out /openclaw-files/result.docx
```

Подробнее: [services/docMaker/README.md](services/docMaker/README.md)

---

## Полезные команды

```bash
# Запустить контейнер
docker compose up -d

# Остановить
docker compose down

# Зайти в bash контейнера
docker exec -it openclaw-node bash

# Статус openclaw
docker exec -it openclaw-node openclaw status

# Логи
docker compose logs -f

# Пересобрать образ
docker compose up -d --build
```


