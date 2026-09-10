import { WeekParity } from '../types/planner';

/**
 * Определение номера учебной недели (1..4) и четности ('odd' | 'even')
 * от начальной даты семестра (по умолчанию 1 сентября)
 */
export function calculateWeekParityFromDate(
  targetDate = new Date(),
  semesterStartStr = '2026-09-01'
): { weekNum: number; parity: 'odd' | 'even' } {
  const startDate = new Date(semesterStartStr);
  
  // Начало недели старта (понедельник недели, в которую попадает 1 сентября)
  const startDay = startDate.getDay() === 0 ? 7 : startDate.getDay();
  const startMonday = new Date(startDate);
  startMonday.setDate(startDate.getDate() - (startDay - 1));
  startMonday.setHours(0, 0, 0, 0);

  const curDate = new Date(targetDate);
  curDate.setHours(0, 0, 0, 0);

  const diffMs = curDate.getTime() - startMonday.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  
  // Номер недели (1-индексированный)
  const cycleWeek = (((diffWeeks % 2) + 2) % 2); // 0 or 1
  const parity: 'odd' | 'even' = cycleWeek === 0 ? 'odd' : 'even';
  const weekNum = (diffWeeks >= 0 ? diffWeeks + 1 : 1);

  return { weekNum, parity };
}

export function formatParityLabel(parity: WeekParity): string {
  if (parity === 'odd') return 'Нечётная неделя';
  if (parity === 'even') return 'Чётная неделя';
  return 'Все недели';
}
