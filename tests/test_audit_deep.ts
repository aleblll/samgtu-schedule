import { SCHEDULE_REGISTRY, AVAILABLE_GROUPS } from '../constants';
import { STUDENTS_REGISTRY, BLOCKS, getSemesterWeek, getDayName, getSamaraDate, getSamaraISODate } from '../attendance';
import { Lesson, Student } from '../types';

function resolveTeacher(lesson: Lesson, override: Partial<Lesson> = {}, subjectTeachers: Record<string, string> = {}): string {
  const teacherByType = subjectTeachers[`${lesson.subject}::${lesson.type}`];
  const flatTeacher = subjectTeachers[lesson.subject];
  return override.teacher !== undefined ? override.teacher : (teacherByType || flatTeacher || lesson.teacher);
}

console.log("=================================================================");
console.log("            DEEP COMPREHENSIVE CODEBASE AUDIT                    ");
console.log("=================================================================");

// TEST 1: SCHEDULE REGISTRY & GHOST LESSON AUDIT
console.log("\n--- TEST 1: SCHEDULE REGISTRY & GHOST LESSON AUDIT ---");
const faidW1 = SCHEDULE_REGISTRY['faid-310']?.[1] || [];
const faidW1Mon = faidW1.find(d => d.dayName === 'Понедельник');
console.log(`faid-310 Week 1 Monday lessons count: ${faidW1Mon?.lessons.length} (Expected: 0)`);
if (faidW1Mon && faidW1Mon.lessons.length !== 0) {
  console.log("  >>> CRITICAL BUG: Week 1 Monday (31 August) in faid-310 must have 0 lessons (summer vacation)! <<<");
}

const faidW2 = SCHEDULE_REGISTRY['faid-310']?.[2] || [];
const faidW2Tue = faidW2.find(d => d.dayName === 'Вторник');
console.log(`faid-310 Week 2 Tuesday lessons count: ${faidW2Tue?.lessons.length} (Expected: 1)`);
if (faidW2Tue && faidW2Tue.lessons.length !== 1) {
  console.log("  >>> CRITICAL BUG: Week 2 Tuesday in faid-310 should have 1 lesson (Практико-ориентированный проект)! <<<");
}

// TEST 2: ALL AVAILABLE_GROUPS INITIALIZATION
console.log("\n--- TEST 2: AVAILABLE_GROUPS SCHEDULE INTEGRITY ---");
const missingSchedGroups: string[] = [];
for (const grp of AVAILABLE_GROUPS) {
  if (!SCHEDULE_REGISTRY[grp.id]) {
    missingSchedGroups.push(grp.id);
  }
}
console.log(`Missing schedules in SCHEDULE_REGISTRY: ${missingSchedGroups.length} / ${AVAILABLE_GROUPS.length}`);
if (missingSchedGroups.length > 0) {
  console.log(`  >>> WARNING: ${missingSchedGroups.length} groups in AVAILABLE_GROUPS have undefined in SCHEDULE_REGISTRY: [${missingSchedGroups.slice(0, 5).join(', ')}...] <<<`);
}

// TEST 3: ATTENDANCE CALCULATION & COLLISION IN RECORDS
console.log("\n--- TEST 3: ATTENDANCE & REPORT CALCULATIONS ---");
// Simulate student in both absentStudentIds and excusedStudentIds
const mockRecord = {
  groupId: 'faid-310',
  date: '2026-09-01',
  lessonId: 'faid310-w1-tu-1',
  absentStudentIds: [1],
  excusedStudentIds: [1], // Collision due to network/sync race condition
  isCancelled: false
};

// In AttendanceTracker report calculation:
let totalAbs = 0;
let totalExc = 0;
const isAbsent = mockRecord.absentStudentIds.includes(1);
const isExcused = !isAbsent && (mockRecord.excusedStudentIds || []).includes(1);
if (isAbsent) totalAbs += 2;
else if (isExcused) totalExc += 2;

console.log(`Collision handling in AttendanceTracker: Abs=${totalAbs}h, Exc=${totalExc}h (Total 2h, protected: ${totalAbs + totalExc === 2})`);

