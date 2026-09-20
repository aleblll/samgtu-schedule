import assert from 'assert';
import { verifyPinCode, computeSHA256, ADMIN_PIN_HASH, GROUP_STAROSTA_PIN_HASHES } from '../utils/auth';

async function runAuthTests() {
  console.log('=== RUNNING AUTH HASH VERIFICATION TESTS ===\n');

  // Test 1: Admin PIN
  const adminRes = await verifyPinCode('94726108');
  assert(adminRes !== null, 'Admin PIN should resolve');
  assert.strictEqual(adminRes?.role, 'admin', 'Admin role should be admin');
  console.log('✅ PASS: Admin PIN (94726108) correctly authorizes as admin');

  // Test 2: Starosta PINs for each group
  const testCases = [
    { pin: '839124', expectedGroup: 'ingt-310', name: '3-ИНГТ-110' },
    { pin: '572916', expectedGroup: 'ingt-311', name: '3-ИНГТ-111' },
    { pin: '418305', expectedGroup: 'ingt-301', name: '3-ИНГТ-101' },
    { pin: '694271', expectedGroup: 'ingt-303', name: '3-ИНГТ-103' },
    { pin: '381952', expectedGroup: 'faid-310', name: '3-ФАИД-110' },
    { pin: '925483', expectedGroup: 'ingt-209', name: '2-ИНГТ-109' },
    { pin: '741639', expectedGroup: 'htf-215',  name: '2-ХТФ-115' }
  ];

  for (const tc of testCases) {
    const res = await verifyPinCode(tc.pin);
    assert(res !== null, `PIN for ${tc.name} (${tc.pin}) should be valid`);
    assert.strictEqual(res?.role, 'starosta', `Role should be starosta for ${tc.name}`);
    assert.strictEqual(res?.targetGroupId, tc.expectedGroup, `Target group should be ${tc.expectedGroup}`);
    console.log(`✅ PASS: ${tc.name} (PIN: ${tc.pin}) -> Authorized for group ${tc.expectedGroup}`);
  }

  // Test 3: Invalid PIN
  const invalidRes = await verifyPinCode('000000');
  assert.strictEqual(invalidRes, null, 'Invalid PIN should return null');
  console.log('✅ PASS: Invalid PIN returns null (access denied)');

  // Test 4: Old PINs should now be rejected
  const oldPins = ['110', '111', '101', '103', '109', '115', '2808'];
  for (const oldPin of oldPins) {
    const res = await verifyPinCode(oldPin);
    assert.strictEqual(res, null, `Old PIN ${oldPin} must be rejected`);
  }
  console.log('✅ PASS: All legacy predictable PINs (101, 103, 110, 2808, etc.) rejected');

  console.log('\n========================================');
  console.log('ALL AUTH HASH TESTS PASSED!');
  console.log('========================================');
}

runAuthTests().catch(err => {
  console.error('Auth test failed:', err);
  process.exit(1);
});
