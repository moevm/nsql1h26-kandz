FROM python:3.12.8-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV SEED_PATH=/app/frontend/public/kanji-db.json

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --default-timeout=120 --retries=10 -r requirements.txt

COPY backend/app ./app
COPY frontend/public/kanji-db.json ./frontend/public/kanji-db.json

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
