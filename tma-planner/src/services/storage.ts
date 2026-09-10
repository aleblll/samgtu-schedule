import { PlannerEvent, AppSettings } from '../types/planner';
import { INITIAL_EVENTS, DEFAULT_SETTINGS } from '../data/seedAll';
import { tgCloudStorageGet, tgCloudStorageSet } from './telegram';

const DB_NAME = 'SamgtuPlannerDB';
const DB_VERSION = 1;
const STORE_EVENTS = 'events';
const STORE_SETTINGS = 'settings';

const LS_EVENTS_KEY = 'samgtu_planner_events_v1';
const LS_SETTINGS_KEY = 'samgtu_planner_settings_v1';
const TG_CLOUD_KEY = 'samgtu_planner_cloud_v1';

// Open IndexedDB with Promise
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_EVENTS)) {
        db.createObjectStore(STORE_EVENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Загрузка сохраненных событий (IndexedDB -> localStorage fallback -> Seed data)
 */
export async function loadEvents(): Promise<PlannerEvent[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_EVENTS, 'readonly');
      const store = tx.objectStore(STORE_EVENTS);
      const req = store.getAll();

      req.onsuccess = () => {
        const result = req.result as PlannerEvent[];
        if (result && result.length > 0) {
          resolve(result);
        } else {
          // Fallback to localStorage or Seed
          const fallback = loadFromLocalStorage();
          resolve(fallback);
        }
      };
      req.onerror = () => resolve(loadFromLocalStorage());
    });
  } catch {
    return loadFromLocalStorage();
  }
}

function loadFromLocalStorage(): PlannerEvent[] {
  try {
    const saved = localStorage.getItem(LS_EVENTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Storage] localStorage error:', e);
  }
  return [...INITIAL_EVENTS];
}

/**
 * Сохранение списка событий (IndexedDB + localStorage + Telegram CloudStorage)
 */
export async function saveEvents(events: PlannerEvent[]): Promise<void> {
  // 1. localStorage backup (synchronous & reliable)
  try {
    localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn('[Storage] LS save error:', e);
  }

  // 2. IndexedDB
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_EVENTS, 'readwrite');
    const store = tx.objectStore(STORE_EVENTS);
    store.clear();
    events.forEach(ev => store.put(ev));
  } catch (e) {
    console.warn('[Storage] IndexedDB save error:', e);
  }

  // 3. Telegram CloudStorage (background sync)
  try {
    const payload = JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      events
    });
    // Cloud storage limit is 4096 bytes per value in Telegram; if too large, we store delta/essential
    if (payload.length <= 4096) {
      await tgCloudStorageSet(TG_CLOUD_KEY, payload);
    }
  } catch {
    // Cloud storage sync fail is non-fatal
  }
}

/**
 * Загрузка настроек приложения
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const saved = localStorage.getItem(LS_SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Сохранение настроек приложения
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[Storage] Settings save error:', e);
  }
}

/**
 * Экспорт всех данных в JSON файл
 */
export function exportDataToJson(events: PlannerEvent[], settings: AppSettings) {
  const data = {
    app: 'SamGTU-3INGT-101-Planner',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings,
    events
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `tma-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Импорт данных из JSON файла
 */
export function importDataFromJson(file: File): Promise<{ events: PlannerEvent[]; settings: AppSettings }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || !Array.isArray(parsed.events)) {
          return reject(new Error('Некорректный формат файла: отсутствует массив событий events'));
        }

        const events = parsed.events as PlannerEvent[];
        const settings = parsed.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : DEFAULT_SETTINGS;

        resolve({ events, settings });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Сброс к заводским предустановленным данным
 */
export async function resetToFactory(): Promise<{ events: PlannerEvent[]; settings: AppSettings }> {
  await saveEvents(INITIAL_EVENTS);
  await saveSettings(DEFAULT_SETTINGS);
  return {
    events: [...INITIAL_EVENTS],
    settings: { ...DEFAULT_SETTINGS }
  };
}

/**
 * Попытка фоновой синхронизации с Telegram CloudStorage
 */
export async function syncWithTelegramCloud(): Promise<PlannerEvent[] | null> {
  const raw = await tgCloudStorageGet(TG_CLOUD_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.events)) {
      return parsed.events as PlannerEvent[];
    }
  } catch {
    // ignore
  }
  return null;
}
