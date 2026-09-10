import { PlannerEvent } from '../types/planner';

export const SEED_WORKOUTS: PlannerEvent[] = [
  // ===================== ФИКСИРОВАННЫЕ ТРЕНИРОВКИ =====================
  // Вторник (day 2): 20:30 – 22:00
  {
    id: 'work-fix-tu',
    type: 'workout',
    title: 'Треня с Тёмиком',
    timeStart: '20:30',
    timeEnd: '22:00',
    dayOfWeek: 2,
    weekParity: 'all',
    location: 'Фитнес-клуб',
    note: 'Тяжелая тренировка (Грудь / Жим + Плечи)'
  },

  // Четверг (day 4): 20:30 – 22:00
  {
    id: 'work-fix-th',
    type: 'workout',
    title: 'Треня с Тёмиком',
    timeStart: '20:30',
    timeEnd: '22:00',
    dayOfWeek: 4,
    weekParity: 'all',
    location: 'Фитнес-клуб',
    note: 'Интенсивная тренировка (Спина / Тяги + Руки)'
  },

  // ===================== ПЛАВАЮЩИЙ ЗАЛ (ПН, СР, ПТ) =====================
  // Понедельник (day 1) - нечетная неделя (пар нет, ученики с 18:00) -> 15:30 - 17:00
  {
    id: 'work-float-mo-odd',
    type: 'workout',
    title: 'Зал',
    timeStart: '15:30',
    timeEnd: '17:00',
    dayOfWeek: 1,
    weekParity: 'odd',
    isFloating: true,
    location: 'Зал',
    note: 'Ноги / Икры (в свободное окно до уроков)'
  },

  // Понедельник (day 1) - четная неделя (пары до 17:15, уроки с 18:00 до 21:00) -> 09:30 - 11:00
  {
    id: 'work-float-mo-even',
    type: 'workout',
    title: 'Зал',
    timeStart: '09:30',
    timeEnd: '11:00',
    dayOfWeek: 1,
    weekParity: 'even',
    isFloating: true,
    location: 'Зал',
    note: 'Утренняя силовая (до пар в университете)'
  },

  // Среда (day 3) - уроки с 16:00 до 20:00 -> 20:30 - 21:45
  {
    id: 'work-float-we',
    type: 'workout',
    title: 'Зал',
    timeStart: '20:30',
    timeEnd: '21:45',
    dayOfWeek: 3,
    weekParity: 'all',
    isFloating: true,
    location: 'Зал',
    note: 'Руки / Пресс / Кардио (после учеников)'
  },

  // Пятница (day 5) - пары до 19:00, учеников нет -> 19:30 - 21:00
  {
    id: 'work-float-fr',
    type: 'workout',
    title: 'Зал',
    timeStart: '19:30',
    timeEnd: '21:00',
    dayOfWeek: 5,
    weekParity: 'all',
    isFloating: true,
    location: 'Зал',
    note: 'Плечи / Кардио (завершение учебной недели)'
  }
];
