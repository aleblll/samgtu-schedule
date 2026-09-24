import { WeekData, DaySchedule } from '../types';
import { SCHEDULE_REGISTRY, createEmptyWeek } from '../constants';
import { getCanonicalGroupKey } from './samgtuParser';
import {
  LoadResult,
  LoadFailReason,
  parseWeekData,
  hasAnyLessons,
  validateWeekData
} from './scheduleSchema';

export type { LoadResult, LoadFailReason };
export { parseWeekData, hasAnyLessons, validateWeekData };

/**
 * Tracks canonical IDs that were explicitly and successfully loaded from network/cache.
 */
const LOADED_CHUNKS = new Set<string>();

/**
 * Marks a schedule as loaded into memory/cache.
 */
export function markScheduleLoaded(groupId: string): void {
  const canonicalId = getCanonicalScheduleId(groupId);
  LOADED_CHUNKS.add(canonicalId);
}

/**
 * Resets the set of loaded chunks (used in tests).
 */
export function clearLoadedChunks(): void {
  LOADED_CHUNKS.clear();
}

/**
 * Maps any group string or alias into its canonical schedule key (e.g. '3-ИНГТ-110' -> 'ingt-310').
 */
export function getCanonicalScheduleId(groupId: string): string {
  return getCanonicalGroupKey(groupId);
}

/**
 * Builds the static chunk URL for a given group id or alias relative to document.baseURI or BASE_URL.
 * Supports explicit base overrides for unit testing.
 * Prevents 404 issues in subfolders such as /samgtu-schedule/ on GitHub Pages.
 */
export function scheduleUrl(id: string, base?: string): string {
  const canonicalId = getCanonicalScheduleId(id);
  let resolvedBase = base;

  if (!resolvedBase) {
    if (typeof document !== 'undefined' && document.baseURI) {
      resolvedBase = document.baseURI;
    } else if (typeof (import.meta as any).env?.BASE_URL === 'string') {
      resolvedBase = (import.meta as any).env.BASE_URL;
    } else {
      resolvedBase = './';
    }
  }

  // Handle absolute URLs (e.g. http:// or https://)
  if (/^https?:\/\//i.test(resolvedBase)) {
    try {
      const urlObj = new URL(resolvedBase);
      let pathname = urlObj.pathname;
      if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
        pathname = pathname.substring(0, pathname.lastIndexOf('/') + 1);
      }
      if (!pathname.endsWith('/')) {
        pathname += '/';
      }
      urlObj.pathname = `${pathname}schedules/${canonicalId}.json`;
      urlObj.search = '';
      urlObj.hash = '';
      return urlObj.toString();
    } catch {
      // Fallback to relative formatting if URL parsing fails
    }
  }

  // Handle relative paths (e.g. '/', './', '/samgtu-schedule/', '/samgtu-schedule')
  let cleanBase = resolvedBase.trim();
  if (!cleanBase || cleanBase === './') {
    return `./schedules/${canonicalId}.json`;
  }
  if (!cleanBase.endsWith('/')) {
    cleanBase += '/';
  }
  return `${cleanBase}schedules/${canonicalId}.json`;
}

/**
 * Registers common aliases in SCHEDULE_REGISTRY for a loaded group schedule.
 */
export function registerScheduleAliases(canonicalId: string, data: WeekData): void {
  SCHEDULE_REGISTRY[canonicalId] = data;
  if (hasAnyLessons(data)) {
    markScheduleLoaded(canonicalId);
  }

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
 * Checks whether the schedule for the specified group is genuinely loaded into memory.
 * Empty weeks created via createEmptyWeek() do NOT count as loaded!
 * Returns true ONLY if:
 * 1. The chunk was explicitly loaded from network or cache, OR
 * 2. The registry contains at least one real lesson (e.g. bundled default group ingt-310).
 */
export function isScheduleLoaded(groupId: string): boolean {
  const canonicalId = getCanonicalScheduleId(groupId);
  if (LOADED_CHUNKS.has(canonicalId)) {
    return true;
  }
  const data = SCHEDULE_REGISTRY[canonicalId];
  return hasAnyLessons(data);
}

/**
 * Returns candidate URLs for fetching static JSON chunks, with scheduleUrl as primary.
 */
export function getCandidateUrls(canonicalId: string): string[] {
  const urls: string[] = [scheduleUrl(canonicalId)];

  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    let path = window.location.pathname;
    if (/\.[a-zA-Z0-9]+$/.test(path)) {
      path = path.substring(0, path.lastIndexOf('/') + 1);
    }
    if (!path.endsWith('/')) {
      path += '/';
    }
    urls.push(`${origin}${path}schedules/${canonicalId}.json`);
    const basePath = (import.meta as any).env?.BASE_URL || './';
    const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    urls.push(`${cleanBase}schedules/${canonicalId}.json`);
    urls.push(`/samgtu-schedule/schedules/${canonicalId}.json`);
    urls.push(`/schedules/${canonicalId}.json`);
  }
  return [...new Set(urls)];
}

