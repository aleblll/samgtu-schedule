---
title: Поток 4 - Ночная Сверка с API СамГТУ
tags:
  - поток
  - автоматизация
  - самгту
---

# 🌙 Поток 4: Ночная Сверка с Официальным API СамГТУ

## Схема Работы Автоматического Робота

```mermaid
flowchart TD
    Cron["⏰ GitHub Actions Cron (Каждую ночь в 03:00 UTC)"]
    Runner["Runner (scripts/nightly_sync.ts)"]
    API["🌐 Официальный API СамГТУ (samgtu.ru/api)"]
    
    CheckStatus{"Проверка ответа API (Статус 200 OK?)"}
    CheckVolume{"Проверка объема пар (Circuit Breaker: пар > 5?)"}
    
    Halt["🛑 Аварийная остановка (База не тронута) + Alert в Telegram"]
    Compare["Сравнение пар с текущим constants.ts (Вычисление Diff)"]
    
    HasDiff{"Есть изменения (новые пары, переносы)?"}
    Done["Успешное завершение: изменений нет"]
    Update["Формирование отчета об изменениях + Push в GitHub/Telegram"]
    
    Cron --> Runner
    Runner --> API
    API --> CheckStatus
    
    CheckStatus -->|Ошибка 500/502/Timeout| Halt
    CheckStatus -->|200 OK| CheckVolume
    
    CheckVolume -->|Менее 5 пар (Аномалия)| Halt
    CheckVolume -->|Данные валидны| Compare
    
    Compare --> HasDiff
    HasDiff -->|Нет| Done
    HasDiff -->|Да| Update
```

---
## 🔗 Связанные материалы
* Скрипт: [[samgtuParser.ts и nightly_sync.ts - Парсер СамГТУ]]
* Обоснование: [[ADR-006 - Circuit Breaker в ночном парсере СамГТУ]]
