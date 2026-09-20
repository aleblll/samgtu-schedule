---
title: constants.ts и types.ts - Реестр и Типизация
tags:
  - модуль
  - данные
  - typescript
---

# 🗃️ constants.ts и types.ts: Реестр Расписания и Типизация

## 1. Реестр `constants.ts`
Центральное статическое хранилище расписания СамГТУ:
* `SCHEDULE_REGISTRY`: содержит расписание для ключевых групп потоков:
  - `3-ИНГТ-111`, `3-ИНГТ-110`, `3-ИНГТ-101`, `3-ИНГТ-103`
  - `2-ИНГТ-109`
  - `3-ФАИД-110`
  - `2-ХТФ-115`
* `CALL_SCHEDULE`: официальная сетка звонков университета (время начала и окончания каждой из 7 пар).
* Списки кафедр, институтов, справочники преподавателей.

## 2. Типизация `types.ts`
Определяет строгие контракты TypeScript для исключения ошибок типизации:
```typescript
export interface Lesson {
  id: string;
  name: string;
  type: 'lecture' | 'practice' | 'lab';
  teacher: string;
  room: string;
  building?: string;
  subgroup?: 1 | 2;
  isCancelled?: boolean;
  isMoved?: boolean;
  notes?: string;
  link?: string;
}

export type Role = 'student' | 'starosta' | 'admin';
```

---
## 🔗 Связанные материалы
* Слой: [[Слой 3 - Расписание и Бизнес-Ядро]]
* Обоснование: [[ADR-002 - Offline First и 4-недельный цикл расписания]]