function createLoadSuccess(data: WeekData): LoadResult {
  return Object.assign({ ...data }, {
    ok: true as const,
    data
  });
}

function createLoadFailure(reason: LoadFailReason): LoadResult {
  const empty = {
    1: createEmptyWeek(),
    2: createEmptyWeek(),
    3: createEmptyWeek(),
    4: createEmptyWeek()
  };
  return Object.assign(empty, {
    ok: false as const,
    reason
  });
}

/**
 * Loads a group schedule on-demand using a multi-tier cache cascade:
 * 1. In-memory SCHEDULE_REGISTRY (0ms, verified by isScheduleLoaded)
 * 2. User custom imported schedule in localStorage
 * 3. Client cached schedule in localStorage (offline support)
 * 4. Static JSON chunk from schedules/<canonicalId>.json
 *
 * Returns structured LoadResult:
 * - { ok: true, data: WeekData } on success
 * - { ok: false, reason: 'not_found' | 'network' | 'invalid' | 'empty' | 'timeout' } on failure
 */
export async function loadGroupSchedule(
  groupId: string,
  options?: { timeoutMs?: number }
): Promise<LoadResult> {
  const canonicalId = getCanonicalScheduleId(groupId);

  // 1. In-memory check: genuine schedule present
  if (isScheduleLoaded(canonicalId)) {
    const memData = SCHEDULE_REGISTRY[canonicalId];
    const parsed = parseWeekData(memData);
    if (parsed && hasAnyLessons(parsed)) {
      return createLoadSuccess(parsed);
    }
  }

  // 2. Custom imported schedule check (localStorage)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const customSaved = localStorage.getItem(`custom_schedule_${canonicalId}`);
      if (customSaved) {
        const rawJson = JSON.parse(customSaved);
        const parsed = parseWeekData(rawJson);
        if (parsed && hasAnyLessons(parsed)) {
          registerScheduleAliases(canonicalId, parsed);
          markScheduleLoaded(canonicalId);
          return createLoadSuccess(parsed);
        }
      }
    } catch (e) {}

    // 3. Cached schedule in localStorage
    try {
      const cached = localStorage.getItem(`cached_schedule_${canonicalId}`);
      if (cached) {
        const rawJson = JSON.parse(cached);
        const parsed = parseWeekData(rawJson);
        if (parsed && hasAnyLessons(parsed)) {
          registerScheduleAliases(canonicalId, parsed);
          markScheduleLoaded(canonicalId);
          return createLoadSuccess(parsed);
        }
      }
    } catch (e) {}
  }

  // 4. Fetch static JSON chunk
  let failureReason: LoadFailReason = 'not_found';

  if (typeof fetch === 'function') {
    const candidateUrls = getCandidateUrls(canonicalId);
    let hadNetworkError = false;
    let hadInvalidJson = false;
    let hadTimeout = false;
    let had404 = false;

    for (const url of candidateUrls) {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutMs = options?.timeoutMs ?? 8000;
        let timeoutId: any;
        if (controller) {
          timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        }

        let res: Response;
        try {
          res = await fetch(url, controller ? { signal: controller.signal } : undefined);
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }

        if (res.status === 404) {
          had404 = true;
          continue;
        }

        if (res.ok) {
          let rawData: unknown;
          try {
            rawData = await res.json();
          } catch {
            hadInvalidJson = true;
            continue;
          }

          const parsed = parseWeekData(rawData);
          if (!parsed) {
            hadInvalidJson = true;
            continue;
          }

          if (!hasAnyLessons(parsed)) {
            // Structurally valid, but 0 lessons in all 4 weeks
            return createLoadFailure('empty');
          }

          // Successful, valid, non-empty schedule
          registerScheduleAliases(canonicalId, parsed);
          markScheduleLoaded(canonicalId);
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              localStorage.setItem(`cached_schedule_${canonicalId}`, JSON.stringify(parsed));
            } catch (e) {}
          }
          return createLoadSuccess(parsed);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          hadTimeout = true;
        } else {
          hadNetworkError = true;
        }
      }
    }

    if (hadTimeout) {
      failureReason = 'timeout';
    } else if (hadInvalidJson) {
      failureReason = 'invalid';
    } else if (hadNetworkError) {
      failureReason = 'network';
    } else if (had404) {
      failureReason = 'not_found';
    } else {
      failureReason = 'not_found';
    }

    console.warn(`[ScheduleLoader] Could not load chunk for ${canonicalId} (reason: ${failureReason}) from candidates:`, candidateUrls);
  }

  // Fallback failure result: does NOT poison SCHEDULE_REGISTRY, allowing retries
  return createLoadFailure(failureReason);
}
