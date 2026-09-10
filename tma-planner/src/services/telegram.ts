/**
 * Сервис интеграции с Telegram WebApp SDK
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: Record<string, any>;
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        ready: () => void;
        expand: () => void;
        close: () => void;
        enableClosingConfirmation: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        CloudStorage?: {
          setItem: (key: string, value: string, callback?: (error: Error | null, result?: boolean) => void) => void;
          getItem: (key: string, callback: (error: Error | null, value?: string) => void) => void;
          getItems: (keys: string[], callback: (error: Error | null, values?: Record<string, string>) => void) => void;
          removeItem: (key: string, callback?: (error: Error | null, result?: boolean) => void) => void;
          getKeys: (callback: (error: Error | null, keys?: string[]) => void) => void;
        };
      };
    };
  }
}

export function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function initTelegramApp(isDark = true) {
  const tg = getTelegramWebApp();
  if (!tg) return;

  try {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();

    const bgColor = isDark ? '#0F1115' : '#F7F8FA';
    tg.setHeaderColor(bgColor);
    tg.setBackgroundColor(bgColor);
  } catch (err) {
    console.warn('[Telegram WebApp] Init warning:', err);
  }
}

export function setTelegramColors(isDark: boolean) {
  const tg = getTelegramWebApp();
  if (!tg) return;
  try {
    const color = isDark ? '#0F1115' : '#F7F8FA';
    tg.setHeaderColor(color);
    tg.setBackgroundColor(color);
  } catch (e) {
    // ignore
  }
}

// Тактильная отдача
export function hapticLight() {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback?.impactOccurred) {
    tg.HapticFeedback.impactOccurred('light');
  }
}

export function hapticMedium() {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback?.impactOccurred) {
    tg.HapticFeedback.impactOccurred('medium');
  }
}

export function hapticSuccess() {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback?.notificationOccurred) {
    tg.HapticFeedback.notificationOccurred('success');
  }
}

export function hapticWarning() {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback?.notificationOccurred) {
    tg.HapticFeedback.notificationOccurred('warning');
  }
}

export function hapticSelection() {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback?.selectionChanged) {
    tg.HapticFeedback.selectionChanged();
  }
}

// Telegram CloudStorage Promise Wrappers
export async function tgCloudStorageGet(key: string): Promise<string | null> {
  const tg = getTelegramWebApp();
  if (!tg?.CloudStorage?.getItem) return null;

  return new Promise((resolve) => {
    try {
      tg.CloudStorage!.getItem(key, (err, val) => {
        if (err || !val) {
          resolve(null);
        } else {
          resolve(val);
        }
      });
    } catch {
      resolve(null);
    }
  });
}

export async function tgCloudStorageSet(key: string, value: string): Promise<boolean> {
  const tg = getTelegramWebApp();
  if (!tg?.CloudStorage?.setItem) return false;

  return new Promise((resolve) => {
    try {
      tg.CloudStorage!.setItem(key, value, (err, success) => {
        resolve(!err && !!success);
      });
    } catch {
      resolve(false);
    }
  });
}
