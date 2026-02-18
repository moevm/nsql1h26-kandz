import os
from pymongo import MongoClient


def run_task():
    # 1. Подключение
    uri = "mongodb://localhost:27017/"
    client = MongoClient(uri)

    try:
        # 2. Выбор(создание) базы и коллекции
        db = client["study_db"]
        collection = db["hello_collection"]

        # 3. Запись
        doc = {"name": "Student", "message": "Hello MongoDB!", "status": "success"}
        insert_result = collection.insert_one(doc)
        print(f"Запись успешно добавлена с ID: {insert_result.inserted_id}")

        # 4. Чтение
        found_doc = collection.find_one({"_id": insert_result.inserted_id})
        print(f"Данные из БД: {found_doc['message']}")

    except Exception as e:
        print(f"Ошибка: {e}")

    finally:
        client.close()


if __name__ == "__main__":
    run_task()