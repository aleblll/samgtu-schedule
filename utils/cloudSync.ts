import { HomeworkItem, Lesson } from '../types';
import { AttendanceRecord } from '../attendance';

// Dedicated isolated cloud endpoints on restful-api.dev (prevents 413 and cross-table collisions)
const ENDPOINTS = {
  schedule: 'https://api.restful-api.dev/objects/ff808181a067127101a06866ce810497',
  homework: 'https://api.restful-api.dev/objects/ff808181a067127101a06866951a0496',
  attendance: 'https://api.restful-api.dev/objects/ff808181a067127101a068670e9a0498'
};

export interface GroupCloudData {
  homework: HomeworkItem[];
  scheduleOverrides: Record<string, Partial<Lesson>>;
  subjectTeachers: Record<string, string>;
  attendance: AttendanceRecord[];
  lastUpdated?: number;
}

let lastFetchedData: GroupCloudData | null = null;
let lastFetchTime = 0;

import { SEED_SCHEDULE_OVERRIDES, SEED_SUBJECT_TEACHERS, SEED_ATTENDANCE, SEED_HOMEWORK } from '../defaultData';

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

    const localHw: HomeworkItem[] = hw ? JSON.parse(hw) : [];
    const localOv = ov ? JSON.parse(ov) : {};
    const localSt = st ? JSON.parse(st) : {};
    const localAtt: AttendanceRecord[] = att ? JSON.parse(att) : [];

    const hwMap = new Map<string, HomeworkItem>();
    defaultHw.forEach(it => { if (it && it.id && !deletedSet.has(it.id)) hwMap.set(it.id, it); });
    localHw.forEach(it => { if (it && it.id && !deletedSet.has(it.id)) hwMap.set(it.id, it); });

    const attMap = new Map<string, AttendanceRecord>();
    defaultAtt.forEach(it => { if (it) attMap.set(it.docId || `${it.groupId}_${it.date}_${it.lessonId}`, it); });
    localAtt.forEach(it => { if (it) attMap.set(it.docId || `${it.groupId}_${it.date}_${it.lessonId}`, it); });

    return {
      homework: Array.from(hwMap.values()),
      scheduleOverrides: { ...defaultOv, ...localOv },
      subjectTeachers: { ...defaultSt, ...localSt },
      attendance: Array.from(attMap.values()),
      lastUpdated: 0
    };
  } catch (e) {
    let safeDeletedSet = new Set<string>();
    try {
      safeDeletedSet = new Set(JSON.parse(localStorage.getItem(`deleted_hw_${groupId}`) || '[]'));
    } catch {}
    return {
      homework: SEED_HOMEWORK.filter(it => it && it.id && !safeDeletedSet.has(it.id)),
      scheduleOverrides: SEED_SCHEDULE_OVERRIDES,
      subjectTeachers: SEED_SUBJECT_TEACHERS,
      attendance: SEED_ATTENDANCE,
      lastUpdated: 0
    };
  }
};

// Safe fetch with timeout
const fetchJson = async (url: string, timeoutMs = 6000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
    });
    clearTimeout(id);
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.error) {
      console.warn('Cloud API rate limit or error:', json.error);
      return null;
    }
    return json;
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
    return res.ok;
  } catch (e) {
    clearTimeout(id);
    return false;
  }
};

