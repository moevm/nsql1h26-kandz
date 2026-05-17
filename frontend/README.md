# KanjiLookup Frontend

React/Vite клиент для KanjiLookup. Клиент не хранит и не обрабатывает данные приложения самостоятельно: поиск, статистика, импорт, экспорт и ранжирование выполняются через backend API.

```bash
npm install
npm run dev
npm run lint
npm run build
```

Стили написаны на SCSS: глобальная точка входа `src/index.scss`, переменные и миксины лежат в `src/styles`.

В режиме разработки Vite проксирует `/api` на `http://127.0.0.1:8000`.
