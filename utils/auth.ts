import { UserRole } from '../types';

/**
 * SHA-256 hashes of hardened Starosta & Admin PIN codes.
 * Passwords are never stored in plaintext inside the client JavaScript bundle.
 */

export const ADMIN_PIN_HASH = 'b9c771c48b0eee8154e2d1e3e4a80edf070e6ed8b3d198851bbede1a203393f2';

export const GROUP_STAROSTA_PIN_HASHES: Record<string, { groupId: string; groupName: string }> = {
  // 3-ИНГТ-110
  'd7e0db49a56ef951bb43680f33e1b9ea0831457d4b8326a9ed02081bb09f4b45': { groupId: 'ingt-310', groupName: '3-ИНГТ-110' },

  // 3-ИНГТ-111
  '967b5a07bd149ca46c5de998da968b2b1e35471e8b7ac374e6e47462c279d0e7': { groupId: 'ingt-311', groupName: '3-ИНГТ-111' },

  // 3-ИНГТ-101
  'b2abf982ab3c0b5dbd44f321a1aaf5e5e6128885092c3306279480f5a673bf78': { groupId: 'ingt-301', groupName: '3-ИНГТ-101' },

  // 3-ИНГТ-103
  'b90d0b8cd0d84c3d456345e84e0fc34e092677b705a17cf642f835d0635fa14d': { groupId: 'ingt-303', groupName: '3-ИНГТ-103' },

  // 3-ФАИД-110
  '90a32c87cb1e2107316f587668493384b3a4fff2f086468f99a2d1a9db67715e': { groupId: 'faid-310', groupName: '3-ФАИД-110' },

  // 2-ИНГТ-109
  'a97c7c97d46f3bc3d76e4d089fee6e8385afe2b39ca237d9a5a2adcbcb21b96f': { groupId: 'ingt-209', groupName: '2-ИНГТ-109' },

  // 2-ХТФ-115
  '18c04fe2803cb372ce29bd5439253d099b5983ff49a5f601b22f70e17ca61518': { groupId: 'htf-215', groupName: '2-ХТФ-115' },

  // 2-ИНГТ-110
  'ad7c7a0858acb02d95333eef71bc14c20b598eab861767eab5fb87a91f4f8c47': { groupId: 'ingt-210', groupName: '2-ИНГТ-110' },

  // 3-ИНГТ-113
  '48290cf691c41cbc99b2396d2e5313ccfba91987b384e6d8f08b951fa5045e83': { groupId: 'ingt-313', groupName: '3-ИНГТ-113' }
};

/**
 * Computes SHA-256 hash using native Web Crypto API (browser, TMA, and Node.js 18+).
 */
export async function computeSHA256(text: string): Promise<string> {
  const clean = text.trim();
  const cryptoObj = (typeof window !== 'undefined' ? window.crypto : null) || globalThis.crypto;

  if (cryptoObj && cryptoObj.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(clean);
    const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return '';
}

export interface AuthResult {
  role: UserRole;
  targetGroupId?: string;
  groupName?: string;
}

/**
 * Validates entered PIN against cryptographic SHA-256 hashes.
 */
export async function verifyPinCode(inputPin: string): Promise<AuthResult | null> {
  const pin = inputPin.trim();
  if (!pin) return null;

  const hash = await computeSHA256(pin);

  // 1. Check Admin PIN
  if (hash === ADMIN_PIN_HASH) {
    return {
      role: 'admin'
    };
  }

  // 2. Check Starosta PINs
  const match = GROUP_STAROSTA_PIN_HASHES[hash];
  if (match) {
    return {
      role: 'starosta',
      targetGroupId: match.groupId,
      groupName: match.groupName
    };
  }

  return null;
}
