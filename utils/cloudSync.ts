import { HomeworkItem, Lesson } from '../types';
import { AttendanceRecord } from '../attendance';

export const WORKER_BASE = 'https://floral-union-26d1.alexeyberezin2.workers.dev';

// Primary sync through Cloudflare Worker proxy (100% CORS compliant, zero rate limits, reliable worldwide)
const ENDPOINTS = {
  schedule: `${WORKER_BASE}/sync/schedule`,
  homework: `${WORKER_BASE}/sync/homework`,
  attendance: `${WORKER_BASE}/sync/attendance`
};

// Fallback direct bins
const FALLBACK_BINS = {
  schedule: 'https://extendsclass.com/api/json-storage/bin/cecbcbf',
  homework: 'https://extendsclass.com/api/json-storage/bin/dfdebcc',
  attendance: 'https://extendsclass.com/api/json-storage/bin/cdaacff'
};

export interface GroupCloudData {
  homework: HomeworkItem[];
  deletedIds?: string[];
  scheduleOverrides: Record<string, Partial<Lesson>>;
  subjectTeachers: Record<string, string>;
  attendance: AttendanceRecord[];
  lastUpdated?: number;
}

import { SEED_SCHEDULE_OVERRIDES, SEED_SUBJECT_TEACHERS, SEED_ATTENDANCE, SEED_HOMEWORK } from '../defaultData';

// Module-level cache per group to prevent cross-group cache pollution (Senior Review 2.3)
const lastFetchedDataMap: Record<string, GroupCloudData> = {};
const lastFetchTimeMap: Record<string, number> = {};

// Sanitize teacher names: replace outdated generic "Кафедра ИНГТ" with verified professors
export const sanitizeTeachers = (teachers: Record<string, string>, groupId = 'ingt-310'): Record<string, string> => {
  if (!teachers || typeof teachers !== 'object') return {};
  const res: Record<string, string> = { ...teachers };
  for (const [key, val] of Object.entries(res)) {
    if (val === 'Кафедра ИНГТ' || !val) {
      if (groupId === 'ingt-310' && SEED_SUBJECT_TEACHERS[key]) {
        res[key] = SEED_SUBJECT_TEACHERS[key];
      } else if (key.includes('бурения')) {
        res[key] = 'Драницына Елена Геннадьевна';
      } else if (key.includes('сосудов')) {
        res[key] = 'Крючков Дмитрий Александрович';
      } else if (key.includes('Практико-ориентированный')) {
        res[key] = 'Колибасов Владимир Александрович';
      } else if (groupId === 'ingt-310') {
        res[key] = SEED_SUBJECT_TEACHERS[key] || '';
      }
    }
  }
  return res;
};

// Sanitize schedule overrides: clear outdated "Кафедра ИНГТ" overrides
export const sanitizeOverrides = (overrides: Record<string, Partial<Lesson>>): Record<string, Partial<Lesson>> => {
  if (!overrides || typeof overrides !== 'object') return {};
  const res: Record<string, Partial<Lesson>> = {};
  for (const [id, ov] of Object.entries(overrides)) {
    if (!ov) continue;
    const clean = { ...ov };
    if (clean.teacher === 'Кафедра ИНГТ') {
      delete clean.teacher;
    }
    res[id] = clean;
  }
  return res;
};

