import { PlannerEvent } from '../types/planner';

export const SEED_TUTORING: PlannerEvent[] = [
  // Понедельник (day 1)
  {
    id: 'tut-mo-1',
    type: 'tutoring',
    title: 'Макс',
    timeStart: '18:00',
    timeEnd: '19:00',
    dayOfWeek: 1,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Discord / Zoom',
    note: 'Подготовка к ЕГЭ / Профиль'
  },
  {
    id: 'tut-mo-2',
    type: 'tutoring',
    title: 'Нина',
    timeStart: '19:00',
    timeEnd: '20:00',
    dayOfWeek: 1,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Telegram звонок',
    note: 'Алгебра: тригонометрические уравнения'
  },
  {
    id: 'tut-mo-3',
    type: 'tutoring',
    title: 'абвгд',
    timeStart: '20:00',
    timeEnd: '21:00',
    dayOfWeek: 1,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Online',
    note: 'Геометрия: планиметрия'
  },

  // Среда (day 3)
  {
    id: 'tut-we-1',
    type: 'tutoring',
    title: 'Андрюха',
    timeStart: '16:00',
    timeEnd: '17:00',
    dayOfWeek: 3,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Discord',
    note: 'Параметры и неравенства'
  },
  {
    id: 'tut-we-2',
    type: 'tutoring',
    title: 'Арина',
    timeStart: '17:00',
    timeEnd: '18:00',
    dayOfWeek: 3,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Zoom',
    note: 'Стереометрия: сечения и углы'
  },
  {
    id: 'tut-we-3',
    type: 'tutoring',
    title: 'Макс',
    timeStart: '18:00',
    timeEnd: '19:00',
    dayOfWeek: 3,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Discord / Zoom',
    note: 'Экономическая задача (№16)'
  },
  {
    id: 'tut-we-4',
    type: 'tutoring',
    title: 'Нина',
    timeStart: '19:00',
    timeEnd: '20:00',
    dayOfWeek: 3,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Telegram звонок',
    note: 'Производные и графики'
  },

  // Четверг (day 4)
  {
    id: 'tut-th-1',
    type: 'tutoring',
    title: 'Ева',
    timeStart: '13:00',
    timeEnd: '14:00',
    dayOfWeek: 4,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Zoom',
    note: 'ОГЭ Математика: блок геометрии'
  },
  {
    id: 'tut-th-2',
    type: 'tutoring',
    title: 'Честер',
    timeStart: '15:00',
    timeEnd: '16:00',
    dayOfWeek: 4,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Discord',
    note: 'Физика: механика и законы Ньютона'
  },
  {
    id: 'tut-th-3',
    type: 'tutoring',
    title: 'Карим',
    timeStart: '16:00',
    timeEnd: '17:00',
    dayOfWeek: 4,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Google Meet',
    note: 'ЕГЭ Профиль: теория вероятностей'
  },
  {
    id: 'tut-th-4',
    type: 'tutoring',
    title: 'Макс',
    timeStart: '17:00',
    timeEnd: '18:00',
    dayOfWeek: 4,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Discord / Zoom',
    note: 'Разбор пробника ЕГЭ'
  },

  // Суббота (day 6)
  {
    id: 'tut-sa-1',
    type: 'tutoring',
    title: 'Ева',
    timeStart: '12:00',
    timeEnd: '13:00',
    dayOfWeek: 6,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Zoom',
    note: 'Алгебра: текстовые задачи (движение, работа)'
  },

  // Воскресенье (day 7)
  {
    id: 'tut-su-1',
    type: 'tutoring',
    title: 'Карим',
    timeStart: '09:00',
    timeEnd: '10:00',
    dayOfWeek: 7,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Google Meet',
    note: 'Параметры: графический метод'
  },
  {
    id: 'tut-su-2',
    type: 'tutoring',
    title: 'Арина',
    timeStart: '11:00',
    timeEnd: '12:00',
    dayOfWeek: 7,
    weekParity: 'all',
    timezoneBadge: 'МСК',
    status: 'planned',
    location: 'Zoom',
    note: 'Стереометрия: метод координат'
  }
];
