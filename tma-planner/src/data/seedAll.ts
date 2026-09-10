import { PlannerEvent, AppSettings } from '../types/planner';
import { SEED_SAMGTU_3INGT_101 } from './seedScheduleSamGTU';
import { SEED_TUTORING } from './seedTutoring';
import { SEED_WORKOUTS } from './seedWorkouts';

export const INITIAL_EVENTS: PlannerEvent[] = [
  ...SEED_SAMGTU_3INGT_101,
  ...SEED_TUTORING,
  ...SEED_WORKOUTS
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  timezone: 'both', // Показывать и Самару, и МСК бейдж
  weekParity: 'odd',
  autoParityWithCalendar: true,
  semesterStartDate: '2026-09-01'
};
