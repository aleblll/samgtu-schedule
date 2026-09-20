---
title: Поток 3 - Обработка Сбоев и Телеметрия в Telegram
tags:
  - поток
  - телеметрия
  - надежность
---

# 🚨 Поток 3: Обработка Сбоев и Сигнализация в Telegram

## Архитектура Сигнализации

```mermaid
flowchart TD
    ErrorEvent["💥 Ошибка (Рендер React / window.onerror / unhandledrejection)"]
    EB["ErrorBoundary.tsx / TabErrorBoundary.tsx"]
    FallbackUI["Красивый экран сбоя: 'Что-то пошло не так' + Кнопка Перезагрузить"]
    
    Logger["utils/logger.ts (Ring Buffer)"]
    Telemetry["utils/telemetry.ts"]
    RateLimiter{"Проверка сигнатуры и Anti-Flood (Кулдаун 60 сек)"}
    
    CFWorker["Cloudflare Worker (/upload или /alert)"]
    Telegram["📱 Telegram Чат Разработчика"]
    
    ErrorEvent --> EB
    EB --> FallbackUI
    ErrorEvent --> Telemetry
    
    Telemetry --> Logger
    Logger -->|Извлечение последних 30 логов| Telemetry
    Telemetry --> RateLimiter
    
    RateLimiter -->|Новая ошибка| CFWorker
    RateLimiter -->|Дубликат ошибки в течение 60 сек| Suppress["Подавление спама (Drop)"]
    
    CFWorker --> Telegram
```

## Содержимое Аварийного Пакета
При возникновении сбоя разработчик получает в Telegram сообщение следующего формата:
```text
🚨 [CRASH ALERT] samgtu-schedule
Ошибка: Cannot read properties of undefined (reading 'lessons')
Файл: components/DayColumn.tsx:42
Платформа: Telegram WebApp (iOS 17.5 / iPhone 15 Pro)
Группа: 3-ИНГТ-111 | Неделя: 2 | День: Вторник

Последние системные логи:
[14:02:11] [INFO] Selected group changed: 3-ИНГТ-111
[14:02:12] [INFO] Cloud sync requested
[14:02:12] [WARN] ExtendsClass payload empty, using fallback
[14:02:13] [ERROR] Render failed in DayColumn
```

---
## 🔗 Связанные материалы
* Слой: [[Слой 7 - Телеметрия и Сигнализация Сбоев]]
* Модули: [[logger.ts и telemetry.ts - Диагностика и Логи]]
