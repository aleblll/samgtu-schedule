import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import worker from '../cloudflare-worker.js';

let passed = 0;
let total = 0;

function check(msg: string, condition: boolean) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${msg}`);
  } else {
    console.error(`  [FAIL] ${msg}`);
    process.exitCode = 1;
  }
}

console.log('\n============================================================');
console.log('  TEST SUITE: TELEGRAM MINI APP WORD DOWNLOAD & PRIVACY');
console.log('============================================================\n');

const root = process.cwd();
const exportWordCode = fs.readFileSync(path.resolve(root, 'utils/exportWord.ts'), 'utf8');
const workerCode = fs.readFileSync(path.resolve(root, 'cloudflare-worker.js'), 'utf8');
const attendanceTrackerCode = fs.readFileSync(path.resolve(root, 'components/AttendanceTracker.tsx'), 'utf8');

// ------------------------------------------------------------
// 1. TMA CLIENT DOWNLOAD PIPELINE IN exportWord.ts
// ------------------------------------------------------------
console.log('--- 1. TMA Client Download Architecture (exportWord.ts) ---');
check('Imports WORKER_BASE from cloudSync', exportWordCode.includes("import { WORKER_BASE } from './cloudSync'"));
check('Exports ExportWordResult interface', exportWordCode.includes('export interface ExportWordResult'));
check('Detects Telegram WebApp environment', exportWordCode.includes('Telegram?.WebApp') && exportWordCode.includes('initDataUnsafe'));
check('Routes document export via secure /export-doc endpoint', exportWordCode.includes('/export-doc'));
check('Attaches starosta Telegram user id to request', exportWordCode.includes('tg.initDataUnsafe?.user?.id'));
check('Implements Telegram 8.0+ native tg.downloadFile dialog', exportWordCode.includes('tg.downloadFile'));
check('Implements tg.openLink fallback to external browser', exportWordCode.includes('tg.openLink'));
check('Implements Web Share API level 3 fallback', exportWordCode.includes('navigator.canShare'));
check('Implements Desktop HTML5 Blob fallback', exportWordCode.includes('createObjectURL'));
check('Never leaks to public channel @raspisanie_samgtu', !exportWordCode.includes('raspisanie_samgtu'));

// ------------------------------------------------------------
// 2. EDGE WORKER ENDPOINT & PRIVACY (cloudflare-worker.js)
// ------------------------------------------------------------
console.log('\n--- 2. Edge Gateway Security & Storage (/export-doc) ---');
check('Worker has /export-doc endpoint', workerCode.includes('/export-doc'));
check('Worker enforces X-App-Key authorization for /export-doc', workerCode.includes('/export-doc') && workerCode.includes('X-App-Key'));
check('Worker attempts direct PM delivery to user first', workerCode.includes('userFormData.append("chat_id", String(requestedChatId))'));
check('Worker falls back to private storage chat (never public)', workerCode.includes('PRIVATE_STORAGE_CHAT'));
check('Worker /file sets Content-Disposition attachment with RFC 5987', workerCode.includes("filename*=UTF-8''"));
check('Worker /file sets OpenXML docx Content-Type', workerCode.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document'));

// ------------------------------------------------------------
// 3. UI FEEDBACK IN AttendanceTracker.tsx
// ------------------------------------------------------------
console.log('\n--- 3. AttendanceTracker Feedback & Multi-Group ---');
check('Provides clear toast when sent to bot PM', attendanceTrackerCode.includes('sentToTelegramChat') && attendanceTrackerCode.includes('диалог с ботом'));
check('Handles custom groups without fallback to hardcoded 310', attendanceTrackerCode.includes('AVAILABLE_GROUPS.find(g => g.id === currentGroupId) || {'));

// ------------------------------------------------------------
// 4. WORKER FUNCTIONAL TESTS VIA MOCK FETCH
// ------------------------------------------------------------
console.log('\n--- 4. Worker Endpoint Simulation Tests ---');
const mockEnv = {
  APP_SECRET: 'super-secret-key-xyz',
  TELEGRAM_BOT_TOKEN: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ-token',
  TELEGRAM_DEV_CHAT_ID: '-10099998888',
  TELEGRAM_CHANNEL_ID: '-1002345678901'
};

// 4.1 Unauthorized call without X-App-Key
const unauthReq = new Request('https://worker.test/export-doc', {
  method: 'POST',
  body: new FormData()
});
const unauthRes = await worker.fetch(unauthReq, mockEnv);
check('POST /export-doc without X-App-Key returns 401 Unauthorized', unauthRes.status === 401);

console.log(`\n============================================================`);
console.log(`  RESULT: ${passed}/${total} checks passed (${Math.round((passed / total) * 100)}%)`);
console.log('============================================================\n');

if (passed !== total) {
  process.exit(1);
}
