import assert from 'node:assert';
import { getLocalBackup, fetchGroupCloudData, pushGroupCloudData } from '../utils/cloudSync';
import { sanitizeSyncPayload, sanitizeStudent } from '../cloudflare-worker.js';
import { Student } from '../types';

console.log('====================================================');
console.log('   STARTING ROSTER (STUDENTS) CLOUD SYNC TESTS');
console.log('====================================================\n');

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string): string | null { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string): void { this.store.set(k, String(v)); }
  removeItem(k: string): void { this.store.delete(k); }
  clear(): void { this.store.clear(); }
}

const deviceAdmin = new MemoryStorage();
const deviceStarosta = new MemoryStorage();
let activeStorage = deviceAdmin;

const storageWrapper = {
  getItem: (k: string) => activeStorage.getItem(k),
  setItem: (k: string, v: string) => activeStorage.setItem(k, v),
  removeItem: (k: string) => activeStorage.removeItem(k),
  clear: () => activeStorage.clear()
};

(globalThis as any).localStorage = storageWrapper;
if (typeof window !== 'undefined') {
  (window as any).localStorage = storageWrapper;
}

// Mock Cloud Bin
let mockCloudAttendanceBin: any = {
  byGroup: {
    'ingt-310': {
      records: [{ docId: 'rec_1', groupId: 'ingt-310', date: '2026-09-01', lessonId: 'l1' }],
      updatedAt: 1000
    }
  }
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url: any, opts: any) => {
  const urlStr = String(url);
  const method = (opts?.method || 'GET').toUpperCase();

  if (urlStr.includes('/sync/attendance') || urlStr.includes('cdaacff')) {
    if (method === 'PUT') {
      const body = JSON.parse(opts.body);
      const payload = typeof body.payload === 'string' ? JSON.parse(body.payload) : body;
      mockCloudAttendanceBin = payload;
      return new Response(JSON.stringify({ status: 0, data: 'OK' }), { status: 200 });
    }
    return new Response(JSON.stringify({ payload: JSON.stringify(mockCloudAttendanceBin), updatedAt: Date.now() }), { status: 200 });
  }

  // Fallback for schedule / homework
  return new Response(JSON.stringify({ payload: JSON.stringify({ byGroup: {} }), updatedAt: Date.now() }), { status: 200 });
};

