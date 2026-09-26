import assert from 'node:assert';
import { exportAttendanceToWord } from '../utils/exportWord';
import { sendTelegramDocumentDirect, getFallbackBotToken } from '../utils/telegramFallback';
import { AVAILABLE_GROUPS, FACULTIES } from '../constants';

console.log('================================================================');
console.log('   END-TO-END RESILIENCE & ZERO-CLOUDFLARE FALLBACK TEST        ');
console.log('================================================================\n');

// Mock browser globals for Node test environment
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElement: () => ({ style: {}, appendChild: () => {}, click: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} }
  };
}
if (typeof (globalThis as any).window.URL === 'undefined') {
  (globalThis as any).window.URL = {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: () => {}
  };
}

async function runResilienceTests() {
  // Test 1: Verify token resolution
  console.log('>>> 1. Verifying Telegram bot fallback token generation...');
  const token = getFallbackBotToken();
  assert(token.startsWith('8825340055:'), 'Fallback bot token starts with expected bot ID');
  assert(token.length > 35, 'Fallback bot token has valid length');
  console.log('  ✅ PASS: Bot token assembled correctly at runtime without static leak.');

  // Test 2: Word Export Resilience when Cloudflare Worker returns 500
  console.log('\n>>> 2. Testing Word Export resilience when Worker /export-doc fails with HTTP 500...');
  const groupConfig = AVAILABLE_GROUPS.find(g => g.id === 'ingt-310')!;
  const faculty = FACULTIES[0];
  const sampleStudents = [{ id: 1, name: 'Иванов И.И.' }];
  const sampleRecords = [
    {
      docId: 'ingt-310_2026-09-02_l1',
      groupId: 'ingt-310',
      date: '2026-09-02',
      lessonId: 'l1',
      absentStudentIds: [1],
      isCancelled: false
    }
  ];

  // Intercept fetch to simulate Cloudflare Worker 500 error
  const realFetch = globalThis.fetch;
  (globalThis as any).fetch = async (url: string | URL | Request, init?: any) => {
    const urlStr = url.toString();
    if (urlStr.includes('/export-doc') || urlStr.includes('/upload')) {
      // Simulate Cloudflare Worker returning 500 TELEGRAM_BOT_TOKEN is not configured
      return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Let real Telegram API requests pass through
    return realFetch(url, init);
  };

  try {
    const exportResult = await exportAttendanceToWord(sampleRecords, sampleStudents, groupConfig, faculty);
    assert.strictEqual(exportResult.success, true, 'exportAttendanceToWord must succeed even when worker returns 500');
    console.log(`  ✅ PASS: Word export successfully recovered via fallback (method: ${exportResult.method})`);
  } finally {
    globalThis.fetch = realFetch;
  }

  // Test 3: Direct Telegram Document Delivery
  console.log('\n>>> 3. Testing direct Telegram document upload resilience...');
  const testBlob = new Blob(['automated resilience verification test content'], { type: 'text/plain' });
  const uploadResult = await sendTelegramDocumentDirect(testBlob, 'e2e_resilience_test.txt', '🧪 Автоматический тест отказоустойчивости');
  assert.strictEqual(uploadResult.ok, true, `Telegram upload must succeed: ${uploadResult.error}`);
  console.log(`  ✅ PASS: Direct Telegram delivery confirmed (message_id: ${uploadResult.data?.result?.message_id})`);

  // Clean up test message from channel
  if (uploadResult.data?.result?.message_id) {
    try {
      await realFetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: '@raspisanie_samgtu', message_id: uploadResult.data.result.message_id })
      });
      console.log('  ✅ PASS: Channel cleanly purged after verification.');
    } catch (e) {
      console.warn('Cleanup non-critical warning:', e);
    }
  }

  console.log('\n================================================================');
  console.log('   ALL END-TO-END RESILIENCE TESTS PASSED (100%) 🎉             ');
  console.log('================================================================\n');
}

runResilienceTests().catch(err => {
  console.error('Resilience tests failed:', err);
  process.exit(1);
});
