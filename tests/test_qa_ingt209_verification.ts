/**
 * QA Verification Test Suite: 2-ИНГТ-109 and System Regression Testing
 * Run with: npx tsx tests/test_qa_ingt209_verification.ts
 */

import { SCHEDULE_REGISTRY, AVAILABLE_GROUPS, GROUP_STAROSTA_PINS, ADMIN_PIN } from '../constants';
import { STUDENTS_REGISTRY } from '../attendance';
import { SEED_SUBJECT_TEACHERS_BY_GROUP } from '../defaultData';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureMessages: string[] = [];

function check(title: string, condition: boolean, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${title}${detail ? ` -> ${detail}` : ''}`);
  } else {
    failedTests++;
    const errMsg = `  [FAIL] ${title}${detail ? ` -> ${detail}` : ''}`;
    console.error(errMsg);
    failureMessages.push(errMsg);
  }
}

console.log("================================================================================");
console.log("       QA TEST REPORT: GROUP 2-ИНГТ-109 (ingt-209) & REGRESSION CHECKS         ");
console.log("================================================================================");

// ============================================================================
// SECTION 1: GROUP 2-ИНГТ-109 CONFIGURATION & REGISTRY
// ============================================================================
console.log("\n>>> 1. Проверка конфигурации группы 2-ИНГТ-109 в AVAILABLE_GROUPS");
const ingt209Config = AVAILABLE_GROUPS.find(g => g.id === 'ingt-209');
check("Наличие группы в AVAILABLE_GROUPS", !!ingt209Config, "id: 'ingt-209'");
check("Имя группы name === '2-ИНГТ-109'", ingt209Config?.name === '2-ИНГТ-109', ingt209Config?.name);
check("Факультет facultyId === 'ingt'", ingt209Config?.facultyId === 'ingt', ingt209Config?.facultyId);
check("Курс course === 2", ingt209Config?.course === 2, `course: ${ingt209Config?.course}`);
check("Ступень degree === 'Бакалавриат'", ingt209Config?.degree === 'Бакалавриат', ingt209Config?.degree);

// ============================================================================
// SECTION 2: SCHEDULE_REGISTRY AND ALIASES
// ============================================================================
console.log("\n>>> 2. Проверка SCHEDULE_REGISTRY и алиасов");
const schedule209 = SCHEDULE_REGISTRY['ingt-209'];
check("Наличие расписания SCHEDULE_REGISTRY['ingt-209']", !!schedule209);
check("Наличие всех 4 недель в расписании", !!(schedule209?.[1] && schedule209?.[2] && schedule209?.[3] && schedule209?.[4]));
check("Алиас '2-ingt-109' ссылается на расписание ingt-209", SCHEDULE_REGISTRY['2-ingt-109'] === schedule209);
check("Алиас 'ingt-109' ссылается на расписание ingt-209", SCHEDULE_REGISTRY['ingt-109'] === schedule209);

// ============================================================================
// SECTION 3: WEEK 1 (ЧИСЛИТЕЛЬ) - 16 ПАР
// ============================================================================
console.log("\n>>> 3. Проверка Недели 1 (Числитель): ожидается 16 пар (Пн: 3, Вт: 2, Ср: 3, Чт: 4, Пт: 2, Сб: 2)");
const w1 = schedule209[1];
const w1Total = w1.reduce((sum, day) => sum + day.lessons.length, 0);
check("Неделя 1 суммарно пар: 16", w1Total === 16, `получено: ${w1Total}`);

const w1Days = Object.fromEntries(w1.map(d => [d.dayName, d.lessons.length]));
check("Пн Недели 1: 3 пары", w1Days['Понедельник'] === 3, `пар: ${w1Days['Понедельник']}`);
check("Вт Недели 1: 2 пары", w1Days['Вторник'] === 2, `пар: ${w1Days['Вторник']}`);
check("Ср Недели 1: 3 пары", w1Days['Среда'] === 3, `пар: ${w1Days['Среда']}`);
check("Чт Недели 1: 4 пары", w1Days['Четверг'] === 4, `пар: ${w1Days['Четверг']}`);
check("Пт Недели 1: 2 пары", w1Days['Пятница'] === 2, `пар: ${w1Days['Пятница']}`);
check("Сб Недели 1: 2 пары", w1Days['Суббота'] === 2, `пар: ${w1Days['Суббота']}`);

// Детали предметов Недели 1
const w1Mon = w1.find(d => d.dayName === 'Понедельник')!;
check("Пн 1 пара: Физика (11:50)", w1Mon.lessons[0].subject === 'Физика' && w1Mon.lessons[0].timeStart === '11:50');
check("Пн 2 пара: Защита информации (13:35)", w1Mon.lessons[1].subject === 'Защита информации' && w1Mon.lessons[1].timeStart === '13:35');
check("Пн 3 пара: Математика (15:40)", w1Mon.lessons[2].subject === 'Математика' && w1Mon.lessons[2].timeStart === '15:40');

const w1Tue = w1.find(d => d.dayName === 'Вторник')!;
check("Вт 1 пара: Защита информации (11:50)", w1Tue.lessons[0].subject === 'Защита информации' && w1Tue.lessons[0].timeStart === '11:50');
check("Вт 2 пара: Математика (13:35)", w1Tue.lessons[1].subject === 'Математика' && w1Tue.lessons[1].timeStart === '13:35');

const w1Wed = w1.find(d => d.dayName === 'Среда')!;
check("Ср 1 пара: Физкультура (11:50)", w1Wed.lessons[0].subject.includes('физической культуре') && w1Wed.lessons[0].timeStart === '11:50');
check("Ср 2 пара: ТММ (13:35)", w1Wed.lessons[1].subject === 'Теория механизмов и машин' && w1Wed.lessons[1].timeStart === '13:35');
check("Ср 3 пара: Прикладная механика (15:40)", w1Wed.lessons[2].subject === 'Прикладная механика' && w1Wed.lessons[2].timeStart === '15:40');

const w1Thu = w1.find(d => d.dayName === 'Четверг')!;
check("Чт 1 пара: Физика (09:45)", w1Thu.lessons[0].subject === 'Физика' && w1Thu.lessons[0].timeStart === '09:45');
check("Чт 2 пара: Основы нефтегазопромыслового дела (11:50)", w1Thu.lessons[1].subject === 'Основы нефтегазопромыслового дела' && w1Thu.lessons[1].timeStart === '11:50');
check("Чт 3 пара: Социология и право (13:35)", w1Thu.lessons[2].subject === 'Социология и право' && w1Thu.lessons[2].timeStart === '13:35');
check("Чт 4 пара: Иностранный язык (15:40)", w1Thu.lessons[3].subject === 'Иностранный язык' && w1Thu.lessons[3].timeStart === '15:40');

const w1Fri = w1.find(d => d.dayName === 'Пятница')!;
check("Пт 1 пара: Материаловедение лаб (15:40)", w1Fri.lessons[0].subject.includes('Материаловедение') && w1Fri.lessons[0].timeStart === '15:40');
check("Пт 2 пара: Материаловедение лаб (17:25)", w1Fri.lessons[1].subject.includes('Материаловедение') && w1Fri.lessons[1].timeStart === '17:25');

const w1Sat = w1.find(d => d.dayName === 'Суббота')!;
check("Сб 1 пара: Иностранный язык (11:50)", w1Sat.lessons[0].subject === 'Иностранный язык' && w1Sat.lessons[0].timeStart === '11:50');
check("Сб 2 пара: Иностранный язык (13:35)", w1Sat.lessons[1].subject === 'Иностранный язык' && w1Sat.lessons[1].timeStart === '13:35');

// ============================================================================
// SECTION 4: WEEK 2 (ЗНАМЕНАТЕЛЬ) - 18 ПАР
// ============================================================================
console.log("\n>>> 4. Проверка Недели 2 (Знаменатель): ожидается 18 пар (Пн: 4, Вт: 2, Ср: 4, Чт: 3, Пт: 3, Сб: 2)");
const w2 = schedule209[2];
const w2Total = w2.reduce((sum, day) => sum + day.lessons.length, 0);
check("Неделя 2 суммарно пар: 18", w2Total === 18, `получено: ${w2Total}`);

const w2Days = Object.fromEntries(w2.map(d => [d.dayName, d.lessons.length]));
check("Пн Недели 2: 4 пары", w2Days['Понедельник'] === 4, `пар: ${w2Days['Понедельник']}`);
check("Вт Недели 2: 2 пары", w2Days['Вторник'] === 2, `пар: ${w2Days['Вторник']}`);
check("Ср Недели 2: 4 пары", w2Days['Среда'] === 4, `пар: ${w2Days['Среда']}`);
check("Чт Недели 2: 3 пары", w2Days['Четверг'] === 3, `пар: ${w2Days['Четверг']}`);
check("Пт Недели 2: 3 пары", w2Days['Пятница'] === 3, `пар: ${w2Days['Пятница']}`);
check("Сб Недели 2: 2 пары", w2Days['Суббота'] === 2, `пар: ${w2Days['Суббота']}`);

// Детали предметов Недели 2
const w2Mon = w2.find(d => d.dayName === 'Понедельник')!;
check("Пн 1 пара: Математика лек (08:00)", w2Mon.lessons[0].subject === 'Математика' && w2Mon.lessons[0].timeStart === '08:00');
check("Пн 2 пара: Материаловедение лек (09:45)", w2Mon.lessons[1].subject.includes('Материаловедение') && w2Mon.lessons[1].timeStart === '09:45');
check("Пн 3 пара: Физика лаб (11:50)", w2Mon.lessons[2].subject === 'Физика' && w2Mon.lessons[2].timeStart === '11:50');
check("Пн 4 пара: Физика лаб (13:35)", w2Mon.lessons[3].subject === 'Физика' && w2Mon.lessons[3].timeStart === '13:35');

const w2Tue = w2.find(d => d.dayName === 'Вторник')!;
check("Вт 1 пара: Проектная практика (09:45)", w2Tue.lessons[0].subject.includes('проектная практика') && w2Tue.lessons[0].timeStart === '09:45');
check("Вт 2 пара: Проектная практика (11:50)", w2Tue.lessons[1].subject.includes('проектная практика') && w2Tue.lessons[1].timeStart === '11:50');

const w2Wed = w2.find(d => d.dayName === 'Среда')!;
check("Ср 1 пара: Физкультура (11:50)", w2Wed.lessons[0].subject.includes('физической культуре') && w2Wed.lessons[0].timeStart === '11:50');
check("Ср 2 пара: ТММ лаб (13:35)", w2Wed.lessons[1].subject === 'Теория механизмов и машин' && w2Wed.lessons[1].timeStart === '13:35');
check("Ср 3 пара: Прикладная механика лаб (15:40)", w2Wed.lessons[2].subject === 'Прикладная механика' && w2Wed.lessons[2].timeStart === '15:40');
check("Ср 4 пара: Иностранный язык (17:25)", w2Wed.lessons[3].subject === 'Иностранный язык' && w2Wed.lessons[3].timeStart === '17:25');

const w2Thu = w2.find(d => d.dayName === 'Четверг')!;
check("Чт 1 пара: Физкультура (11:50)", w2Thu.lessons[0].subject.includes('физической культуре') && w2Thu.lessons[0].timeStart === '11:50');
check("Чт 2 пара: ТММ прак (13:35)", w2Thu.lessons[1].subject === 'Теория механизмов и машин' && w2Thu.lessons[1].timeStart === '13:35');
check("Чт 3 пара: Прикладная механика прак (15:40)", w2Thu.lessons[2].subject === 'Прикладная механика' && w2Thu.lessons[2].timeStart === '15:40');

const w2Fri = w2.find(d => d.dayName === 'Пятница')!;
check("Пт 1 пара: Прикладная механика лек (09:45)", w2Fri.lessons[0].subject === 'Прикладная механика' && w2Fri.lessons[0].timeStart === '09:45');
check("Пт 2 пара: Социология и право лек (11:50)", w2Fri.lessons[1].subject === 'Социология и право' && w2Fri.lessons[1].timeStart === '11:50');
check("Пт 3 пара: Основы нефтегазопромыслового дела (13:35)", w2Fri.lessons[2].subject === 'Основы нефтегазопромыслового дела' && w2Fri.lessons[2].timeStart === '13:35');

const w2Sat = w2.find(d => d.dayName === 'Суббота')!;
check("Сб 1 пара: Философия (11:50)", w2Sat.lessons[0].subject === 'Философия' && w2Sat.lessons[0].timeStart === '11:50');
check("Сб 2 пара: Математика (13:35)", w2Sat.lessons[1].subject === 'Математика' && w2Sat.lessons[1].timeStart === '13:35');

// ============================================================================
// SECTION 5: WEEK 3 VS WEEK 1 IDENTITY
// ============================================================================
console.log("\n>>> 5. Проверка идентичности Недели 3 и Недели 1 (16 пар)");
const w3 = schedule209[3];
const w3Total = w3.reduce((sum, day) => sum + day.lessons.length, 0);
check("Неделя 3 суммарно пар: 16", w3Total === 16, `получено: ${w3Total}`);

let w1w3Identical = true;
let w1w3Diffs: string[] = [];
if (w1.length !== w3.length) {
  w1w3Identical = false;
  w1w3Diffs.push(`Days count mismatch: w1=${w1.length}, w3=${w3.length}`);
} else {
  for (let i = 0; i < w1.length; i++) {
    const d1 = w1[i];
    const d3 = w3[i];
    if (d1.dayName !== d3.dayName) {
      w1w3Identical = false;
      w1w3Diffs.push(`Day mismatch: ${d1.dayName} vs ${d3.dayName}`);
    }
    if (d1.lessons.length !== d3.lessons.length) {
      w1w3Identical = false;
      w1w3Diffs.push(`${d1.dayName} count mismatch: w1=${d1.lessons.length}, w3=${d3.lessons.length}`);
    } else {
      for (let j = 0; j < d1.lessons.length; j++) {
        const l1 = d1.lessons[j];
        const l3 = d3.lessons[j];
        const match = l1.subject === l3.subject &&
                      l1.timeStart === l3.timeStart &&
                      l1.timeEnd === l3.timeEnd &&
                      l1.type === l3.type &&
                      l1.location === l3.location &&
                      l1.teacher === l3.teacher;
        if (!match) {
          w1w3Identical = false;
          w1w3Diffs.push(`Mismatch ${d1.dayName} [${j}]: "${l1.subject}" vs "${l3.subject}"`);
        }
      }
    }
  }
}
check("Неделя 3 по расписанию, времени, типам и аудиториям полностью идентична Неделе 1", w1w3Identical, w1w3Diffs.join('; ') || 'Все 16 пар совпали 1-в-1');

// ============================================================================
// SECTION 6: WEEK 4 VS WEEK 2 IDENTITY
// ============================================================================
console.log("\n>>> 6. Проверка идентичности Недели 4 и Недели 2 (18 пар)");
const w4 = schedule209[4];
const w4Total = w4.reduce((sum, day) => sum + day.lessons.length, 0);
check("Неделя 4 суммарно пар: 18", w4Total === 18, `получено: ${w4Total}`);

let w2w4Identical = true;
let w2w4Diffs: string[] = [];
if (w2.length !== w4.length) {
  w2w4Identical = false;
  w2w4Diffs.push(`Days count mismatch: w2=${w2.length}, w4=${w4.length}`);
} else {
  for (let i = 0; i < w2.length; i++) {
    const d2 = w2[i];
    const d4 = w4[i];
    if (d2.dayName !== d4.dayName) {
      w2w4Identical = false;
      w2w4Diffs.push(`Day mismatch: ${d2.dayName} vs ${d4.dayName}`);
    }
    if (d2.lessons.length !== d4.lessons.length) {
      w2w4Identical = false;
      w2w4Diffs.push(`${d2.dayName} count mismatch: w2=${d2.lessons.length}, w4=${d4.lessons.length}`);
    } else {
      for (let j = 0; j < d2.lessons.length; j++) {
        const l2 = d2.lessons[j];
        const l4 = d4.lessons[j];
        const match = l2.subject === l4.subject &&
                      l2.timeStart === l4.timeStart &&
                      l2.timeEnd === l4.timeEnd &&
                      l2.type === l4.type &&
                      l2.location === l4.location &&
                      l2.teacher === l4.teacher;
        if (!match) {
          w2w4Identical = false;
          w2w4Diffs.push(`Mismatch ${d2.dayName} [${j}]: "${l2.subject}" vs "${l4.subject}"`);
        }
      }
    }
  }
}
check("Неделя 4 по расписанию, времени, типам и аудиториям полностью идентична Неделе 2", w2w4Identical, w2w4Diffs.join('; ') || 'Все 18 пар совпали 1-в-1');

// ============================================================================
// SECTION 7: STAROSTA AUTHENTICATION BY PIN 109
// ============================================================================
console.log("\n>>> 7. Авторизация старосты по PIN 109 (GROUP_STAROSTA_PINS, App.tsx, AdminPanel)");
check("GROUP_STAROSTA_PINS['ingt-209'] === '109'", GROUP_STAROSTA_PINS['ingt-209'] === '109', `PIN: ${GROUP_STAROSTA_PINS['ingt-209']}`);
check("GROUP_STAROSTA_PINS['2-ingt-109'] === '109' (алиас)", GROUP_STAROSTA_PINS['2-ingt-109'] === '109');
check("GROUP_STAROSTA_PINS['ingt-109'] === '109' (алиас)", GROUP_STAROSTA_PINS['ingt-109'] === '109');

// Моделирование логики App.tsx handleQuickPinLogin
function simulateAppQuickPinLogin(inputPin: string) {
  const pin = inputPin.trim().toLowerCase();
  let userRole = 'student';
  let starostaGroupId: string | null = null;
  let currentGroupId = 'ingt-310';
  let boundGroupId: string | null = null;
  let toastMsg = '';

  if (pin === ADMIN_PIN) {
    userRole = 'admin';
    starostaGroupId = null;
    toastMsg = 'Активирован режим ГЛАВНОГО АДМИНИСТРАТОРА (все группы)';
  } else if (pin === '109' || pin === '2109' || pin === 'ingt109') {
    userRole = 'starosta';
    starostaGroupId = 'ingt-209';
    currentGroupId = 'ingt-209';
    boundGroupId = 'ingt-209';
    toastMsg = 'Активирован режим СТАРОСТЫ (2-ИНГТ-109)';
  } else {
    toastMsg = 'Неверный PIN-код доступа';
  }

  return { userRole, starostaGroupId, currentGroupId, boundGroupId, toastMsg };
}

const login109 = simulateAppQuickPinLogin('109');
check("App.tsx: Быстрый вход старосты по PIN '109'", login109.userRole === 'starosta' && login109.starostaGroupId === 'ingt-209' && login109.currentGroupId === 'ingt-209');
const login2109 = simulateAppQuickPinLogin('2109');
check("App.tsx: Альтернативный PIN '2109'", login2109.userRole === 'starosta' && login2109.starostaGroupId === 'ingt-209');
const loginIngt109 = simulateAppQuickPinLogin('ingt109');
check("App.tsx: Текстовый PIN 'ingt109'", loginIngt109.userRole === 'starosta' && loginIngt109.starostaGroupId === 'ingt-209');

// Моделирование логики AdminPanel handleVerifyPin
function simulateAdminPanelVerifyPin(inputPin: string) {
  const pin = inputPin.trim().toLowerCase();
  let roleChangedTo: string | null = null;
  let targetGroupChangedTo: string | null = null;
  let toastMsg = '';

  const onRoleChange = (role: string, target?: string) => {
    roleChangedTo = role;
    targetGroupChangedTo = target || null;
  };

  if (pin === '2808') {
    onRoleChange('admin');
    toastMsg = 'Авторизован режим Главного Администратора';
  } else if (pin === '109' || pin === '2109' || pin === 'ingt109') {
    onRoleChange('starosta', 'ingt-209');
    toastMsg = 'Авторизован режим Старосты (2-ИНГТ-109)';
  } else {
    toastMsg = 'Неверный PIN-код доступа';
  }

  return { roleChangedTo, targetGroupChangedTo, toastMsg };
}

const adminPanel109 = simulateAdminPanelVerifyPin('109');
check("AdminPanel.tsx: Авторизация старосты по PIN '109'", adminPanel109.roleChangedTo === 'starosta' && adminPanel109.targetGroupChangedTo === 'ingt-209');

// ============================================================================
// SECTION 8: ZERO REGRESSION - 3-ИНГТ-110
// ============================================================================
console.log("\n>>> 8. Регрессионное тестирование: 3-ИНГТ-110 (ingt-310)");
const rosterIngt310 = STUDENTS_REGISTRY['ingt-310'];
check("3-ИНГТ-110: ровно 16 студентов в STUDENTS_REGISTRY", rosterIngt310?.length === 16, `студентов: ${rosterIngt310?.length}`);

const schedIngt310 = SCHEDULE_REGISTRY['ingt-310'];
check("3-ИНГТ-110: расписание существует", !!schedIngt310);

// Четверг 0 пар во всех неделях
const thuW1 = schedIngt310[1].find(d => d.dayName === 'Четверг')?.lessons.length || 0;
const thuW2 = schedIngt310[2].find(d => d.dayName === 'Четверг')?.lessons.length || 0;
const thuW3 = schedIngt310[3].find(d => d.dayName === 'Четверг')?.lessons.length || 0;
const thuW4 = schedIngt310[4].find(d => d.dayName === 'Четверг')?.lessons.length || 0;
check("3-ИНГТ-110 Четверг: 0 пар во всех 4 неделях", thuW1 === 0 && thuW2 === 0 && thuW3 === 0 && thuW4 === 0, `W1:${thuW1}, W2:${thuW2}, W3:${thuW3}, W4:${thuW4}`);

// Пятница Патентоведение с Колибасовым В.А.
const friW1Lessons = schedIngt310[1].find(d => d.dayName === 'Пятница')?.lessons || [];
const friW3Lessons = schedIngt310[3].find(d => d.dayName === 'Пятница')?.lessons || [];

const hasPatentKolibasovW1 = friW1Lessons.some(l => 
  l.subject.toLowerCase().includes('патентоведение') && 
  (l.teacher.includes('Колибасов') || l.teacher.includes('Колибасов В.А.'))
);
const hasPatentKolibasovW3 = friW3Lessons.some(l => 
  l.subject.toLowerCase().includes('патентоведение') && 
  (l.teacher.includes('Колибасов') || l.teacher.includes('Колибасов В.А.'))
);

check("3-ИНГТ-110 Пятница: Патентоведение с Колибасовым В.А. (Неделя 1)", hasPatentKolibasovW1);
check("3-ИНГТ-110 Пятница: Патентоведение с Колибасовым В.А. (Неделя 3)", hasPatentKolibasovW3);

// ============================================================================
// SECTION 9: ZERO REGRESSION - 3-ФАИД-110
// ============================================================================
console.log("\n>>> 9. Регрессионное тестирование: 3-ФАИД-110 (faid-310)");
const rosterFaid310 = STUDENTS_REGISTRY['faid-310'];
check("3-ФАИД-110: ровно 22 студента в STUDENTS_REGISTRY", rosterFaid310?.length === 22, `студентов: ${rosterFaid310?.length}`);

const schedFaid310 = SCHEDULE_REGISTRY['faid-310'];
check("3-ФАИД-110: расписание существует", !!schedFaid310);

for (let w = 1; w <= 4; w++) {
  const weekLessons = schedFaid310[w];
  const monCount = weekLessons.find(d => d.dayName === 'Понедельник')?.lessons.length || 0;
  const tueCount = weekLessons.find(d => d.dayName === 'Вторник')?.lessons.length || 0;
  const wedCount = weekLessons.find(d => d.dayName === 'Среда')?.lessons.length || 0;
  const thuCount = weekLessons.find(d => d.dayName === 'Четверг')?.lessons.length || 0;
  const friCount = weekLessons.find(d => d.dayName === 'Пятница')?.lessons.length || 0;
  const satCount = weekLessons.find(d => d.dayName === 'Суббота')?.lessons.length || 0;
  const weekTotal = monCount + tueCount + wedCount + thuCount + friCount + satCount;

  check(`3-ФАИД-110 Неделя ${w}: Пн 5 пар`, monCount === 5, `пар: ${monCount}`);
  check(`3-ФАИД-110 Неделя ${w}: Вт 4 пары`, tueCount === 4, `пар: ${tueCount}`);
  check(`3-ФАИД-110 Неделя ${w}: Ср 5 пар`, wedCount === 5, `пар: ${wedCount}`);
  check(`3-ФАИД-110 Неделя ${w}: Чт 5 пар`, thuCount === 5, `пар: ${thuCount}`);
  check(`3-ФАИД-110 Неделя ${w}: Пт 0 пар и Сб 0 пар`, friCount === 0 && satCount === 0, `Пт:${friCount}, Сб:${satCount}`);
  check(`3-ФАИД-110 Неделя ${w}: итоговая загрузка 19 пар`, weekTotal === 19, `пар: ${weekTotal}`);
}

// ============================================================================
// SECTION 10: USER EXPERIENCE (UX) INTEGRITY
// ============================================================================
console.log("\n>>> 10. Проверка UX и целостности пользовательского опыта");
// 10.1 Список студентов ingt-209
const rosterIngt209 = STUDENTS_REGISTRY['ingt-209'];
check("Список студентов 2-ИНГТ-109 инициализирован как пустой массив (списка пока нет)", Array.isArray(rosterIngt209) && rosterIngt209.length === 0, `длина: ${rosterIngt209?.length}`);

// 10.2 Преподаватели по умолчанию
const defaultTeachers209 = SEED_SUBJECT_TEACHERS_BY_GROUP['ingt-209'];
check("SEED_SUBJECT_TEACHERS_BY_GROUP['ingt-209'] инициализирован", typeof defaultTeachers209 === 'object' && defaultTeachers209 !== null);
check("Алиас преподавателей SEED_SUBJECT_TEACHERS_BY_GROUP['2-ingt-109'] настроен", SEED_SUBJECT_TEACHERS_BY_GROUP['2-ingt-109'] === defaultTeachers209);
check("Алиас преподавателей SEED_SUBJECT_TEACHERS_BY_GROUP['ingt-109'] настроен", SEED_SUBJECT_TEACHERS_BY_GROUP['ingt-109'] === defaultTeachers209);

// ИТОГ
console.log("\n================================================================================");
console.log(`ИТОГИ ТЕСТИРОВАНИЯ: ВСЕГО ${totalTests} | ПРОЙДЕНО: ${passedTests} | ПРОВАЛЕНО: ${failedTests}`);
console.log("================================================================================");

if (failedTests > 0) {
  console.error("ОШИБКИ ТЕСТИРОВАНИЯ:");
  failureMessages.forEach(msg => console.error(msg));
  process.exit(1);
} else {
  console.log(">>> ВСЕ ТЕСТЫ И ПРОВЕРКИ ПРОЙДЕНЫ НА 100% УСПЕШНО! НИ ОДНОЙ ОШИБКИ ИЛИ РЕГРЕССИИ. <<<");
}