async function runTests() {
  const testGroupId = 'ingt-313';

  // ----------------------------------------------------
  // TEST 1: Sanitizer validates student structure
  // ----------------------------------------------------
  console.log('>>> 1. Testing Worker Sanitizer for Roster/Students');
  const validStudent = sanitizeStudent({ id: 1, name: '  Тестовый Студент Один  ', maliciousField: true });
  assert.strictEqual(validStudent?.id, 1, 'Valid student ID retained');
  assert.strictEqual(validStudent?.name, 'Тестовый Студент Один', 'Valid student name trimmed');
  assert.strictEqual((validStudent as any)?.maliciousField, undefined, 'Injected field dropped');

  const invalidStudent = sanitizeStudent({ id: 'bad', name: '' });
  assert.strictEqual(invalidStudent, null, 'Invalid student dropped');

  const cleanPayload = sanitizeSyncPayload('attendance', {
    byGroup: {
      'ingt-313': {
        records: [],
        students: [
          { id: 1, name: 'Студент А', injected: 'hack' },
          { id: 'wrong', name: '' }
        ],
        updatedAt: 12345
      }
    }
  });

  const groupStudents = cleanPayload.byGroup['ingt-313'].students;
  assert.strictEqual(groupStudents.length, 1, 'Sanitizer retained only valid students');
  assert.strictEqual(groupStudents[0].name, 'Студент А', 'Student name cleaned');
  assert.strictEqual(groupStudents[0].injected, undefined, 'Hacked field stripped');
  console.log('✅ PASS: Worker sanitization correctly protects student roster.\n');

  // ----------------------------------------------------
  // TEST 2: Device A (Admin) creates and pushes students
  // ----------------------------------------------------
  console.log('>>> 2. Device A (Admin) saves roster locally and pushes to cloud');
  activeStorage = deviceAdmin;

  const initialStudents: Student[] = [
    { id: 1, name: 'Тестовый Студент 1' },
    { id: 2, name: 'Тестовый Студент 2' },
    { id: 3, name: 'Тестовый Студент 3' }
  ];

  deviceAdmin.setItem(`students_${testGroupId}`, JSON.stringify(initialStudents));

  const localBackup = getLocalBackup(testGroupId);
  assert.strictEqual(localBackup.students?.length, 3, 'getLocalBackup returns saved students');

  const pushOk = await pushGroupCloudData({ students: initialStudents }, testGroupId);
  assert.strictEqual(pushOk, true, 'pushGroupCloudData returned true');

  // Verify cloud received students and preserved other groups
  assert(mockCloudAttendanceBin.byGroup['ingt-310'] !== undefined, 'Group ingt-310 was preserved');
  assert(mockCloudAttendanceBin.byGroup[testGroupId] !== undefined, 'Group ingt-313 exists in cloud');
  assert.strictEqual(mockCloudAttendanceBin.byGroup[testGroupId].students.length, 3, 'Cloud has 3 students for ingt-313');
  console.log('✅ PASS: Device A successfully synced roster to cloud.\n');

  // ----------------------------------------------------
  // TEST 3: Device B (Starosta) fetches roster from cloud
  // ----------------------------------------------------
  console.log('>>> 3. Device B (Starosta) cold-starts and fetches roster from cloud');
  activeStorage = deviceStarosta;
  assert.strictEqual(deviceStarosta.getItem(`students_${testGroupId}`), null, 'Device B starts with empty storage');

  const fetched = await fetchGroupCloudData(true, testGroupId);
  assert(fetched !== null, 'fetchGroupCloudData returned data');
  assert.strictEqual(fetched.students?.length, 3, 'fetched.students has 3 students');
  assert.strictEqual(fetched.students[0].name, 'Тестовый Студент 1', 'First student name matches');

  // Verify Device B localStorage was automatically populated
  const savedOnDeviceB = JSON.parse(deviceStarosta.getItem(`students_${testGroupId}`) || '[]');
  assert.strictEqual(savedOnDeviceB.length, 3, 'Device B localStorage was populated from cloud');
  console.log('✅ PASS: Device B successfully received and persisted roster from cloud.\n');

  // ----------------------------------------------------
  // TEST 4: Device B edits a student, pushes, Device A receives
  // ----------------------------------------------------
  console.log('>>> 4. Device B edits student name, pushes, Device A pulls update');
  const updatedStudents: Student[] = [
    { id: 1, name: 'Тестовый Студент 1 (Обновлен)' },
    { id: 2, name: 'Тестовый Студент 2' },
    { id: 3, name: 'Тестовый Студент 3' }
  ];

  deviceStarosta.setItem(`students_${testGroupId}`, JSON.stringify(updatedStudents));
  await pushGroupCloudData({ students: updatedStudents }, testGroupId);

  // Switch to Device A
  activeStorage = deviceAdmin;
  const adminFetched = await fetchGroupCloudData(true, testGroupId);
  assert.strictEqual(adminFetched?.students?.[0].name, 'Тестовый Студент 1 (Обновлен)', 'Device A sees updated name');
  const adminLocal = JSON.parse(deviceAdmin.getItem(`students_${testGroupId}`) || '[]');
  assert.strictEqual(adminLocal[0].name, 'Тестовый Студент 1 (Обновлен)', 'Device A localStorage updated with new name');
  console.log('✅ PASS: Roster edits propagate bidirectionally without data loss.\n');

  // ----------------------------------------------------
  // TEST 5: Pushing attendance records does NOT wipe students
  // ----------------------------------------------------
  console.log('>>> 5. Pushing attendance records preserves existing students in cloud');
  await pushGroupCloudData({
    attendance: [{
      docId: 'rec_att_1',
      groupId: testGroupId,
      date: '2026-09-25',
      lessonId: 'l1',
      absentStudentIds: [1],
      excusedStudentIds: [],
      isCancelled: false
    }]
  }, testGroupId);

  assert.strictEqual(mockCloudAttendanceBin.byGroup[testGroupId].records.length, 1, 'Attendance record saved');
  assert.strictEqual(mockCloudAttendanceBin.byGroup[testGroupId].students.length, 3, 'Students preserved when attendance was pushed');
  console.log('✅ PASS: Atomicity and coexistence of attendance records and student rosters confirmed.\n');

  console.log('====================================================');
  console.log('   ALL ROSTER CLOUD SYNC TESTS PASSED (5/5) 🎉');
  console.log('====================================================\n');
}

try {
  await runTests();
} catch (err) {
  console.error('Test failed:', err);
  process.exit(1);
} finally {
  globalThis.fetch = originalFetch;
}