export const fetchGroupCloudData = async (force: boolean = false, groupId = 'ingt-310'): Promise<GroupCloudData | null> => {
  const now = Date.now();
  if (!force && lastFetchedData && now - lastFetchTime < 4000) {
    return lastFetchedData;
  }

  const localBackup = getLocalBackup(groupId);

  try {
    // Fetch all 3 dedicated endpoints in parallel
    const [schedRes, hwRes, attRes] = await Promise.allSettled([
      fetchJson(ENDPOINTS.schedule),
      fetchJson(ENDPOINTS.homework),
      fetchJson(ENDPOINTS.attendance)
    ]);

    let cloudScheduleOverrides: Record<string, Partial<Lesson>> = localBackup.scheduleOverrides || {};
    let cloudSubjectTeachers: Record<string, string> = localBackup.subjectTeachers || {};
    if (schedRes.status === 'fulfilled' && schedRes.value?.data) {
      const d = schedRes.value.data;
      if (d.overrides && typeof d.overrides === 'object') {
        cloudScheduleOverrides = d.overrides;
        try { localStorage.setItem(`schedule_overrides_${groupId}`, JSON.stringify(d.overrides)); } catch (e) {}
      }
      if (d.teachers && typeof d.teachers === 'object') {
        cloudSubjectTeachers = d.teachers;
        try { localStorage.setItem(`subject_teachers_${groupId}`, JSON.stringify(d.teachers)); } catch (e) {}
      }
    }

    let cloudHomework: HomeworkItem[] = localBackup.homework || [];
    let deletedSet = new Set<string>();
    try {
      deletedSet = new Set(JSON.parse(localStorage.getItem(`deleted_hw_${groupId}`) || '[]'));
    } catch (e) {}

    if (hwRes.status === 'fulfilled' && hwRes.value?.data && Array.isArray(hwRes.value.data.items)) {
      const raw = hwRes.value.data.items;
      if (raw.length > 0) {
        // Union merge with local items by ID, strictly respecting tombstone list
        const map = new Map<string, HomeworkItem>();
        cloudHomework.forEach(h => { if (h?.id && !deletedSet.has(h.id)) map.set(h.id, h); });
        raw.forEach((h: any) => {
          if (h && h.id && !deletedSet.has(String(h.id))) {
            map.set(String(h.id), {
              id: String(h.id),
              groupId: String(h.groupId || groupId),
              subject: String(h.subject || ''),
              title: String(h.title || ''),
              description: String(h.description || ''),
              assignedDate: String(h.assignedDate || ''),
              dueDate: String(h.dueDate || ''),
              attachments: Array.isArray(h.attachments) ? h.attachments : [],
              createdAt: String(h.createdAt || '')
            });
          }
        });
        cloudHomework = Array.from(map.values()).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
        try { localStorage.setItem(`homework_${groupId}`, JSON.stringify(cloudHomework)); } catch (e) {}
      }
    }

    let cloudAttendance: AttendanceRecord[] = localBackup.attendance || [];
    if (attRes.status === 'fulfilled' && attRes.value?.data && Array.isArray(attRes.value.data.records)) {
      const raw = attRes.value.data.records;
      if (raw.length > 0) {
        cloudAttendance = raw.map((a: any) => ({
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
      scheduleOverrides: cloudScheduleOverrides,
      subjectTeachers: cloudSubjectTeachers,
      attendance: cloudAttendance,
      lastUpdated: now
    };

    lastFetchedData = result;
    lastFetchTime = now;
    return result;
  } catch (e) {
    console.warn('Cloud sync parallel fetch error:', e);
    return lastFetchedData || localBackup;
  }
};

export const pushGroupCloudData = async (partialUpdate: Partial<GroupCloudData>, groupId = 'ingt-310'): Promise<boolean> => {
  const promises: Promise<boolean>[] = [];

  // 1. Schedule overrides / teachers push
  if (partialUpdate.scheduleOverrides !== undefined || partialUpdate.subjectTeachers !== undefined) {
    const local = getLocalBackup(groupId);
    const overrides = partialUpdate.scheduleOverrides !== undefined ? partialUpdate.scheduleOverrides : local.scheduleOverrides;
    const teachers = partialUpdate.subjectTeachers !== undefined ? partialUpdate.subjectTeachers : local.subjectTeachers;
    promises.push(
      putJson(ENDPOINTS.schedule, {
        name: 'samgtu_3ingt110_schedule',
        data: { overrides, teachers, updatedAt: Date.now() }
      })
    );
  }

  // 2. Homework push
  if (partialUpdate.homework !== undefined) {
    // Sanitize attachments: normalize MIME types and strip heavy base64 to avoid 413 / 500 HTTP errors
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
      attachments: (item.attachments || []).map(att => {
        const cleanType = normalizeType(att.type);
        if (att.data && att.data.length > 200000) {
          return {
            name: att.name,
            type: cleanType,
            size: att.size,
            url: att.url
            // heavy base64 data stripped for cloud payload so Nginx won't return 413!
          };
        }
        return {
          ...att,
          type: cleanType
        };
      })
    }));

    promises.push(
      putJson(ENDPOINTS.homework, {
        name: 'samgtu_3ingt110_hw',
        data: { items: sanitizedHw, updatedAt: Date.now() }
      })
    );
  }

  // 3. Attendance push
  if (partialUpdate.attendance !== undefined) {
    promises.push(
      putJson(ENDPOINTS.attendance, {
        name: 'samgtu_3ingt110_attendance',
        data: { records: partialUpdate.attendance, updatedAt: Date.now() }
      })
    );
  }

  if (promises.length === 0) return true;

  const results = await Promise.allSettled(promises);
  return results.some(r => r.status === 'fulfilled' && r.value === true);
};