export const getLocalBackup = (groupId = 'ingt-310'): GroupCloudData => {
  try {
    const hw = localStorage.getItem(`homework_${groupId}`);
    const ov = localStorage.getItem(`schedule_overrides_${groupId}`);
    const st = localStorage.getItem(`subject_teachers_${groupId}`);
    const att = localStorage.getItem(`attendance_${groupId}`);

    const defaultHw = (hw === null && groupId === 'ingt-310') ? SEED_HOMEWORK : [];
    const defaultOv = (ov === null && groupId === 'ingt-310') ? SEED_SCHEDULE_OVERRIDES : {};
    const defaultSt = (st === null && groupId === 'ingt-310') ? SEED_SUBJECT_TEACHERS : {};
    const defaultAtt = (att === null && groupId === 'ingt-310') ? SEED_ATTENDANCE : [];

    const deletedHw: string[] = JSON.parse(localStorage.getItem(`deleted_hw_${groupId}`) || '[]');
    const deletedSet = new Set(deletedHw);

    const rawLocalHw: HomeworkItem[] = hw ? JSON.parse(hw) : [];
    // Strict isolation: only keep items belonging to this groupId
    const localHw = rawLocalHw.filter(it => it && (!it.groupId || it.groupId === groupId));
    const localOv = ov ? JSON.parse(ov) : {};
    const localSt = st ? JSON.parse(st) : {};
    const localAtt: AttendanceRecord[] = att ? JSON.parse(att) : [];

    const hwMap = new Map<string, HomeworkItem>();
    defaultHw.forEach(it => { if (it && it.id && !deletedSet.has(it.id)) hwMap.set(it.id, { ...it, groupId: it.groupId || groupId }); });
    localHw.forEach(it => { if (it && it.id && !deletedSet.has(it.id)) hwMap.set(it.id, { ...it, groupId: it.groupId || groupId }); });

    const attMap = new Map<string, AttendanceRecord>();
    defaultAtt.forEach(it => { if (it) attMap.set(it.docId || `${it.groupId || groupId}_${it.date}_${it.lessonId}`, { ...it, groupId: it.groupId || groupId }); });
    localAtt.forEach(it => { if (it) attMap.set(it.docId || `${it.groupId || groupId}_${it.date}_${it.lessonId}`, { ...it, groupId: it.groupId || groupId }); });

    return {
      homework: Array.from(hwMap.values()),
      scheduleOverrides: sanitizeOverrides({ ...defaultOv, ...localOv }),
      subjectTeachers: sanitizeTeachers({ ...defaultSt, ...localSt }, groupId),
      attendance: Array.from(attMap.values()),
      lastUpdated: 0
    };
  } catch (e) {
    let safeDeletedSet = new Set<string>();
    try {
      safeDeletedSet = new Set(JSON.parse(localStorage.getItem(`deleted_hw_${groupId}`) || '[]'));
    } catch {}
    return {
      homework: groupId === 'ingt-310' ? SEED_HOMEWORK.filter(it => it && it.id && !safeDeletedSet.has(it.id)) : [],
      scheduleOverrides: groupId === 'ingt-310' ? sanitizeOverrides(SEED_SCHEDULE_OVERRIDES) : {},
      subjectTeachers: groupId === 'ingt-310' ? sanitizeTeachers(SEED_SUBJECT_TEACHERS, groupId) : {},
      attendance: groupId === 'ingt-310' ? SEED_ATTENDANCE : [],
      lastUpdated: 0
    };
  }
};

