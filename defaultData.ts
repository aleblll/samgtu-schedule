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
        name: 'Методические материалы СамГТУ',
        url: 'https://samgtu.ru',
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
        name: 'pinterest (конспект)',
        url: 'https://pin.it/2gmVv8oSl',
        type: 'link'
      },
      {
        id: 'att-seed-4',
        name: 'Образец_отчета.svg',
        data: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNjAwIDQwMCI+PHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI0MDAiIHJ4PSIyNCIgZmlsbD0iIzRmNDZlNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIzMiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPtCh0LDQvNCT0KLQowKgMy3QmNCd0JPQoi0xMTA8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI1NSUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjIwIiBmaWxsPSIjYzdkMmZlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7Ql9Cw0LTQsNC90LjQtINC6INC/0YDQsNC60YLQuNGH0LXRgdC60L7QuSDRgNCw0LHQvtGC0LUg4oSWMTwvdGV4dD48dGV4dCB4PSI1MCUiIHk9IjcwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiNhNWI0ZmMiIHRleHQtYW5jaG9yPSJtaWRkbGUiPtCf0YDQuNC80LXRgCDQv9GA0LjQutGA0LXQv9C70LXQvdC90L7Qs9C+INC80LDRgtC10YDQuNCw0LvQsDwvdGV4dD48L3N2Zz4=',
        type: 'image',
        size: '12.4 КБ'
      }
    ],
    createdAt: '2026-09-03T15:49:49.201Z'
  }
];
