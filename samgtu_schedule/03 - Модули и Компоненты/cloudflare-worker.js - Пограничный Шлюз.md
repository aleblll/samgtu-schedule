---
title: cloudflare-worker.js - Пограничный Шлюз
tags:
  - модуль
  - бэкенд
  - edge
---

# 🌐 cloudflare-worker.js: Пограничный Шлюз (Edge Gateway)

## 1. За что отвечает
Серверлесс-микросервис, развернутый на Cloudflare Workers:
* Маршрутизация запросов клиентов к облачным корзинам ExtendsClass.
* Проксирование репортов и телеметрии в Telegram Bot API.
* Принудительная фильтрация полей (Whitelisting).
* Управление CORS-заголовками.

## 2. Эндпоинты
| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/sync/:binId` | Получение актуального расписания группы из ExtendsClass |
| `PUT` | `/sync/:binId` | Обновление расписания группы (с санитизацией DTO) |
| `POST` | `/upload` | Загрузка файлов и скриншотов в Telegram (multipart/form-data) |
| `POST` | `/alert` | Мгновенная отправка текстового алерта краша в Telegram |

---
## 🔗 Связанные материалы
* Слой: [[Слой 4 - Серверлесс Шлюз и Edge]]
* Обоснование: [[ADR-001 - Cloudflare Worker и JSON Bins вместо VPS]]
* Обоснование: [[ADR-005 - Whitelisting и защита от Mass Assignment]]
