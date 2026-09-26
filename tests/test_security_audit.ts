import fs from 'fs';
import path from 'path';
import worker, {
  sanitizeHomeworkItem,
  sanitizeScheduleOverride,
  clearWorkerRateLimits
} from '../cloudflare-worker.js';
import { verifyPinCode, ADMIN_PIN_HASH, GROUP_STAROSTA_PIN_HASHES } from '../utils/auth';

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${msg}`);
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    process.exitCode = 1;
  }
}

console.log('\n============================================================');
console.log('  SECURITY AUDIT & PENETRATION TEST SUITE (STEP 1)');
console.log('============================================================\n');

// ------------------------------------------------------------
// TEST 1: WORKER ACCESS CONTROL & X-APP-KEY GATEWAY LOCKDOWN
// ------------------------------------------------------------
console.log('--- 1. Cloudflare Worker Authorization Gateway & Rate Limits ---');

const mockEnv = {
  APP_SECRET: 'test-secret-key-12345',
  TELEGRAM_BOT_TOKEN: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ-mock-token',
  TELEGRAM_CHANNEL_ID: '-1002345678901',
  MAINTENANCE_MODE: 'true',
  MAINTENANCE_MESSAGE: 'Плановые регламентные работы',
  MAINTENANCE_UNTIL: '15 минут'
};

// 1.1 Test PUT /sync/homework without X-App-Key (Should be 401 Unauthorized)
const unauthSyncReq = new Request('https://worker.test/sync/homework', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items: [] })
});
const unauthSyncRes = await worker.fetch(unauthSyncReq, mockEnv);
assert(unauthSyncRes.status === 401, `PUT /sync/homework without X-App-Key returns 401 Unauthorized (got ${unauthSyncRes.status})`);

// 1.2 Test PUT /sync/homework with invalid X-App-Key
const badKeySyncReq = new Request('https://worker.test/sync/homework', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Key': 'attacker-forged-key'
  },
  body: JSON.stringify({ items: [] })
});
const badKeySyncRes = await worker.fetch(badKeySyncReq, mockEnv);
assert(badKeySyncRes.status === 401, `PUT /sync/homework with forged X-App-Key returns 401 Unauthorized (got ${badKeySyncRes.status})`);

// 1.2b Test GET /sync/homework without X-App-Key (KV lockdown)
const unauthGetSyncReq = new Request('https://worker.test/sync/homework?groupId=ingt-310', { method: 'GET' });
const unauthGetSyncRes = await worker.fetch(unauthGetSyncReq, mockEnv);
assert(unauthGetSyncRes.status === 401, `GET /sync/homework without X-App-Key returns 401 Unauthorized (got ${unauthGetSyncRes.status})`);

// 1.2c Test GET /admin/migrate-to-kv without X-App-Key
const unauthMigrateReq = new Request('https://worker.test/admin/migrate-to-kv', { method: 'GET' });
const unauthMigrateRes = await worker.fetch(unauthMigrateReq, mockEnv);
assert(unauthMigrateRes.status === 401, `GET /admin/migrate-to-kv without X-App-Key returns 401 Unauthorized (got ${unauthMigrateRes.status})`);

// 1.2d Test GET /sync/homework with invalid groupId format (Anti-Injection)
const invalidGroupEnv = { ...mockEnv, APP_DATA: { get: async () => null, put: async () => {} } };
const invalidGroupReq = new Request('https://worker.test/sync/homework?groupId=bad%20group!', {
  method: 'GET',
  headers: { 'X-App-Key': mockEnv.APP_SECRET }
});
const invalidGroupRes = await worker.fetch(invalidGroupReq, invalidGroupEnv);
assert(invalidGroupRes.status === 400, `GET /sync/homework with malformed groupId returns 400 Bad Request (got ${invalidGroupRes.status})`);

// 1.3 Test POST /upload without X-App-Key
const unauthUploadReq = new Request('https://worker.test/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const unauthUploadRes = await worker.fetch(unauthUploadReq, mockEnv);
assert(unauthUploadRes.status === 401, `POST /upload without X-App-Key returns 401 Unauthorized (got ${unauthUploadRes.status})`);

// 1.4 Test POST /notify without X-App-Key
const unauthNotifyReq = new Request('https://worker.test/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Attacker notification' })
});
const unauthNotifyRes = await worker.fetch(unauthNotifyReq, mockEnv);
assert(unauthNotifyRes.status === 401, `POST /notify without X-App-Key returns 401 Unauthorized (got ${unauthNotifyRes.status})`);

// 1.5 Test GET /status or GET /maintenance (Public health check)
const statusReq = new Request('https://worker.test/status', { method: 'GET' });
const statusRes = await worker.fetch(statusReq, mockEnv);
assert(statusRes.status === 200, `GET /status returns 200 OK (got ${statusRes.status})`);
const statusData = await statusRes.json();
assert(statusData.ok === true && statusData.maintenance === true, `GET /status returns accurate maintenance status`);
assert(statusData.message === 'Плановые регламентные работы', `GET /status returns correct maintenance message`);

// ------------------------------------------------------------
// TEST 2: STAROSTA DOCX EXPORT PRIVACY & LOCAL-ONLY RETRIEVAL
// ------------------------------------------------------------
console.log('\n--- 2. Starosta Document Export Privacy & Direct Download ---');

const exportWordFilePath = path.resolve(process.cwd(), 'utils/exportWord.ts');
const exportWordCode = fs.readFileSync(exportWordFilePath, 'utf8');

const hasSecureExportGateway = exportWordCode.includes('/export-doc') && exportWordCode.includes('fetch');
assert(hasSecureExportGateway, 'exportWord.ts uses secure /export-doc gateway with live fallback');

const hasPublicChannelPost = exportWordCode.includes('raspisanie_samgtu');
assert(!hasPublicChannelPost, 'exportWord.ts does NOT link or redirect to @raspisanie_samgtu public channel');

const hasNativeDownload = exportWordCode.includes('downloadFile') || exportWordCode.includes('a.download');
assert(hasNativeDownload, 'exportWord.ts implements direct local download (Telegram downloadFile / HTML5 download)');

// ------------------------------------------------------------
// TEST 3: SCAN REPOSITORY FOR SENSITIVE SECRETS & TOKEN LEAKS
// ------------------------------------------------------------
console.log('\n--- 3. Static Secret Leak Scanner ---');

const botTokenPattern = /bot[0-9]{8,10}:[a-zA-Z0-9_-]{35}/;
const filesToCheck = [
  'App.tsx',
  'cloudflare-worker.js',
  'utils/cloudSync.ts',
  'utils/exportWord.ts',
  'utils/auth.ts',
  'components/BugReportModal.tsx',
  'components/MaintenanceScreen.tsx',
  'components/AdminPanel.tsx'
];

let leakDetected = false;
for (const relFile of filesToCheck) {
  const fullPath = path.resolve(process.cwd(), relFile);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    // Ensure no hardcoded Telegram bot token in code
    if (botTokenPattern.test(content)) {
      console.error(`  🚨 LEAK: Hardcoded bot token found in ${relFile}`);
      leakDetected = true;
    }
  }
}
assert(!leakDetected, 'No hardcoded Telegram bot tokens detected in source files');

// ------------------------------------------------------------
// TEST 4: DTO WHITELIST SANITIZATION & XSS / INJECTION DEFENSE
// ------------------------------------------------------------
console.log('\n--- 4. Mass-Assignment & DTO Sanitization Defense ---');

// 4.1 Injection & prototype pollution test on homework item
const maliciousHomework = {
  id: 'hw_999',
  groupId: 'ingt-310',
  subject: '<script>alert("xss")</script>Физика',
  title: 'Задание 1',
  description: 'A'.repeat(10000), // Oversized description DOS attempt
  isAdmin: true,                  // Mass assignment injection attempt
  __proto__: { hacked: true }
};

const sanitizedHw = sanitizeHomeworkItem(maliciousHomework, 'ingt-310');
assert(sanitizedHw !== null, 'Sanitizer successfully handled payload');
assert(sanitizedHw.description.length <= 4000, `Oversized homework description truncated to max 4000 chars (got ${sanitizedHw.description.length})`);
assert((sanitizedHw as any).isAdmin === undefined, 'Mass assignment field "isAdmin" safely dropped by whitelist sanitizer');

// 4.2 Malicious schedule override test
const maliciousOverride = {
  subject: 'Химия',
  teacher: 'Иванов И.И.',
  role: 'superadmin',       // Injection attempt
  token: 'stolen_token',   // Injection attempt
  note: '<img src=x onerror=alert(1)>'
};
const sanitizedOv = sanitizeScheduleOverride(maliciousOverride);
assert(sanitizedOv !== null, 'Sanitize schedule override returned clean object');
assert((sanitizedOv as any).role === undefined, 'Injected "role" field dropped');
assert((sanitizedOv as any).token === undefined, 'Injected "token" field dropped');
assert(sanitizedOv.teacher === 'Иванов И.И.', 'Valid teacher field retained');

// ------------------------------------------------------------
// TEST 5: CRYPTOGRAPHIC PIN AUTHENTICATION & EMERGENCY BYPASS
// ------------------------------------------------------------
console.log('\n--- 5. Cryptographic PIN Verification & Security ---');

// 5.1 Admin PIN verification
const adminAuth = await verifyPinCode('94726108');
assert(adminAuth !== null && adminAuth.role === 'admin', 'Admin PIN (94726108) authenticates with admin role');

// 5.2 Starosta PIN verification
const starostaAuth = await verifyPinCode('839124');
assert(starostaAuth !== null && starostaAuth.role === 'starosta' && starostaAuth.targetGroupId === 'ingt-310', 'Starosta PIN (839124) authenticates 3-ИНГТ-110');

// 5.3 Starosta PIN 311 verification
const starosta311Auth = await verifyPinCode('572916');
assert(starosta311Auth !== null && starosta311Auth.role === 'starosta' && starosta311Auth.targetGroupId === 'ingt-311', 'Starosta PIN (572916) authenticates 3-ИНГТ-111');

// 5.3b Starosta PIN 2-ИНГТ-110 & 3-ИНГТ-113 verification
const starosta210Auth = await verifyPinCode('618342');
assert(starosta210Auth !== null && starosta210Auth.role === 'starosta' && starosta210Auth.targetGroupId === 'ingt-210', 'Starosta PIN (618342) authenticates 2-ИНГТ-110');

const starosta313Auth = await verifyPinCode('482915');
assert(starosta313Auth !== null && starosta313Auth.role === 'starosta' && starosta313Auth.targetGroupId === 'ingt-313', 'Starosta PIN (482915) authenticates 3-ИНГТ-113');

// 5.4 Reject arbitrary PIN
const bruteForcePin = await verifyPinCode('123456');
assert(bruteForcePin === null, 'Unauthorized PIN "123456" rejected (returns null)');

// 5.5 Verify auth.ts only stores SHA-256 hashes, not plaintext PINs
const authFileContent = fs.readFileSync(path.resolve(process.cwd(), 'utils/auth.ts'), 'utf8');
assert(!authFileContent.includes("'94726108'"), 'Plaintext admin PIN 94726108 NOT stored in utils/auth.ts');
assert(!authFileContent.includes("'839124'"), 'Plaintext starosta PIN 839124 NOT stored in utils/auth.ts');
assert(!authFileContent.includes("'572916'"), 'Plaintext starosta PIN 572916 NOT stored in utils/auth.ts');
assert(!authFileContent.includes("'618342'"), 'Plaintext starosta PIN 618342 NOT stored in utils/auth.ts');
assert(!authFileContent.includes("'482915'"), 'Plaintext starosta PIN 482915 NOT stored in utils/auth.ts');
assert(authFileContent.includes(ADMIN_PIN_HASH), 'Admin hash stored as cryptographic SHA-256');

// ------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------
console.log('\n============================================================');
console.log(`  SECURITY AUDIT COMPLETED: ${passed} / ${total} TESTS PASSED`);
console.log('============================================================\n');

if (passed !== total) {
  process.exit(1);
}
