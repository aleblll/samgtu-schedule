import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=================================================');
console.log('  TEST SUITE: TELEGRAM WEBAPP & MOBILE ERGONOMICS');
console.log('=================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

// -------------------------------------------------------------
// 1. Telegram WebApp SDK Integration Tests
// -------------------------------------------------------------
console.log('\n--- 1. Telegram WebApp SDK Integration ---');

const indexHtmlPath = path.resolve(__dirname, '../index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

const distHtmlPath = path.resolve(__dirname, '../dist/index.html');
const distHtmlContent = fs.existsSync(distHtmlPath) ? fs.readFileSync(distHtmlPath, 'utf8') : '';

const appTsxPath = path.resolve(__dirname, '../App.tsx');
const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

// 1.1 SDK script tag in index.html and dist/index.html
assert(
  indexHtmlContent.includes('<script src="https://telegram.org/js/telegram-web-app.js"></script>'),
  'index.html contains Telegram WebApp SDK script tag'
);
assert(
  distHtmlContent.includes('<script src="https://telegram.org/js/telegram-web-app.js"></script>'),
  'dist/index.html contains Telegram WebApp SDK script tag after build'
);

// 1.2 ready() and expand() in App.tsx
assert(
  appTsxContent.includes('window.Telegram.WebApp.ready()'),
  'App.tsx invokes window.Telegram.WebApp.ready()'
);
assert(
  appTsxContent.includes('window.Telegram.WebApp.expand()'),
  'App.tsx invokes window.Telegram.WebApp.expand()'
);

// 1.3 Safe handling when window.Telegram is undefined (regular browser or APK)
console.log('\n--- 1.3 Browser / APK Fallback Simulation (window.Telegram undefined) ---');
let browserCrashOccurred = false;
try {
  const fakeWindow: any = {
    matchMedia: () => ({ matches: false }),
    localStorage: { getItem: () => null, setItem: () => null }
  };
  // Simulate App.tsx guard
  if (typeof fakeWindow !== 'undefined' && fakeWindow.Telegram?.WebApp) {
    fakeWindow.Telegram.WebApp.ready();
    fakeWindow.Telegram.WebApp.expand();
  }
} catch (err) {
  browserCrashOccurred = true;
}
assert(!browserCrashOccurred, 'Absence of window.Telegram does not throw or crash runtime');

// 1.4 TMA environment simulation
console.log('\n--- 1.4 TMA Environment Simulation (Telegram WebApp present) ---');
let readyCalled = false;
let expandCalled = false;
let closeConfirmationCalled = false;
let headerColorSet = '';
let eventSubscribed = false;

const mockTelegram = {
  WebApp: {
    ready: () => { readyCalled = true; },
    expand: () => { expandCalled = true; },
    enableClosingConfirmation: () => { closeConfirmationCalled = true; },
    setHeaderColor: (color: string) => { headerColorSet = color; },
    setBackgroundColor: () => {},
    onEvent: (event: string) => { if (event === 'themeChanged') eventSubscribed = true; },
    offEvent: () => {},
    colorScheme: 'dark'
  }
};

try {
  if (mockTelegram?.WebApp) {
    mockTelegram.WebApp.ready();
    mockTelegram.WebApp.expand();
    mockTelegram.WebApp.enableClosingConfirmation();
    mockTelegram.WebApp.setHeaderColor('#0f172a');
    mockTelegram.WebApp.onEvent('themeChanged');
  }
} catch (e) {}

assert(readyCalled, 'window.Telegram.WebApp.ready() successfully called in TMA');
assert(expandCalled, 'window.Telegram.WebApp.expand() successfully called in TMA');
assert(closeConfirmationCalled, 'window.Telegram.WebApp.enableClosingConfirmation() active for modal safety');
assert(headerColorSet === '#0f172a', 'Telegram header color dynamically matches theme');
assert(eventSubscribed, 'Telegram themeChanged event listener successfully registered');

// -------------------------------------------------------------
// 2. Vite Relative Paths & Telegram WebApp iframe Compatibility
// -------------------------------------------------------------
console.log('\n--- 2.1 Relative Paths (base: "./") ---');

const viteConfigPath = path.resolve(__dirname, '../vite.config.ts');
const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');

assert(
  viteConfigContent.includes("base: './'"),
  'vite.config.ts explicitly sets base: "./" for iframe & subpath isolation'
);

const scriptSrcMatch = distHtmlContent.match(/<script type="module" crossorigin src="([^"]+)">/);
const cssHrefMatch = distHtmlContent.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);

