import { PlannerEvent, DayWindow } from '../types/planner';

export const RUSSIAN_DAYS_FULL = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье'
];

export const RUSSIAN_DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const RUSSIAN_MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getDurationMinutes(timeStart: string, timeEnd: string): number {
  return timeToMinutes(timeEnd) - timeToMinutes(timeStart);
}

export function formatDurationHuman(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

/**
 * Конвертация времени между МСК (UTC+3) и Самарой (UTC+4)
 * Самара = МСК + 1 час
 */
export function mskToSamara(mskTime: string): string {
  const mins = timeToMinutes(mskTime) + 60;
  return minutesToTime(mins);
}

export function samaraToMsk(samaraTime: string): string {
  const mins = timeToMinutes(samaraTime) - 60;
  return minutesToTime(mins);
}

/**
 * Получение текущего дня недели (1..7, где 1 = Пн, 7 = Вс)
 */
export function getCurrentDayOfWeek(date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

/**
 * Форматирование читаемой даты (напр. "11 сентября, Четверг")
 */
export function formatDateHuman(date: Date): string {
  const dayName = RUSSIAN_DAYS_FULL[getCurrentDayOfWeek(date) - 1];
  const day = date.getDate();
  const month = RUSSIAN_MONTHS[date.getMonth()];
  return `${day} ${month}, ${dayName}`;
}

/**
 * Нахождение свободных окон в дне (для рекомендаций плавающего зала или перерывов)
 */
export function findFreeWindows(
  events: PlannerEvent[],
  dayStart = '08:00',
  dayEnd = '22:00',
  minGapMinutes = 45
): DayWindow[] {
  if (events.length === 0) {
    return [
      {
        start: dayStart,
        end: dayEnd,
        durationMinutes: timeToMinutes(dayEnd) - timeToMinutes(dayStart)
      }
    ];
  }

  // Сортировка событий по времени начала
  const sorted = [...events].sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart));
  const windows: DayWindow[] = [];
  let curMins = timeToMinutes(dayStart);

  for (const ev of sorted) {
    const evStart = timeToMinutes(ev.timeStart);
    const evEnd = timeToMinutes(ev.timeEnd);

    if (evStart > curMins) {
      const gap = evStart - curMins;
      if (gap >= minGapMinutes) {
        windows.push({
          start: minutesToTime(curMins),
          end: minutesToTime(evStart),
          durationMinutes: gap
        });
      }
    }
    curMins = Math.max(curMins, evEnd);
  }

  const endMins = timeToMinutes(dayEnd);
  if (endMins > curMins && endMins - curMins >= minGapMinutes) {
    windows.push({
      start: minutesToTime(curMins),
      end: dayEnd,
      durationMinutes: endMins - curMins
    });
  }

  return windows;
}

/**
 * Определение текущего или следующего события для виджета «Сейчас»
 */
export function getLiveStatus(events: PlannerEvent[], now = new Date()) {
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const sorted = [...events].sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart));

  // Ищем текущее активное событие
  const currentEvent = sorted.find(ev => {
    const start = timeToMinutes(ev.timeStart);
    const end = timeToMinutes(ev.timeEnd);
    return nowMins >= start && nowMins < end;
  });

  if (currentEvent) {
    const end = timeToMinutes(currentEvent.timeEnd);
    const remaining = end - nowMins;
    const totalDuration = end - timeToMinutes(currentEvent.timeStart);
    const progressPercent = Math.min(100, Math.max(0, Math.round(((totalDuration - remaining) / totalDuration) * 100)));

    return {
      type: 'current' as const,
      event: currentEvent,
      remainingMinutes: remaining,
      progressPercent
    };
  }

  // Ищем следующее событие сегодня
  const nextEvent = sorted.find(ev => timeToMinutes(ev.timeStart) > nowMins);
  if (nextEvent) {
    const start = timeToMinutes(nextEvent.timeStart);
    const until = start - nowMins;
    return {
      type: 'next' as const,
      event: nextEvent,
      untilMinutes: until
    };
  }

  // Если событий больше нет
  return {
    type: 'done' as const,
    event: null
  };
}
