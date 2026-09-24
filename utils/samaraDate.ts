/**
 * Unified Samara Time (Europe/Samara, UTC+4) and Academic Semester Cycle Module
 * Specification: Appendix F7
 *
 * Eliminates timezoneOffset and client-side DST distortion bugs by relying on
 * Intl.DateTimeFormat (IANA 'Europe/Samara') and pure Date.UTC arithmetic.
 */

export interface SemesterBlock {
  id: number;
  name?: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface SemesterConfig {
  semesterStart: string; // YYYY-MM-DD
  cycleWeeks?: number;
  blocks: SemesterBlock[];
}

export const DEFAULT_SEMESTER_CONFIG: SemesterConfig = {
  semesterStart: '2026-08-31',
  cycleWeeks: 4,
  blocks: [
    {
      id: 1,
      name: 'Блок 1 (31.08 - 26.09)',
      start: '2026-08-31',
      end: '2026-09-26'
    },
    {
      id: 2,
      name: 'Блок 2 (28.09 - 24.10)',
      start: '2026-09-28',
      end: '2026-10-24'
    },
    {
      id: 3,
      name: 'Блок 3 (26.10 - 21.11)',
      start: '2026-10-26',
      end: '2026-11-21'
    },
    {
      id: 4,
      name: 'Блок 4 (23.11 - 31.12)',
      start: '2026-11-23',
      end: '2026-12-31'
    }
  ]
};

let activeSemesterConfig: SemesterConfig = DEFAULT_SEMESTER_CONFIG;

/**
 * Loads semester configuration from public/semester.json if available in Node environment,
 * or returns the active / default configuration.
 */
export function loadSemesterConfig(customPath?: string): SemesterConfig {
  try {
    if (typeof process !== 'undefined' && process.versions?.node) {
      const req = (globalThis as any).require || (typeof require !== 'undefined' ? require : null);
      if (req) {
        const fs = req('fs');
        const path = req('path');
        const filePath = customPath || path.resolve(process.cwd(), 'public', 'semester.json');
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf8');
          activeSemesterConfig = JSON.parse(raw);
          return activeSemesterConfig;
        }
      }
    }
  } catch {}
  return activeSemesterConfig;
}

/**
 * Sets the active semester configuration in memory.
 */
export function setSemesterConfig(config: SemesterConfig): void {
  activeSemesterConfig = config;
}

/**
 * Returns the currently active semester configuration.
 */
export function getSemesterConfig(): SemesterConfig {
  return loadSemesterConfig();
}

const samaraFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Samara',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

/**
 * Formats a Date into a Samara (Europe/Samara, UTC+4) ISO date string (YYYY-MM-DD).
 * Uses Intl.DateTimeFormat with timeZone: 'Europe/Samara'.
 *
 * Solves the legacy bug where new Date().getTimezoneOffset() was added to UTC ms:
 * since now.getTime() is already UTC, shifting by local offset changes the absolute epoch,
 * causing false day rollovers on non-Samara clients (e.g. New York or Berlin).
 */
export function samaraISO(d: Date | number | string = new Date()): string {
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '';

  try {
    return samaraFormatter.format(dateObj);
  } catch {
    // Fallback if Intl fails
    const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
    const samara = new Date(utc + (4 * 3600000));
    const y = samara.getFullYear();
    const m = String(samara.getMonth() + 1).padStart(2, '0');
    const day = String(samara.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

/**
 * Calculates academic week in 4-week cycle (1..4) using pure Date.UTC integer arithmetic.
 * Ensures zero timezone offset distortion, regardless of client time zone or DST shifts.
 *
 * @param iso Target date string in YYYY-MM-DD format
 * @param startISO Semester start date string in YYYY-MM-DD format (defaults to semester config)
 */
export function cycleWeek(iso: string, startISO?: string): number {
  if (!iso) return 1;
  const config = getSemesterConfig();
  const effectiveStart = startISO || config.semesterStart || '2026-08-31';

  const [y1, m1, d1] = iso.split('-').map(Number);
  const [y0, m0, d0] = effectiveStart.split('-').map(Number);

  const targetUtc = Date.UTC(y1, m1 - 1, d1);
  const startUtc = Date.UTC(y0, m0 - 1, d0);

  const diffTime = targetUtc - startUtc;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 1;
  const cycleLength = config.cycleWeeks || 4;
  return (Math.floor(diffDays / 7) % cycleLength) + 1;
}

/**
 * Reads semester configuration and returns the current semester week (1..4).
 * If isoDate is omitted, determines today's date in Europe/Samara via samaraISO().
 * Accepts an ISO string ("YYYY-MM-DD") or a Date object.
 */
export function getSemesterWeek(isoDateOrDate?: string | Date): number {
  let targetISO: string;
  if (!isoDateOrDate) {
    targetISO = samaraISO();
  } else if (typeof isoDateOrDate === 'string') {
    targetISO = isoDateOrDate;
  } else if (isoDateOrDate instanceof Date) {
    targetISO = samaraISO(isoDateOrDate);
  } else {
    targetISO = samaraISO();
  }

  const config = getSemesterConfig();
  return cycleWeek(targetISO, config.semesterStart);
}

/**
 * Returns a Date object representing the given instant in Europe/Samara wall-clock time,
 * safely extracted via Intl without getTimezoneOffset skew.
 */
export function getSamaraDate(d: Date = new Date()): Date {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Samara',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
    const h = get('hour') === 24 ? 0 : get('hour');
    return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), h, get('minute'), get('second')));
  } catch {
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (4 * 3600000));
  }
}
