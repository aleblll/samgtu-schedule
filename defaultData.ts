import { Lesson, HomeworkItem } from './types';
import { AttendanceRecord } from './attendance';

export const SEED_SCHEDULE_OVERRIDES: Record<string, Partial<Lesson>> = {
  '310-w1-fr-1': {
    note: 'Хаып'
  },
  '310-w1-fr-4': {
    isCancelled: true
  }
};

export const SEED_SUBJECT_TEACHERS: Record<string, string> = {
  'Безопасность жизнедеятельности': 'Коннов В.В.',
  'Основы расчета колебаний динамического оборудования нефтяных и газовых промыслов': 'Коныгин Сергей Борисович',
  'Опытно-конструкторские работы и патентоведение в области нефтепромыслового оборудования': 'Парфенов Кирилл Викторович'
};

export const SEED_ATTENDANCE: AttendanceRecord[] = [
  {
    docId: 'ingt-310_2026-09-04_310-w1-fr-4',
    groupId: 'ingt-310',
    date: '2026-09-04',
    lessonId: '310-w1-fr-4',
    absentStudentIds: [],
    excusedStudentIds: [],
    isCancelled: true,
    timestamp: 1756911666632
  }
];

export const SEED_HOMEWORK: HomeworkItem[] = [
  {
    id: 'hw-1756911666632',
    groupId: 'ingt-310',
    subject: 'Безопасность жизнедеятельности',
    title: 'Тактаа',
    description: 'Уиии',
    assignedDate: '2026-09-03',
    dueDate: '2026-09-10',
    attachments: [
      {
        id: 'att-seed-1',
        name: 'tiktok',
        url: 'https://tiktok.com',
        type: 'link'
      },
      {
        id: 'att-seed-2',
        name: 'PZ1.docx',
        data: 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQAAAAIAAAAAAAAAAAAAAAAAAAAAAA=',
        type: 'doc',
        size: '335.0 КБ'
      }
    ],
    createdAt: '2026-09-03T15:01:06.632Z'
  },
  {
    id: 'hw-1756914589201',
    groupId: 'ingt-310',
    subject: 'Техника и технология добычи нефти и газа',
    title: 'Угу',
    description: 'Дада',
    assignedDate: '2026-09-03',
    dueDate: '2026-09-10',
    attachments: [
      {
        id: 'att-seed-3',
        name: 'pinterest',
        url: 'https://pin.it/2gmVv8oSl',
        type: 'link'
      },
      {
        id: 'att-seed-4',
        name: '1_0.png',
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        type: 'image',
        size: '50.0 КБ'
      }
    ],
    createdAt: '2026-09-03T15:49:49.201Z'
  }
];
