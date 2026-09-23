import { Lesson } from '../types';
import { getLessonSubgroup, matchesSubgroup } from '../utils/subgroup';

console.log('========================================================================');
console.log('       TEST SUITE: SUBGROUP DETECTION & SCHEDULE FILTERING             ');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passCount++;
    console.log(`  [PASS] ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    failCount++;
    console.error(`  [FAIL] ${label}${detail ? ` (${detail})` : ''}`);
  }
}

// 1. Testing getLessonSubgroup detection
console.log('--- 1. Testing Subgroup Detection (getLessonSubgroup) ---');

const l1Explicit: Partial<Lesson> = { subgroup: 1, subject: 'Основы бурения' };
check('Explicit subgroup: 1', getLessonSubgroup(l1Explicit) === 1);

const l2Explicit: Partial<Lesson> = { subgroup: 2, subject: 'Основы бурения' };
check('Explicit subgroup: 2', getLessonSubgroup(l2Explicit) === 2);

const lWholeExplicit: Partial<Lesson> = { subgroup: undefined, subject: 'Высшая математика' };
check('Explicit whole group (no subgroup field)', getLessonSubgroup(lWholeExplicit) === 0);

// Pattern checks in note
const lNote1: Partial<Lesson> = { note: '1 п/г, принести тетради' };
check('Note contains "1 п/г"', getLessonSubgroup(lNote1) === 1);

const lNote2: Partial<Lesson> = { note: '2-я подгруппа, лаб. 402' };
check('Note contains "2-я подгруппа"', getLessonSubgroup(lNote2) === 2);

const lNoteSubgroup1: Partial<Lesson> = { note: 'подгруппа 1' };
check('Note contains "подгруппа 1"', getLessonSubgroup(lNoteSubgroup1) === 1);

const lNoteSubgroup2: Partial<Lesson> = { note: 'подгруппа 2' };
check('Note contains "подгруппа 2"', getLessonSubgroup(lNoteSubgroup2) === 2);

// Pattern checks in subject
const lSubj1: Partial<Lesson> = { subject: 'Информатика (1 п/г)' };
check('Subject contains "(1 п/г)"', getLessonSubgroup(lSubj1) === 1);

const lSubj2: Partial<Lesson> = { subject: 'Информатика (2 п/г)' };
check('Subject contains "(2 п/г)"', getLessonSubgroup(lSubj2) === 2);

const lSubjFull1: Partial<Lesson> = { subject: 'Физика (1 подгруппа)' };
check('Subject contains "(1 подгруппа)"', getLessonSubgroup(lSubjFull1) === 1);

const lSubjFull2: Partial<Lesson> = { subject: 'Физика (2 подгруппа)' };
check('Subject contains "(2 подгруппа)"', getLessonSubgroup(lSubjFull2) === 2);

// Pattern checks in groups
const lGroup1: Partial<Lesson> = { groups: '3-ИНГТ-110 (1)' };
check('Groups contains "(1)"', getLessonSubgroup(lGroup1) === 1);

const lGroup2: Partial<Lesson> = { groups: '3-ИНГТ-110 (2)' };
check('Groups contains "(2)"', getLessonSubgroup(lGroup2) === 2);

// False positive resilience
const lFalsePos1: Partial<Lesson> = { subject: '110 группа лекция в 1 корпусе' };
check('Does not falsely trigger on 110 or корпус 1', getLessonSubgroup(lFalsePos1) === 0);

const lFalsePos2: Partial<Lesson> = { subject: 'История 21 века' };
check('Does not falsely trigger on 21 века', getLessonSubgroup(lFalsePos2) === 0);

// 2. Testing matchesSubgroup filtering logic
console.log('\n--- 2. Testing Subgroup Matching (matchesSubgroup) ---');

const commonLecture: Lesson = {
  id: 'test-1',
  timeStart: '08:00',
  timeEnd: '09:35',
  subject: 'Философия',
  type: 'Лекции',
  location: 'Корпус 1, ауд. 4',
  teacher: 'Иванов И.И.'
};

const labSubgroup1: Lesson = {
  id: 'test-2',
  timeStart: '09:45',
  timeEnd: '11:20',
  subject: 'Химия нефти (1 п/г)',
  type: 'Лабораторные работы',
  location: 'Корпус 9, ауд. 423',
  teacher: 'Петров П.П.'
};

const labSubgroup2: Lesson = {
  id: 'test-3',
  timeStart: '09:45',
  timeEnd: '11:20',
  subject: 'Химия нефти (2 п/г)',
  type: 'Лабораторные работы',
  location: 'Корпус 9, ауд. 425',
  teacher: 'Сидоров С.С.'
};

// Filter: 0 (All)
check('Filter 0 (All): Common lecture matches', matchesSubgroup(commonLecture, 0));
check('Filter 0 (All): Subgroup 1 lab matches', matchesSubgroup(labSubgroup1, 0));
check('Filter 0 (All): Subgroup 2 lab matches', matchesSubgroup(labSubgroup2, 0));

// Filter: 1 (1st Subgroup)
check('Filter 1: Common lecture matches (attended by everyone)', matchesSubgroup(commonLecture, 1));
check('Filter 1: Subgroup 1 lab matches', matchesSubgroup(labSubgroup1, 1));
check('Filter 1: Subgroup 2 lab DOES NOT match (hidden)', !matchesSubgroup(labSubgroup2, 1));

// Filter: 2 (2nd Subgroup)
check('Filter 2: Common lecture matches (attended by everyone)', matchesSubgroup(commonLecture, 2));
check('Filter 2: Subgroup 1 lab DOES NOT match (hidden)', !matchesSubgroup(labSubgroup1, 2));
check('Filter 2: Subgroup 2 lab matches', matchesSubgroup(labSubgroup2, 2));

// 3. Day Schedule Simulation
console.log('\n--- 3. Testing Day Schedule Filtering Simulation ---');

const sampleDayLessons = [commonLecture, labSubgroup1, labSubgroup2];

const filterAll = sampleDayLessons.filter(l => matchesSubgroup(l, 0));
check('Simulation All: Returns all 3 lessons', filterAll.length === 3);

const filterSub1 = sampleDayLessons.filter(l => matchesSubgroup(l, 1));
check('Simulation Subgroup 1: Returns exactly 2 lessons (Lecture + Lab 1)', 
  filterSub1.length === 2 && filterSub1.some(l => l.id === 'test-1') && filterSub1.some(l => l.id === 'test-2')
);

const filterSub2 = sampleDayLessons.filter(l => matchesSubgroup(l, 2));
check('Simulation Subgroup 2: Returns exactly 2 lessons (Lecture + Lab 2)', 
  filterSub2.length === 2 && filterSub2.some(l => l.id === 'test-1') && filterSub2.some(l => l.id === 'test-3')
);

console.log('\n========================================================================');
console.log(`TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('========================================================================');

if (failCount > 0) {
  process.exit(1);
}
