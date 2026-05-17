# KanjiLookup

Веб-приложение для поиска и разбора кандзи: рукописный ввод на холсте, поиск по радикалам, числу черт и уровню, карточки иероглифов, импорт/экспорт JSON и статистика по текущей выборке.

## Установка и запуск

### Требования

- Docker
- Docker Compose
- Python 3.11+ для пересборки seed из `data/`

### Первый запуск

```bash
docker compose build --no-cache
docker compose up
```

Клиент будет доступен по адресу:

```text
http://127.0.0.1:8080
```

Для быстрого запуска можно использовать скрипт:

```bash
chmod +x start-example.sh
./start-example.sh
```

Если Docker Hub отвечает ошибками вида `TLS handshake timeout`, сначала проверьте сеть и повторите сборку. Для нестабильного подключения есть скрипты, которые заранее подтягивают базовые образы с повторами:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-build.ps1 -NoCache
```

```bash
chmod +x scripts/docker-build.sh
./scripts/docker-build.sh --no-cache
```

### Остановка

```bash
docker compose down
```

Чтобы удалить сохранённые данные MongoDB:

```bash
docker compose down -v
```

## Состав Docker-конфигурации

- `db` — MongoDB `mongo:7.0.16`, данные лежат в named volumes `mongo_data` и `mongo_config`; порт БД наружу не публикуется.
- `backend` — FastAPI API `kandz-backend-fastapi:v1.0`; ждёт готовности MongoDB, создаёт индексы и заполняет пустую базу начальными данными.
- `frontend` — React/Vite клиент `kandz-frontend-nginx-react:v1.0`, собранный в статические файлы и раздаваемый через nginx; `/api/*` проксируется в backend.

Во всех контейнерах настроены healthcheck. Внешний порт опубликован только у клиента: `127.0.0.1:8080:80`.

## Данные и база

При первом старте backend загружает данные из `frontend/public/kanji-db.json`, если коллекция `kanji` пустая. Seed собирается из файлов в `data/` и содержит:

- `kanji` — 10 383 документа из KANJIDIC2;
- `radicals` — 253 радикала из RADKFILE;
- `users` — администратора для операций импорта.

Пересобрать seed можно командой:

```powershell
py .\scripts\build_seed.py
```

Импортировать этот же JSON в локальную MongoDB можно так:

```powershell
py .\scripts\import.py --rebuild
```

MongoDB выполняет основные операции выборки:

- поиск по подстроке через `$regex` и `$options: i`;
- фильтрацию радикалов через `$all`;
- пагинацию через `$sort`, `$skip`, `$limit`;
- статистику через `$match` и `$group`;
- ранжирование кандидатов рукописного ввода через aggregation pipeline.

## Архитектура backend

Backend разделён на несколько слоёв:

- `app/core` — настройки приложения и переменные окружения;
- `app/data` — подключение к MongoDB, индексы, seed, репозитории и aggregation pipeline;
- `app/service` — бизнес-логика, валидация, импорт/экспорт и авторизация импорта;
- `app/web` — HTTP-роутеры FastAPI.

## Отладочный пользователь

Доступ нужен для массового импорта JSON. Авторизация проверяется backend-ом, после входа клиент получает короткоживущий bearer-токен и отправляет его вместе с файлом импорта.

```text
login: admin
password: admin123
```

Импорт заменяет содержимое коллекций `kanji`, `radicals` и `users`. Экспорт выгружает полный снимок данных приложения в JSON.

## Локальная разработка

Фронтенд:

```bash
cd frontend
npm install
npm run dev
```

Vite проксирует `/api` на `http://127.0.0.1:8000`.

Бэкенд:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Для локального backend нужна доступная MongoDB. Переменные можно взять из `.env.example`.

## Проверка

```bash
cd frontend
npm run lint
npm run build
```

```bash
docker compose config
docker compose build --no-cache
docker compose up
```
