import { PlannerEvent } from '../types/planner';

export const SEED_SAMGTU_3INGT_101: PlannerEvent[] = [
  // ===================== НЕЧЁТНАЯ НЕДЕЛЯ (ODD) =====================
  // Вторник (day 2)
  {
    id: 'uni-odd-tu-1',
    type: 'university',
    title: 'Компьютерные и математические методы моделирования и обработки данных в нефтегазовом деле',
    timeStart: '11:50',
    timeEnd: '13:25',
    dayOfWeek: 2,
    weekParity: 'odd',
    lessonType: 'Лабораторные работы',
    location: 'Корпус № 1, 225',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-odd-tu-2',
    type: 'university',
    title: 'Компьютерные и математические методы моделирования и обработки данных в нефтегазовом деле',
    timeStart: '13:35',
    timeEnd: '15:10',
    dayOfWeek: 2,
    weekParity: 'odd',
    lessonType: 'Лабораторные работы',
    location: 'Корпус № 1, 225',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-odd-tu-3',
    type: 'university',
    title: 'Технология промывки скважин',
    timeStart: '15:40',
    timeEnd: '17:15',
    dayOfWeek: 2,
    weekParity: 'odd',
    lessonType: 'Лекции',
    location: 'Корпус № 1, 426',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-odd-tu-4',
    type: 'university',
    title: 'Технология бурения нефтяных и газовых скважин',
    timeStart: '17:25',
    timeEnd: '19:00',
    dayOfWeek: 2,
    weekParity: 'odd',
    lessonType: 'Лекции',
    location: 'Корпус № 1, 417',
    teacher: 'Кафедра ИНГТ'
  },

  // Среда (day 3)
  {
    id: 'uni-odd-we-1',
    type: 'university',
    title: 'Эксплуатация бурового оборудования',
    timeStart: '08:00',
    timeEnd: '09:35',
    dayOfWeek: 3,
    weekParity: 'odd',
    lessonType: 'Практические занятия',
    location: '3ц корпус № 1',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-odd-we-2',
    type: 'university',
    title: 'Эксплуатация бурового оборудования',
    timeStart: '09:45',
    timeEnd: '11:20',
    dayOfWeek: 3,
    weekParity: 'odd',
    lessonType: 'Лекции',
    location: 'Корпус № 1, 426',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-odd-we-3',
    type: 'university',
    title: 'Геонавигация в бурении',
    timeStart: '11:50',
    timeEnd: '13:25',
    dayOfWeek: 3,
    weekParity: 'odd',
    lessonType: 'Практические занятия',
    location: 'Корпус № 1, 412',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-odd-we-4',
    type: 'university',
    title: 'Геонавигация в бурении',
    timeStart: '13:35',
    timeEnd: '15:10',
    dayOfWeek: 3,
    weekParity: 'odd',
    lessonType: 'Лекции',
    location: 'Корпус № 1, 426',
    teacher: 'Кафедра ИНГТ'
  },

  // Пятница (day 5)
  {
    id: 'uni-odd-fr-1',
    type: 'university',
    title: 'Технология бурения нефтяных и газовых скважин',
    timeStart: '11:50',
    timeEnd: '13:25',
    dayOfWeek: 5,
    weekParity: 'odd',
    lessonType: 'Лабораторные работы',
    location: '4ц корпус № 1',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-odd-fr-2',
    type: 'university',
    title: 'Технология бурения нефтяных и газовых скважин',
    timeStart: '13:35',
    timeEnd: '15:10',
    dayOfWeek: 5,
    weekParity: 'odd',
    lessonType: 'Лабораторные работы',
    location: '4ц корпус № 1',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-odd-fr-3',
    type: 'university',
    title: 'Компьютерные и математические методы моделирования и обработки данных в нефтегазовом деле',
    timeStart: '15:40',
    timeEnd: '17:15',
    dayOfWeek: 5,
    weekParity: 'odd',
    lessonType: 'Лекции',
    location: 'Корпус № 1, 426',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-odd-fr-4',
    type: 'university',
    title: 'Физико-математические основы решения инженерных задач и статистические методы обработки данных в бурении',
    timeStart: '17:25',
    timeEnd: '19:00',
    dayOfWeek: 5,
    weekParity: 'odd',
    lessonType: 'Лекции',
    location: 'Корпус № 1, 426',
    teacher: 'Кафедра ИНГТ'
  },

  // Суббота (day 6)
  {
    id: 'uni-odd-sa-1',
    type: 'university',
    title: 'Термодинамика и теплопередача',
    timeStart: '15:40',
    timeEnd: '17:15',
    dayOfWeek: 6,
    weekParity: 'odd',
    lessonType: 'Лабораторные работы',
    location: 'Корпус № 6, 30',
    teacher: 'Бранфилева Анастасия Николаевна'
  },
  {
    id: 'uni-odd-sa-2',
    type: 'university',
    title: 'Термодинамика и теплопередача',
    timeStart: '17:25',
    timeEnd: '19:00',
    dayOfWeek: 6,
    weekParity: 'odd',
    lessonType: 'Лабораторные работы',
    location: 'Корпус № 6, 30',
    teacher: 'Бранфилева Анастасия Николаевна'
  },

  // ===================== ЧЁТНАЯ НЕДЕЛЯ (EVEN) =====================
  // Понедельник (day 1)
  {
    id: 'uni-even-mo-1',
    type: 'university',
    title: 'Элективные курсы по физической культуре и спорту',
    timeStart: '11:50',
    timeEnd: '13:25',
    dayOfWeek: 1,
    weekParity: 'even',
    lessonType: 'Практические занятия',
    location: 'Спортивный комплекс',
    teacher: 'Кафедра физического воспитания'
  },
  {
    id: 'uni-even-mo-2',
    type: 'university',
    title: 'Термодинамика и теплопередача',
    timeStart: '13:35',
    timeEnd: '15:10',
    dayOfWeek: 1,
    weekParity: 'even',
    lessonType: 'Лекции',
    location: 'Корпус № 6, 50',
    teacher: 'Бранфилева Анастасия Николаевна'
  },
  {
    id: 'uni-even-mo-3',
    type: 'university',
    title: 'Гидравлика и нефтегазовая гидромеханика',
    timeStart: '15:40',
    timeEnd: '17:15',
    dayOfWeek: 1,
    weekParity: 'even',
    lessonType: 'Лекции',
    location: 'Корпус № 9, 208',
    teacher: 'Кафедра ИНГТ'
  },

  // Вторник (day 2)
  {
    id: 'uni-even-tu-1',
    type: 'university',
    title: 'Практико-ориентированный проект',
    timeStart: '09:45',
    timeEnd: '11:20',
    dayOfWeek: 2,
    weekParity: 'even',
    lessonType: 'Практические занятия',
    location: 'Корпус № 1, 225',
    teacher: 'Кафедра ИНГТ'
  },

  // Среда (day 3)
  {
    id: 'uni-even-we-1',
    type: 'university',
    title: 'Эксплуатация бурового оборудования',
    timeStart: '08:00',
    timeEnd: '09:35',
    dayOfWeek: 3,
    weekParity: 'even',
    lessonType: 'Лабораторные работы',
    location: '3ц корпус № 1',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-even-we-2',
    type: 'university',
    title: 'Эксплуатация бурового оборудования',
    timeStart: '09:45',
    timeEnd: '11:20',
    dayOfWeek: 3,
    weekParity: 'even',
    lessonType: 'Лабораторные работы',
    location: '3ц корпус № 1',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-even-we-3',
    type: 'university',
    title: 'Технология промывки скважин',
    timeStart: '11:50',
    timeEnd: '13:25',
    dayOfWeek: 3,
    weekParity: 'even',
    lessonType: 'Лабораторные работы',
    location: '3ц корпус № 1',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-even-we-4',
    type: 'university',
    title: 'Технология промывки скважин',
    timeStart: '13:35',
    timeEnd: '15:10',
    dayOfWeek: 3,
    weekParity: 'even',
    lessonType: 'Лабораторные работы',
    location: '3ц корпус № 1',
    teacher: 'Кафедра ИНГТ'
  },

  // Пятница (day 5)
  {
    id: 'uni-even-fr-1',
    type: 'university',
    title: 'Элективные курсы по физической культуре и спорту',
    timeStart: '11:50',
    timeEnd: '13:25',
    dayOfWeek: 5,
    weekParity: 'even',
    lessonType: 'Практические занятия',
    location: 'Спортивный комплекс',
    teacher: 'Кафедра физического воспитания'
  },
  {
    id: 'uni-even-fr-2',
    type: 'university',
    title: 'Политология и культурология',
    timeStart: '13:35',
    timeEnd: '15:10',
    dayOfWeek: 5,
    weekParity: 'even',
    lessonType: 'Практические занятия',
    location: 'Корпус № 10, 309',
    teacher: 'Кафедра социологии'
  },
  {
    id: 'uni-even-fr-3',
    type: 'university',
    title: 'Системы искусственного интеллекта',
    timeStart: '15:40',
    timeEnd: '17:15',
    dayOfWeek: 5,
    weekParity: 'even',
    lessonType: 'Практические занятия',
    location: 'Корпус № 10, 102',
    teacher: 'Кафедра ИАИТ'
  },
  {
    id: 'uni-even-fr-4',
    type: 'university',
    title: 'Системы искусственного интеллекта',
    timeStart: '17:25',
    timeEnd: '19:00',
    dayOfWeek: 5,
    weekParity: 'even',
    lessonType: 'Практические занятия',
    location: 'Корпус № 10, 102',
    teacher: 'Кафедра ИАИТ'
  },

  // Суббота (day 6)
  {
    id: 'uni-even-sa-1',
    type: 'university',
    title: 'Физико-математические основы решения инженерных задач и статистические методы обработки данных в бурении',
    timeStart: '08:00',
    timeEnd: '09:35',
    dayOfWeek: 6,
    weekParity: 'even',
    lessonType: 'Лабораторные работы',
    location: 'Политехнопарк',
    teacher: 'Кафедра ИНГТ'
  },
  {
    id: 'uni-even-sa-2',
    type: 'university',
    title: 'Физико-математические основы решения инженерных задач и статистические методы обработки данных в бурении',
    timeStart: '09:45',
    timeEnd: '11:20',
    dayOfWeek: 6,
    weekParity: 'even',
    lessonType: 'Лабораторные работы',
    location: 'Политехнопарк',
    teacher: 'Кафедра ИНГТ'
  }
];