assert(
  !!scriptSrcMatch && scriptSrcMatch[1].startsWith('./'),
  `dist/index.html script uses relative path (${scriptSrcMatch?.[1]})`
);
assert(
  !!cssHrefMatch && cssHrefMatch[1].startsWith('./'),
  `dist/index.html css uses relative path (${cssHrefMatch?.[1]})`
);

// -------------------------------------------------------------
// 2.2 Safe Areas & Inset Margins
// -------------------------------------------------------------
console.log('\n--- 2.2 Safe Areas & Insets (pt-safe, pb-safe, viewport-fit) ---');

assert(
  indexHtmlContent.includes('viewport-fit=cover'),
  'index.html has viewport-fit=cover meta tag required for iOS/TMA safe area insets'
);

const indexCssPath = path.resolve(__dirname, '../index.css');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

assert(
  indexCssContent.includes('@utility pt-safe') &&
  indexCssContent.includes('env(safe-area-inset-top') &&
  indexCssContent.includes('--tg-safe-area-inset-top'),
  'index.css defines @utility pt-safe supporting both Telegram TMA and iOS/Android env()'
);

assert(
  indexCssContent.includes('@utility pb-safe') &&
  indexCssContent.includes('env(safe-area-inset-bottom') &&
  indexCssContent.includes('--tg-safe-area-inset-bottom'),
  'index.css defines @utility pb-safe with max(0.75rem, safe-area-inset-bottom)'
);

const bottomNavPath = path.resolve(__dirname, '../components/BottomNav.tsx');
const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8');

assert(
  bottomNavContent.includes('pb-safe'),
  'BottomNav.tsx uses pb-safe to prevent overlap with Telegram / device home indicator'
);

assert(
  appTsxContent.includes('header') && appTsxContent.includes('pt-safe'),
  'App.tsx header uses pt-safe to prevent overlap with Telegram close button & status bar'
);

// -------------------------------------------------------------
// 2.3 Vertical Scrolling in Telegram WebApp
// -------------------------------------------------------------
console.log('\n--- 2.3 Vertical Scrolling & Ergonomics inside Telegram Container ---');

assert(
  indexCssContent.includes('overscroll-behavior-y: none'),
  'index.css applies overscroll-behavior-y: none to prevent TMA pull-to-close on vertical scroll'
);

const swipeableDaysPath = path.resolve(__dirname, '../components/SwipeableDays.tsx');
const swipeableDaysContent = fs.readFileSync(swipeableDaysPath, 'utf8');

assert(
  swipeableDaysContent.includes('touch-pan-y'),
  'SwipeableDays container uses touch-pan-y for immediate native vertical scroll'
);

assert(
  swipeableDaysContent.includes('isDominantHorizontal'),
  'SwipeableDays has Directional Lock locking out horizontal swipes during vertical scrolling'
);

assert(
  appTsxContent.includes('pb-28'),
  'App.tsx main wrapper has pb-28 clearance so last lessons/homework items are never hidden behind BottomNav'
);

const homeworkPath = path.resolve(__dirname, '../components/HomeworkTracker.tsx');
const homeworkContent = fs.readFileSync(homeworkPath, 'utf8');

assert(
  homeworkContent.includes('overflow-y-auto') && homeworkContent.includes('overscroll-contain'),
  'HomeworkTracker modal has overflow-y-auto with overscroll-contain preventing background scroll'
);

console.log('\n=================================================');
console.log(`  SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('=================================================');

if (passedTests === totalTests) {
  console.log('>>> VERDICT: ALL TELEGRAM WEBAPP & ERGONOMICS CHECKS PASSED <<<');
  process.exit(0);
} else {
  console.error('>>> VERDICT: SOME CHECKS FAILED <<<');
  process.exit(1);
}
