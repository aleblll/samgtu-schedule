---
title: App.tsx - Главный Оркестратор Приложения
tags:
  - модуль
  - фронтенд
  - ядро
---

# 🚀 App.tsx: Главный Оркестратор Приложения

## 1. За что отвечает (Назначение)
Файл `App.tsx` — это корневой React-компонент, являющийся координатором состояния всего приложения:
* Управление активной группой студента (`selectedGroup`).
* Определение текущей учебной недели (1..4) и активного дня недели (понедельник..суббота).
* Маршрутизация нижних вкладок (`activeTab`: 'schedule', 'attendance', 'homework', 'admin').
* Фоновая координация синхронизации с облаком ([[cloudSync.ts - Клиент Облачной Синхронизации]]).
* Отображение модальных окон (редактирование пар, импорт, баг-репорты, консоль логов).

## 2. Ключевые хуки и состояние
```typescript
const [selectedGroup, setSelectedGroup] = useState<string>(() => loadInitialGroup());
const [currentWeek, setCurrentWeek] = useState<number>(() => calculateCurrentWeek());
const [customSchedule, setCustomSchedule] = useState<CustomScheduleMap>({});
const [role, setRole] = useState<Role>('student');
```

## 3. Взаимодействие с внешними модулями
* Читает начальные данные из `localStorage`.
* Запускает фоновый запрос `loadCloud(selectedGroup)`.
* Передает расписание в [[SwipeableDays.tsx - Жестовый Свайпер]].
* Принимает запросы на открытие модалки от [[ClassCard.tsx - Карточка Занятия]].
* Обернут в [[ErrorBoundary.tsx и TabErrorBoundary.tsx]] для защиты от падений.

---
## 🔗 Связанные материалы
* Слой: [[Слой 1 - Клиентский Слой и Runtime]]
* Поток: [[Поток 1 - Инициализация и Холодный Старт]]