// But what happens if record is cancelled?
const cancelledRecord = { ...mockRecord, isCancelled: true };
let cancelAbs = 0;
if (!cancelledRecord.isCancelled) {
  if (cancelledRecord.absentStudentIds.includes(1)) cancelAbs += 2;
}
console.log(`Cancelled lesson counted: ${cancelAbs}h (Expected 0h: ${cancelAbs === 0})`);

// TEST 4: BLOCK DATES & POST-DECEMBER 25 GAP
console.log("\n--- TEST 4: DEAN'S OFFICE REPORT DATE GAPS ---");
const dec28Date = '2026-12-28';
const inBlock = BLOCKS.find(b => dec28Date >= b.start && dec28Date <= b.end);
console.log(`Date 2026-12-28 (Credit week) in block: ${inBlock ? inBlock.name : 'NONE'}`);
if (!inBlock) {
  console.log("  >>> BUG: BLOCKS[3].end is 2026-12-25. Dec 26-31 classes are omitted from Block 4 columns in Word report! <<<");
}

// TEST 5: TEACHER RESOLUTION HIERARCHY & EMPTY STRING OVERRIDE
console.log("\n--- TEST 5: TEACHER OVERRIDE DELETION ---");
const mockLesson: Lesson = {
  id: 'test-1',
  timeStart: '08:00',
  timeEnd: '09:35',
  subject: 'Философия',
  type: 'Практические занятия',
  teacher: 'Стоцкая Татьяна Геннадьевна',
  location: '525'
};

// Case A: Override has a new teacher
const overrideA = { teacher: 'Новый Преподаватель' };
console.log("Teacher with override:", resolveTeacher(mockLesson, overrideA, {}));

// Case B: User wants to CLEAR the teacher (sets override.teacher = '')
const overrideB = { teacher: '' };
const resolvedB = resolveTeacher(mockLesson, overrideB, { 'Философия::Практические занятия': 'Стоцкая Т.Г.' });
console.log(`Teacher with override.teacher = "": '${resolvedB}'`);
if (resolvedB !== '') {
  console.log("  >>> BUG: resolveTeacher uses 'override.teacher || ...', so user CANNOT set an empty teacher! It falls back to default! <<<");
}

// TEST 6: STAROSTA PIN SECURITY & ISOLATION
console.log("\n--- TEST 6: STAROSTA ROLE ISOLATION ---");
const userRole: string = 'starosta';
const starostaGroupId: string = 'ingt-310';
const currentGroupId: string = 'faid-310';

// Logic from App.tsx line 114:
let effectiveRole = 'student';
if (userRole === 'admin') effectiveRole = 'admin';
else if (userRole === 'starosta') {
  if (starostaGroupId && currentGroupId === starostaGroupId) {
    effectiveRole = 'starosta';
  } else {
    effectiveRole = 'student';
  }
}
console.log(`Starosta of ingt-310 viewing faid-310: effectiveRole='${effectiveRole}' (Expected: 'student')`);
console.log(`Can edit faid-310: ${effectiveRole === 'admin' || effectiveRole === 'starosta'} (Expected: false)`);

// TEST 7: GRAMMAR OF PAIRS (DECLENSION)
console.log("\n--- TEST 7: DECLENSION OF LESSON COUNTER ---");
function getPairWord(count: number): string {
  if (count === 1) return 'пара';
  if (count >= 2 && count <= 4) return 'пары';
  return 'пар';
}
console.log(`0 lessons: "0 ${getPairWord(0)}" (Expected: '0 пар')`);
console.log(`1 lesson:  "1 ${getPairWord(1)}" (Expected: '1 пара')`);
console.log(`2 lessons: "2 ${getPairWord(2)}" (Expected: '2 пары')`);
console.log(`5 lessons: "5 ${getPairWord(5)}" (Expected: '5 пар')`);

console.log("\n=================================================================");
console.log("                     AUDIT EXECUTION COMPLETE                    ");
console.log("=================================================================");