// Safe fetch with cache-busting and timeout
const fetchJson = async (url: string, timeoutMs = 6000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const cacheBuster = url.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`;
    const res = await fetch(url + cacheBuster, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    clearTimeout(id);
    if (!res.ok) return null;
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json && json.error) {
        console.warn('Cloud API rate limit or error:', json.error);
        return null;
      }
      return json;
    } catch {
      // Non-JSON response (e.g. unrouted worker fallback)
      return null;
    }
  } catch (e) {
    clearTimeout(id);
    return null;
  }
};

// Safe PUT with timeout
const putJson = async (url: string, body: any, timeoutMs = 7000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'PUT',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });
    clearTimeout(id);
    if (res.ok) {
      const text = await res.text();
      // If the response is the default text from an un-updated worker, consider it failed
      if (text.includes('Running OK') && !text.includes('status') && !text.includes('data')) {
        return false;
      }
      return true;
    }
    return false;
  } catch (e) {
    clearTimeout(id);
    return false;
  }
};

// Helper to unwrap atomic cloud payload
const parseCloudPayload = (raw: any): any => {
  if (!raw) return null;
  if (raw.payload && typeof raw.payload === 'string') {
    try {
      return JSON.parse(raw.payload);
    } catch (e) {
      return null;
    }
  }
  if (raw.data) {
    if (typeof raw.data === 'string') {
      try { return JSON.parse(raw.data); } catch (e) {}
    }
    return raw.data;
  }
  return raw;
};

const fetchWithFallback = async (primaryUrl: string, fallbackUrl: string) => {
  const p = await fetchJson(primaryUrl, 3500);
  if (p !== null) return p;
  return await fetchJson(fallbackUrl, 3500);
};

const safePut = async (primaryUrl: string, fallbackUrl: string, body: any) => {
  const ok = await putJson(primaryUrl, body);
  if (ok) return true;
  return await putJson(fallbackUrl, body);
};

export const fetchGroupCloudData = async (force: boolean = false, groupId = 'ingt-310'): Promise<GroupCloudData | null> => {
  const now = Date.now();
  if (!force && lastFetchedDataMap[groupId] && now - (lastFetchTimeMap[groupId] || 0) < 4000) {
    return lastFetchedDataMap[groupId];
  }

  const localBackup = getLocalBackup(groupId);

  try {
    // Fetch all 3 dedicated endpoints in parallel with fallback
    const [schedRes, hwRes, attRes] = await Promise.allSettled([
      fetchWithFallback(ENDPOINTS.schedule, FALLBACK_BINS.schedule),
      fetchWithFallback(ENDPOINTS.homework, FALLBACK_BINS.homework),
      fetchWithFallback(ENDPOINTS.attendance, FALLBACK_BINS.attendance)
    ]);

    let cloudScheduleOverrides: Record<string, Partial<Lesson>> = localBackup.scheduleOverrides || {};
    let cloudSubjectTeachers: Record<string, string> = localBackup.subjectTeachers || {};
    if (schedRes.status === 'fulfilled' && schedRes.value) {
      const d = parseCloudPayload(schedRes.value);
      if (d && typeof d === 'object') {
        if (d.byGroup && d.byGroup[groupId]) {
          const gData = d.byGroup[groupId];
          if (gData.overrides !== undefined) cloudScheduleOverrides = gData.overrides;
          if (gData.teachers !== undefined) cloudSubjectTeachers = gData.teachers;
        } else if (groupId === 'ingt-310') {
          if (d.overrides !== undefined) cloudScheduleOverrides = d.overrides;
          if (d.teachers !== undefined) cloudSubjectTeachers = d.teachers;
        } else {
          cloudScheduleOverrides = {};
          cloudSubjectTeachers = {};
        }

        // Sanitize out old generic "Кафедра ИНГТ"
        cloudScheduleOverrides = sanitizeOverrides(cloudScheduleOverrides);
        cloudSubjectTeachers = sanitizeTeachers(cloudSubjectTeachers, groupId);

        try { localStorage.setItem(`schedule_overrides_${groupId}`, JSON.stringify(cloudScheduleOverrides)); } catch (e) {}
        try { localStorage.setItem(`subject_teachers_${groupId}`, JSON.stringify(cloudSubjectTeachers)); } catch (e) {}
      }
    }

    let cloudHomework: HomeworkItem[] = localBackup.homework || [];
    let deletedSet = new Set<string>();
    try {
      deletedSet = new Set(JSON.parse(localStorage.getItem(`deleted_hw_${groupId}`) || '[]'));
    } catch (e) {}

    if (hwRes.status === 'fulfilled' && hwRes.value) {
      const d = parseCloudPayload(hwRes.value);
      if (d && typeof d === 'object') {
        let rawItems: any[] = [];
        let rawDeletedIds: any[] = [];

        if (d.byGroup && d.byGroup[groupId]) {
          rawItems = Array.isArray(d.byGroup[groupId].items) ? d.byGroup[groupId].items : [];
          rawDeletedIds = Array.isArray(d.byGroup[groupId].deletedIds) ? d.byGroup[groupId].deletedIds : [];
        } else if (Array.isArray(d.items)) {
          rawItems = d.items.filter((h: any) => (h.groupId || 'ingt-310') === groupId);
          rawDeletedIds = Array.isArray(d.deletedIds) ? d.deletedIds : [];
        }

        rawDeletedIds.forEach((id: any) => {
          if (id) deletedSet.add(String(id));
        });
        try {
          localStorage.setItem(`deleted_hw_${groupId}`, JSON.stringify(Array.from(deletedSet)));
        } catch (e) {}

        cloudHomework = rawItems
          .filter((h: any) => h && h.id && !deletedSet.has(String(h.id)))
          .map((h: any) => ({
            id: String(h.id),
            groupId: String(h.groupId || groupId),
            subject: String(h.subject || ''),
            title: String(h.title || ''),
            description: String(h.description || ''),
            assignedDate: String(h.assignedDate || ''),
            dueDate: String(h.dueDate || ''),
            attachments: Array.isArray(h.attachments) ? h.attachments : [],
            createdAt: String(h.createdAt || '')
          }))
          .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

        try { localStorage.setItem(`homework_${groupId}`, JSON.stringify(cloudHomework)); } catch (e) {}
      }
    }

    let cloudAttendance: AttendanceRecord[] = localBackup.attendance || [];
    if (attRes.status === 'fulfilled' && attRes.value) {
      const d = parseCloudPayload(attRes.value);
      if (d && typeof d === 'object') {
        let rawRecords: any[] = [];
        if (d.byGroup && d.byGroup[groupId] && Array.isArray(d.byGroup[groupId].records)) {
          rawRecords = d.byGroup[groupId].records;
        } else if (Array.isArray(d.records)) {
          rawRecords = d.records.filter((a: any) => (a.groupId || 'ingt-310') === groupId);
        }

        cloudAttendance = rawRecords.map((a: any) => ({
          docId: String(a.docId || `${groupId}_${a.date}_${a.lessonId}`),
          groupId: String(a.groupId || groupId),
          date: String(a.date || ''),
          lessonId: String(a.lessonId || ''),
          absentStudentIds: Array.isArray(a.absentStudentIds) ? a.absentStudentIds : [],
          excusedStudentIds: Array.isArray(a.excusedStudentIds) ? a.excusedStudentIds : [],
          isCancelled: !!a.isCancelled,
          updatedAt: a.updatedAt,
          updatedBy: a.updatedBy
        }));
        try { localStorage.setItem(`attendance_${groupId}`, JSON.stringify(cloudAttendance)); } catch (e) {}
      }
    }

    const result: GroupCloudData = {
      homework: cloudHomework,
      deletedIds: Array.from(deletedSet),
      scheduleOverrides: cloudScheduleOverrides,
      subjectTeachers: cloudSubjectTeachers,
      attendance: cloudAttendance,
      lastUpdated: now
    };

    lastFetchedDataMap[groupId] = result;
    lastFetchTimeMap[groupId] = now;
    return result;
  } catch (e) {
    console.warn('Cloud sync parallel fetch error:', e);
    return lastFetchedDataMap[groupId] || localBackup;
  }
};

export const pushGroupCloudData = async (partialUpdate: Partial<GroupCloudData>, groupId = 'ingt-310'): Promise<boolean> => {
  const promises: Promise<boolean>[] = [];

  // 1. Schedule overrides / teachers push with multi-group preservation
  if (partialUpdate.scheduleOverrides !== undefined || partialUpdate.subjectTeachers !== undefined) {
    const local = getLocalBackup(groupId);
    const overrides = partialUpdate.scheduleOverrides !== undefined 
      ? sanitizeOverrides(partialUpdate.scheduleOverrides)
      : sanitizeOverrides({ ...(lastFetchedDataMap[groupId]?.scheduleOverrides || {}), ...(local.scheduleOverrides || {}) });
    const teachers = partialUpdate.subjectTeachers !== undefined 
      ? sanitizeTeachers(partialUpdate.subjectTeachers, groupId)
      : sanitizeTeachers({ ...(lastFetchedDataMap[groupId]?.subjectTeachers || {}), ...(local.subjectTeachers || {}) }, groupId);

    promises.push((async () => {
      const currentRaw = await fetchWithFallback(ENDPOINTS.schedule, FALLBACK_BINS.schedule);
      const current = parseCloudPayload(currentRaw) || {};
      const byGroup = current.byGroup || {};
      byGroup[groupId] = { overrides, teachers, updatedAt: Date.now() };

      const payload: any = { byGroup, updatedAt: Date.now() };
      if (groupId === 'ingt-310') {
        payload.overrides = overrides;
        payload.teachers = teachers;
      } else if (current.overrides) {
        payload.overrides = sanitizeOverrides(current.overrides);
        payload.teachers = sanitizeTeachers(current.teachers, 'ingt-310');
      }

      return await safePut(ENDPOINTS.schedule, FALLBACK_BINS.schedule, {
        payload: JSON.stringify(payload),
        updatedAt: Date.now()
      });
    })());
  }

  // 2. Homework push with multi-group preservation (Senior 2.2 & User Report)
  if (partialUpdate.homework !== undefined) {
    let localDeleted: string[] = [];
    try {
      localDeleted = JSON.parse(localStorage.getItem(`deleted_hw_${groupId}`) || '[]');
    } catch (e) {}

    const passedDeleted = partialUpdate.deletedIds || [];
    const allDeleted = Array.from(new Set([...localDeleted, ...passedDeleted]));

    const normalizeType = (t?: string) => {
      if (!t) return 'file';
      if (t === 'link' || t.includes('link')) return 'link';
      if (t.includes('image')) return 'image';
      if (t.includes('pdf')) return 'pdf';
      if (t.includes('word') || t.includes('document') || t.includes('msword')) return 'doc';
      if (t.includes('sheet') || t.includes('excel')) return 'xls';
      return 'file';
    };

    const sanitizedHw = partialUpdate.homework.map(item => ({
      ...item,
      groupId: item.groupId || groupId,
      attachments: (item.attachments || []).map(att => {
        const cleanType = normalizeType(att.type);
        if (att.data && att.data.length > 75000) {
          return {
            name: att.name,
            type: cleanType,
            size: att.size,
            url: att.url || ''
          };
        }
        return {
          ...att,
          type: cleanType
        };
      })
    }));

    promises.push((async () => {
      const currentRaw = await fetchWithFallback(ENDPOINTS.homework, FALLBACK_BINS.homework);
      const current = parseCloudPayload(currentRaw) || {};
      const byGroup = current.byGroup || {};
      byGroup[groupId] = {
        items: sanitizedHw,
        deletedIds: allDeleted,
        updatedAt: Date.now()
      };

      // Aggregate all items with group tags for backward compatibility
      const allItems: HomeworkItem[] = [];
      const allDeletedSet = new Set<string>();
      Object.entries(byGroup).forEach(([gid, grp]: [string, any]) => {
        (grp.items || []).forEach((it: HomeworkItem) => allItems.push({ ...it, groupId: it.groupId || gid }));
        (grp.deletedIds || []).forEach((id: string) => allDeletedSet.add(id));
      });

      return await safePut(ENDPOINTS.homework, FALLBACK_BINS.homework, {
        payload: JSON.stringify({
          byGroup,
          items: allItems,
          deletedIds: Array.from(allDeletedSet)
        }),
        updatedAt: Date.now()
      });
    })());
  }

  // 3. Attendance push with multi-group preservation
  if (partialUpdate.attendance !== undefined) {
    const updatedAtt = partialUpdate.attendance.map(r => ({ ...r, groupId: r.groupId || groupId }));

    promises.push((async () => {
      const currentRaw = await fetchWithFallback(ENDPOINTS.attendance, FALLBACK_BINS.attendance);
      const current = parseCloudPayload(currentRaw) || {};
      const byGroup = current.byGroup || {};
      byGroup[groupId] = {
        records: updatedAtt,
        updatedAt: Date.now()
      };

      const allRecords: AttendanceRecord[] = [];
      Object.entries(byGroup).forEach(([gid, grp]: [string, any]) => {
        (grp.records || []).forEach((r: AttendanceRecord) => allRecords.push({ ...r, groupId: r.groupId || gid }));
      });

      return await safePut(ENDPOINTS.attendance, FALLBACK_BINS.attendance, {
        payload: JSON.stringify({
          byGroup,
          records: allRecords
        }),
        updatedAt: Date.now()
      });
    })());
  }

  if (promises.length === 0) return true;

  const results = await Promise.allSettled(promises);
  return results.every(r => r.status === 'fulfilled' && r.value === true);
};
