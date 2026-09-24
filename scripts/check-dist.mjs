import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distIndexPath = path.resolve(__dirname, '../dist/index.html');

console.log(`[check:dist] Checking production build artifact: ${distIndexPath}`);

if (!fs.existsSync(distIndexPath)) {
  console.error('[check:dist] Error: dist/index.html not found! Run "npm run build" first.');
  process.exit(1);
}

const html = fs.readFileSync(distIndexPath, 'utf-8');
const errors = [];

if (!html.includes('id="root"')) {
  errors.push('Required element id="root" is missing in dist/index.html');
}

if (!html.includes('<script type="module"')) {
  errors.push('Required module script <script type="module" is missing in dist/index.html');
}

if (errors.length > 0) {
  console.error('[check:dist] Verification failed:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('[check:dist] Verification passed: dist/index.html contains id="root" and <script type="module".');
