import { INITIAL_EVENTS } from './data/seedAll';
import { SEED_SAMGTU_3INGT_101 } from './data/seedScheduleSamGTU';
import { SEED_TUTORING } from './data/seedTutoring';
import { SEED_WORKOUTS } from './data/seedWorkouts';
import {
  timeToMinutes,
  minutesToTime,
  getDurationMinutes,
  findFreeWindows,
  mskToSamara,
  samaraToMsk
} from './utils/timeUtils';
import { calculateWeekParityFromDate } from './utils/parityUtils';

console.log('================================================================');
console.log('🧪 ВЕРИФИКАЦИЯ ТЕСТОВ ПЕРСОНАЛЬНОГО TMA ПЛАНЕРА');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

// 1. Проверка предустановленных данных СамГТУ (3-ИНГТ-101)
console.log('1. Проверка академического расписания (3-ИНГТ-101)...');
assert(INITIAL_EVENTS.length > 0, 'Общий массив INITIAL_EVENTS не пустой');
assert(SEED_SAMGTU_3INGT_101.length > 0, 'Расписание СамГТУ не пустое');
// Проверка отсутствия пар в понедельник 1 недели (31 августа)
const oddMondayClasses = SEED_SAMGTU_3INGT_101.filter(e => e.dayOfWeek === 1 && e.weekParity === 'odd');
assert(oddMondayClasses.length === 0, 'В понедельник нечетной недели 0 пар (исключена ошибка 31 августа)');

// Проверка четверга (нет пар в универе)
const thuClasses = SEED_SAMGTU_3INGT_101.filter(e => e.dayOfWeek === 4);
assert(thuClasses.length === 0, 'В четверг у группы 3-ИНГТ-101 нет пар в университете');

// 2. Проверка расписания репетитора (МСК)
console.log('\n2. Проверка уроков репетитора (МСК)...');
const monPupils = SEED_TUTORING.filter(e => e.dayOfWeek === 1).map(e => e.title);
assert(monPupils.includes('Макс') && monPupils.includes('Нина') && monPupils.includes('абвгд'), 'Пн: Макс, Нина, абвгд');

const wedPupils = SEED_TUTORING.filter(e => e.dayOfWeek === 3).map(e => e.title);
assert(
  wedPupils.includes('Андрюха') && wedPupils.includes('Арина') && wedPupils.includes('Макс') && wedPupils.includes('Нина'),
  'Ср: Андрюха, Арина, Макс, Нина'
);

const thuPupils = SEED_TUTORING.filter(e => e.dayOfWeek === 4).map(e => e.title);
assert(
  thuPupils.includes('Ева') && thuPupils.includes('Честер') && thuPupils.includes('Карим') && thuPupils.includes('Макс'),
  'Чт: Ева, Честер, Карим, Макс'
);

const satPupils = SEED_TUTORING.filter(e => e.dayOfWeek === 6).map(e => e.title);
assert(satPupils.includes('Ева') && satPupils.length === 1, 'Сб: 12:00 Ева');

const sunPupils = SEED_TUTORING.filter(e => e.dayOfWeek === 7).map(e => e.title);
assert(sunPupils.includes('Карим') && sunPupils.includes('Арина'), 'Вс: Карим, Арина');

// Проверка бейджа МСК
const allHaveMsk = SEED_TUTORING.every(e => e.timezoneBadge === 'МСК');
assert(allHaveMsk, 'Все уроки репетитора имеют бейдж «МСК»');

// 3. Проверка тренировок
console.log('\n3. Проверка тренировок...');
const temikWorkouts = SEED_WORKOUTS.filter(e => e.title === 'Треня с Тёмиком');
assert(temikWorkouts.length === 2, 'Ровно 2 тренировки с Тёмиком в неделю (Вт, Чт)');
assert(
  temikWorkouts.every(w => w.timeStart === '20:30' && w.timeEnd === '22:00'),
  'Тренировки с Тёмиком строго в 20:30 – 22:00'
);

const gymSlots = SEED_WORKOUTS.filter(e => e.title === 'Зал' && e.isFloating);
assert(gymSlots.length >= 3, 'Зал представлен плавающими слотами (Пн, Ср, Пт)');

// 4. Проверка утилит времени и часовых поясов
console.log('\n4. Проверка утилит времени и часовых поясов...');
assert(timeToMinutes('08:00') === 480, 'timeToMinutes(08:00) === 480');
assert(minutesToTime(480) === '08:00', 'minutesToTime(480) === 08:00');
assert(getDurationMinutes('20:30', '22:00') === 90, 'Длительность тренировки 90 минут');

// Конвертация МСК <-> Самара (Самара = МСК + 1 час)
assert(mskToSamara('18:00') === '19:00', '18:00 МСК -> 19:00 Самара');
assert(samaraToMsk('19:00') === '18:00', '19:00 Самара -> 18:00 МСК');

// 5. Проверка поиска свободных окон дня
console.log('\n5. Проверка поиска свободных окон...');
const mockEvents = [
  { id: '1', type: 'university' as const, title: 'Пара', timeStart: '09:45', timeEnd: '11:20', dayOfWeek: 1, weekParity: 'all' as const },
  { id: '2', type: 'tutoring' as const, title: 'Урок', timeStart: '18:00', timeEnd: '19:00', dayOfWeek: 1, weekParity: 'all' as const }
];
const gaps = findFreeWindows(mockEvents, '08:00', '22:00', 45);
assert(gaps.length >= 2, 'Обнаружены свободные окна между занятиями');
assert(gaps.some(g => g.start === '11:20' && g.end === '18:00'), 'Найдено дневное окно 11:20 - 18:00 для Зала');

// 6. Проверка четности недели
console.log('\n6. Проверка расчета четности недели...');
const parityCheck = calculateWeekParityFromDate(new Date('2026-09-02'), '2026-09-01');
assert(parityCheck.parity === 'odd', 'Первая неделя сентября 2026 — нечётная');

console.log('\n================================================================');
console.log(`ИТОГИ ТЕСТИРОВАНИЯ: УСПЕШНО: ${passed}, ОШИБОК: ${failed}`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
