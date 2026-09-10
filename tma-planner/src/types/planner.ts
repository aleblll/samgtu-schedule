export type EventType = 'university' | 'tutoring' | 'workout' | 'personal';

export type StudentStatus = 'planned' | 'completed' | 'rescheduled' | 'cancelled' | 'paid';

export type LessonType = 'Лекции' | 'Практические занятия' | 'Лабораторные работы';

export type WeekParity = 'odd' | 'even' | 'all';

export interface PlannerEvent {
  id: string;
  type: EventType;
  title: string;
  timeStart: string; // "HH:mm"
  timeEnd: string;   // "HH:mm"
  dayOfWeek: number; // 1 (Пн) .. 7 (Вс)
  weekParity: WeekParity;
  specificDate?: string; // "YYYY-MM-DD" if shifted or created for specific date
  location?: string;
  teacher?: string;
  lessonType?: LessonType;
  timezoneBadge?: string; // e.g. "МСК"
  status?: StudentStatus;
  note?: string;
  isCompleted?: boolean;
  isFloating?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export type FilterType = 'all' | 'university' | 'tutoring' | 'workout';

export type ThemeMode = 'dark' | 'light' | 'auto';

export type TimezoneMode = 'local' | 'msk' | 'both';

export interface AppSettings {
  theme: ThemeMode;
  timezone: TimezoneMode;
  weekParity: 'odd' | 'even';
  autoParityWithCalendar: boolean;
  semesterStartDate: string; // ISO date "YYYY-MM-DD"
  lastCloudSync?: number;
}

export interface DayWindow {
  start: string;
  end: string;
  durationMinutes: number;
}
