import { Lesson, HomeworkItem } from './types';
import { AttendanceRecord } from './attendance';

export const SEED_SCHEDULE_OVERRIDES: Record<string, Partial<Lesson>> = {};

export const SEED_SUBJECT_TEACHERS: Record<string, string> = {
  'Безопасность жизнедеятельности': 'Коннов В.В.',
  'Основы расчета колебаний динамического оборудования нефтяных и газовых промыслов': 'Коныгин Сергей Борисович',
  'Опытно-конструкторские работы и патентоведение в области нефтепромыслового оборудования': 'Парфенов Кирилл Викторович'
};

export const SEED_ATTENDANCE: AttendanceRecord[] = [];

export const SEED_HOMEWORK: HomeworkItem[] = [];

