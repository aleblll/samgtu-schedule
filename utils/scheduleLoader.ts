import { WeekData, DaySchedule } from '../types';
import { SCHEDULE_REGISTRY, createEmptyWeek } from '../constants';
import { getCanonicalGroupKey } from './samgtuParser';

/**
 * Maps any group string or alias into its canonical schedule key (e.g. '3-ИНГТ-110' -> 'ingt-310').
 */
export function getCanonicalScheduleId(groupId: string): string {
  return getCanonicalGroupKey(groupId);
}

/**
 * Registers common aliases in SCHEDULE_REGISTRY for a loaded group schedule.
 */
export function registerScheduleAliases(canonicalId: string, data: WeekData): void {
  SCHEDULE_REGISTRY[canonicalId] = data;

  // Pattern: ingt-310 -> 3-ингт-110, 24ингт-110, etc.
  const ingtMatch = canonicalId.match(/^([a-z]+)-(\d)(\d{2})$/);
  if (ingtMatch) {
    const fac = ingtMatch[1];
    const course = ingtMatch[2];
    const num = ingtMatch[3];
    const facRuMap: Record<string, string> = {
      ingt: 'ингт',
      faid: 'фаид',
      htf: 'хтф',
      asa: 'аса',
      iait: 'иаит',
      itf: 'итф',
      etf: 'этф',
      tef: 'тэф',
      fmmt: 'фммт',
      fpp: 'фпп',
      iiego: 'ииэго'
    };
    const facRu = facRuMap[fac] || fac;

    SCHEDULE_REGISTRY[`${course}-${facRu}-1${num}`] = data;
    SCHEDULE_REGISTRY[`${course}-${facRu}-${num}`] = data;
    SCHEDULE_REGISTRY[`${course}-${fac}-1${num}`] = data;
    SCHEDULE_REGISTRY[`${course}-${fac}-${num}`] = data;
    SCHEDULE_REGISTRY[`24${facRu}-1${num}`] = data;
    SCHEDULE_REGISTRY[`25${facRu}-1${num}`] = data;
    SCHEDULE_REGISTRY[`${fac}-${course}${num}`] = data;
  }

  // Explicit legacy aliases
  if (canonicalId === 'faid-310') {
    SCHEDULE_REGISTRY['faid-110'] = data;
    SCHEDULE_REGISTRY['24фад-110'] = data;
    SCHEDULE_REGISTRY['24фаид-110'] = data;
    SCHEDULE_REGISTRY['3-фаид-110'] = data;
    SCHEDULE_REGISTRY['3-faid-110'] = data;
  } else if (canonicalId === 'ingt-209') {
    SCHEDULE_REGISTRY['2-ingt-109'] = data;
    SCHEDULE_REGISTRY['ingt-109'] = data;
    SCHEDULE_REGISTRY['2-ингт-109'] = data;
  } else if (canonicalId === 'htf-215') {
    SCHEDULE_REGISTRY['2-htf-115'] = data;
    SCHEDULE_REGISTRY['htf-115'] = data;
    SCHEDULE_REGISTRY['2-хтф-115'] = data;
  } else if (canonicalId === 'ingt-301') {
    SCHEDULE_REGISTRY['ingt-1'] = data;
  }
}

/**
 * Checks whether the schedule for the specified group is already loaded into memory.
 */
export function isScheduleLoaded(groupId: string): boolean {
  const canonicalId = getCanonicalScheduleId(groupId);
  return Boolean(SCHEDULE_REGISTRY[canonicalId] && Array.isArray(SCHEDULE_REGISTRY[canonicalId][1]));
}

/**
 * Loads a group schedule on-demand using a multi-tier cache cascade:
 * 1. In-memory SCHEDULE_REGISTRY (0ms)
 * 2. User custom imported schedule in localStorage
 * 3. Client cached schedule in localStorage (offline support)
 * 4. Static JSON chunk from ./schedules/<groupId>.json (or filesystem in Node.js)
 */
export async function loadGroupSchedule(groupId: string): Promise<WeekData> {
  const canonicalId = getCanonicalScheduleId(groupId);

  // 1. In-memory check
  if (isScheduleLoaded(canonicalId)) {
    return SCHEDULE_REGISTRY[canonicalId];
  }

  // 2. Custom imported schedule check (localStorage)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const customSaved = localStorage.getItem(`custom_schedule_${canonicalId}`);
      if (customSaved) {
        const parsed = JSON.parse(customSaved);
        registerScheduleAliases(canonicalId, parsed);
        return parsed;
      }
    } catch (e) {}

    // 3. Cached schedule in localStorage
    try {
      const cached = localStorage.getItem(`cached_schedule_${canonicalId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        registerScheduleAliases(canonicalId, parsed);
        return parsed;
      }
    } catch (e) {}
  }

  // 4. Fetch static JSON chunk (in browser environments)
  if (typeof window !== 'undefined') {
    try {
      const basePath = (import.meta as any).env?.BASE_URL || './';
      const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
      const res = await fetch(`${cleanBase}schedules/${canonicalId}.json`);
      if (res.ok) {
        const data = await res.json() as WeekData;
        registerScheduleAliases(canonicalId, data);
        try {
          localStorage.setItem(`cached_schedule_${canonicalId}`, JSON.stringify(data));
        } catch (e) {}
        return data;
      }
    } catch (err) {
      console.warn(`[ScheduleLoader] Could not load chunk for ${canonicalId}:`, err);
    }
  }

  // Fallback: create empty 4-week structure
  const fallback: WeekData = {
    1: createEmptyWeek(),
    2: createEmptyWeek(),
    3: createEmptyWeek(),
    4: createEmptyWeek()
  };
  registerScheduleAliases(canonicalId, fallback);
  return fallback;
}
