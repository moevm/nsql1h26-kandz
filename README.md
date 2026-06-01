# KanjiLookup

Веб-приложение для поиска и разбора кандзи: рукописный ввод на холсте, поиск по радикалам, числу черт и уровню, карточки иероглифов, импорт/экспорт JSON и статистика по текущей выборке.

## Предварительная проверка заданий

<a href="./../../../actions/workflows/1_helloworld.yml">![1. Согласована и сформулирована тема курсовой](./../../actions/workflows/1_helloworld.yml/badge.svg)</a>

<a href="./../../../actions/workflows/2_usecase.yml">![2. Usecase](./../../actions/workflows/2_usecase.yml/badge.svg)</a>

<a href="./../../../actions/workflows/3_data_model.yml">![3. Модель данных](./../../actions/workflows/3_data_model.yml/badge.svg)</a>

<a href="./../../../actions/workflows/4_prototype_store_and_view.yml">![4. Прототип хранение и представление](./../../actions/workflows/4_prototype_store_and_view.yml/badge.svg)</a>

<a href="./../../../actions/workflows/5_prototype_analysis.yml">![5. Прототип анализ](./../../actions/workflows/5_prototype_analysis.yml/badge.svg)</a>

<a href="./../../../actions/workflows/6_report.yml">![6. Пояснительная записка](./../../actions/workflows/6_report.yml/badge.svg)</a>

<a href="./../../../actions/workflows/7_app_is_ready.yml">![7. App is ready](./../../actions/workflows/7_app_is_ready.yml/badge.svg)</a>

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

При первом старте backend загружает данные из `frontend/public/kanji-db.json`, если коллекция `kanji` пустая. Этот seed хранится в репозитории и копируется в Docker-образ backend, поэтому проект можно запустить из чистого clone без локальной папки `data/`.

Папка `data/` нужна только для пересборки seed из исходных наборов данных. Сырые файлы JMDict, KANJIDIC2, KanjiVG и Tatoeba не коммитятся как обычные Git-файлы из-за размера; ожидаемые имена файлов указаны в начале `scripts/build_seed.py`.

Seed собирается из файлов в `data/` и содержит:

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
- ранжирование кандидатов рукописного ввода через aggregation pipeline;
- группировку радикалов через `$bucketAuto`;
- расчёт значений графиков через `$group`, `$avg`, `$sum`, `$size` и `$unwind`.

## Архитектура backend

Backend разделён на несколько слоёв:

- `app/core` — настройки приложения и переменные окружения;
- `app/data` — подключение к MongoDB, индексы, seed, репозитории и aggregation pipeline;
- `app/service` — бизнес-логика, валидация, импорт/экспорт и авторизация импорта;
- `app/web` — HTTP-роутеры FastAPI.

## Отладочный пользователь

Доступ нужен для массового импорта JSON, экспорта полного снимка базы и изменения записей. Авторизация проверяется backend-ом, после входа клиент получает короткоживущий bearer-токен и отправляет его вместе с защищёнными запросами.

```text
login: admin
password: admin123
```

Импорт заменяет содержимое коллекций `kanji` и `radicals`. Если в JSON нет коллекции `users` или она пустая, текущие пользователи сохраняются, чтобы не потерять доступ администратора. Экспорт выгружает полный снимок данных приложения в JSON и доступен только после входа.

## Локальная разработка

Фронтенд:

```bash
cd frontend
npm install
npm run dev
```

Vite проксирует `/api` на `http://127.0.0.1:8080`, то есть на frontend-контейнер nginx, который передаёт API-запросы в backend. Если backend запущен отдельно без Docker Compose, цель можно переопределить переменной `VITE_API_PROXY_TARGET`.

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
