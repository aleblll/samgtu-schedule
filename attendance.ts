import { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, onSnapshot, serverTimestamp, query, where } from 'firebase/firestore';
import { db, auth } from './firebase';
import { toast } from 'sonner';
import { Student, Registry } from './types';
import { fetchGroupCloudData, pushGroupCloudData } from './utils/cloudSync';
import { SEED_ATTENDANCE } from './defaultData';

export const STUDENTS_REGISTRY: Registry<Student[]> = {
  'ingt-310': [
    { id: 1, name: "Березин Алексей Александрович" },
    { id: 2, name: "Бочарников Роман Владимирович" },
    { id: 3, name: "Васильев Тимур Икромжонович" },
    { id: 4, name: "Вырмаскин Иван Денисович" },
    { id: 5, name: "Данилов Никита Владимирович" },
    { id: 6, name: "Дьячков Илья Игоревич" },
    { id: 7, name: "Зеляев Александр Андреевич" },
    { id: 8, name: "Колотыркин Даниил Дмитриевич" },
    { id: 9, name: "Кондрашов Матвей Иванович" },
    { id: 10, name: "Малыгин Илья Алексеевич" },
    { id: 11, name: "Мантуров Егор Сергеевич" },
    { id: 12, name: "Мячин Владислав Дмитриевич" },
    { id: 13, name: "Поздняков Павел Евгеньевич" },
    { id: 14, name: "Савкин Александр Владимирович" },
    { id: 15, name: "Сычев Никита Дмитриевич" },
    { id: 16, name: "Ульмасова Алина Александровна" }
  ],
  'ingt-301': [
    { id: 1, name: "Александров Данила Игоревич" },
    { id: 2, name: "Белов Артем Сергеевич" },
    { id: 3, name: "Волков Максим Денисович" },
    { id: 4, name: "Григорьева Анна Дмитриевна" }
  ],
  'ingt-303': [
    { id: 1, name: "Кузнецов Михаил Андреевич" },
    { id: 2, name: "Морозов Дмитрий Сергеевич" },
    { id: 3, name: "Новикова Екатерина Павловна" },
    { id: 4, name: "Смирнов Арсений Романович" }
  ],
  'faid-310': [
    { id: 1, name: "Аверьянова Дарья" },
    { id: 2, name: "Антоненко Георгий" },
    { id: 3, name: "Баландина Валерия" },
    { id: 4, name: "Бурханова Виктория" },
    { id: 5, name: "Винк Полина" },
    { id: 6, name: "Внучкова Мария" },
    { id: 7, name: "Губарева Алёна" },
    { id: 8, name: "Зацепина Полина" },
    { id: 9, name: "Зубалова Мария" },
    { id: 10, name: "Иванов Никита" },
    { id: 11, name: "Кирина Варвара" },
    { id: 12, name: "Левина Валерия" },
    { id: 13, name: "Манасыпов Даниил" },
    { id: 14, name: "Петрова Полина" },
    { id: 15, name: "Пивоварова Дарья" },
    { id: 16, name: "Сафонова Виктория" },
    { id: 17, name: "Романова Дарья" },
    { id: 18, name: "Селиванова Юлия" },
    { id: 19, name: "Ушмаева Дарья" },
    { id: 20, name: "Хведчик Вера" },
    { id: 21, name: "Юрьева Ангелина" },
    { id: 22, name: "Яблонская Полина" }
  ],
  // Fallback aliases for existing storage
  'ingt-1': [
    { id: 1, name: "Александров Данила Игоревич" },
    { id: 2, name: "Белов Артем Сергеевич" },
    { id: 3, name: "Волков Максим Денисович" },
    { id: 4, name: "Григорьева Анна Дмитриевна" }
  ],
  'faid-110': [
    { id: 1, name: "Аверьянова Дарья" },
    { id: 2, name: "Антоненко Георгий" },
    { id: 3, name: "Баландина Валерия" },
    { id: 4, name: "Бурханова Виктория" },
    { id: 5, name: "Винк Полина" },
    { id: 6, name: "Внучкова Мария" },
    { id: 7, name: "Губарева Алёна" },
    { id: 8, name: "Зацепина Полина" },
    { id: 9, name: "Зубалова Мария" },
    { id: 10, name: "Иванов Никита" },
    { id: 11, name: "Кирина Варвара" },
    { id: 12, name: "Левина Валерия" },
    { id: 13, name: "Манасыпов Даниил" },
    { id: 14, name: "Петрова Полина" },
    { id: 15, name: "Пивоварова Дарья" },
    { id: 16, name: "Сафонова Виктория" },
    { id: 17, name: "Романова Дарья" },
    { id: 18, name: "Селиванова Юлия" },
    { id: 19, name: "Ушмаева Дарья" },
    { id: 20, name: "Хведчик Вера" },
    { id: 21, name: "Юрьева Ангелина" },
    { id: 22, name: "Яблонская Полина" }
  ],
  'htf-215': [
      {
          "id": 1,
          "name": "Абаджян Нарек Барсегович"
      },
      {
          "id": 2,
          "name": "Астафьева Анна Сергеевна"
      },
      {
          "id": 3,
          "name": "Богословская Анна Владимировна"
      },
      {
          "id": 4,
          "name": "Кривельская Анастасия Дмитриевна"
      },
      {
          "id": 5,
          "name": "Винокурова Татьяна Алексеевна"
      },
      {
          "id": 6,
          "name": "Герасименко Анастасия Андреевна"
      },
      {
          "id": 7,
          "name": "Давыдова Руслана Рустамовна"
      },
      {
          "id": 8,
          "name": "Должковая Дарья Григорьевна"
      },
      {
          "id": 9,
          "name": "Зарицкий Владимир Викторович"
      },
      {
          "id": 10,
          "name": "Козырева Полина Васильевна"
      },
      {
          "id": 11,
          "name": "Матрунич Ева Игоревна"
      },
      {
          "id": 12,
          "name": "Медведева Полина Сергеевна"
      },
      {
          "id": 13,
          "name": "Милованова Анастасия Евгеньевна"
      },
      {
          "id": 14,
          "name": "Митюль Анастасия Максимовна"
      },
      {
          "id": 15,
          "name": "Моисеева Анастасия Игоревна"
      },
      {
          "id": 16,
          "name": "Насирова Эвелина Баратовна"
      },
      {
          "id": 17,
          "name": "Плотников Егор Александрович"
      },
      {
          "id": 18,
          "name": "Пролейко Анастасия Максимовна"
      },
      {
          "id": 19,
          "name": "Ревина Злата Алексеевна"
      },
      {
          "id": 20,
          "name": "Росляков Ярослав Витальевич"
      },
      {
          "id": 21,
          "name": "Самсонова Елизавета Павловна"
      },
      {
          "id": 22,
          "name": "Самотохина Дарья"
      },
      {
          "id": 23,
          "name": "Сахабиев Максим Витальевич"
      },
      {
          "id": 24,
          "name": "Сехина Елизавета Владимировна"
      },
      {
          "id": 25,
          "name": "Сизякова Яна Сергеевна"
      },
      {
          "id": 26,
          "name": "Субботина Ангелина Максимовна"
      },
      {
          "id": 27,
          "name": "Силин Богдан Михайлович"
      },
      {
          "id": 28,
          "name": "Черныш Ирина Михайловна"
      },
      {
          "id": 29,
          "name": "Чуфистов Павел Георгиевич"
      },
      {
          "id": 30,
          "name": "Шатунов Тарас Константинович"
      },
      {
          "id": 31,
          "name": "Щербакова Вероника Сергеевна"
      }
  ],
  '2-htf-115': [],
  'htf-115': [],
  '2-хтф-115': [],
  'ingt-209': [],
  '2-ingt-109': [],
  'ingt-109': []
};

STUDENTS_REGISTRY['2-htf-115'] = STUDENTS_REGISTRY['htf-215'];
STUDENTS_REGISTRY['htf-115'] = STUDENTS_REGISTRY['htf-215'];
STUDENTS_REGISTRY['2-хтф-115'] = STUDENTS_REGISTRY['htf-215'];

export interface AttendanceRecord {
  docId?: string;
  groupId: string;
  date: string; // YYYY-MM-DD
  lessonId: string;
  absentStudentIds: number[];
  excusedStudentIds?: number[];
  isCancelled?: boolean;
  timestamp?: number;
  updatedAt?: any;
  updatedBy?: string;
}

export const useAttendance = (isAuthenticated: boolean, currentGroupId: string | null, refreshTrigger: number = 0) => {
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const defaultList = currentGroupId === 'ingt-310' ? SEED_ATTENDANCE : [];
    if (!currentGroupId) return defaultList;
    try {
      const saved = localStorage.getItem(`attendance_${currentGroupId}`);
      const parsed: AttendanceRecord[] = saved ? JSON.parse(saved) : [];
      const map = new Map<string, AttendanceRecord>();
      defaultList.forEach(r => map.set(r.docId || `${r.groupId}_${r.date}_${r.lessonId}`, r));
      parsed.forEach(r => map.set(r.docId || `${r.groupId}_${r.date}_${r.lessonId}`, r));
      return Array.from(map.values());
    } catch (e) {
      return defaultList;
    }
  });

  const recordsRef = useRef<AttendanceRecord[]>(records);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  // 1. Instant local storage load
  useEffect(() => {
    if (!currentGroupId) return;
    try {
      const saved = localStorage.getItem(`attendance_${currentGroupId}`);
      if (saved) {
        setRecords(JSON.parse(saved));
      }
    } catch (e) {}
  }, [currentGroupId, refreshTrigger]);

  // 2. Real-time Cloud Sync with REST & Firestore (Syncs across all classmates' devices)
  useEffect(() => {
    if (!currentGroupId) return;

    let isMounted = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let firestoreUnsub: (() => void) | null = null;

    const setupSubscription = async () => {
      // 1. Universal REST Cloud sync
      const cloud = await fetchGroupCloudData(true, currentGroupId);
      if (!isMounted) return; // Prevent leak if unmounted during await

      if (cloud && Array.isArray(cloud.attendance)) {
        const localSaved = localStorage.getItem(`attendance_${currentGroupId}`);
        let localCount = 0;
        try {
          localCount = localSaved ? JSON.parse(localSaved).length : 0;
        } catch (e) {}

        if (cloud.attendance.length > 0) {
          setRecords(cloud.attendance);
          try {
            localStorage.setItem(`attendance_${currentGroupId}`, JSON.stringify(cloud.attendance));
          } catch (e) {}
        } else if (localCount > 0) {
          // Auto-heal: cloud was wiped or empty, but local has records -> restore cloud!
          try {
            const localRecords = JSON.parse(localSaved!);
            pushGroupCloudData({ attendance: localRecords }, currentGroupId);
          } catch (e) {}
        }
      }

      // 2. Poll every 20s for attendance updates across devices
      pollTimer = setInterval(async () => {
        if (!isMounted) return;
        const c = await fetchGroupCloudData(false, currentGroupId);
        if (!isMounted) return;
        if (c && Array.isArray(c.attendance) && c.attendance.length > 0) {
          setRecords(c.attendance);
          try {
            localStorage.setItem(`attendance_${currentGroupId}`, JSON.stringify(c.attendance));
          } catch (e) {}
        }
      }, 20000);

      // 3. Also try Firestore in background if available
      try {
        const q = query(collection(db, 'attendance'), where('groupId', '==', currentGroupId));
        firestoreUnsub = onSnapshot(
          q,
          (snapshot) => {
            const cloudRecords = snapshot.docs.map(docSnap => {
              const data = docSnap.data() as AttendanceRecord;
              return { ...data, docId: docSnap.id };
            });

            if (isMounted && cloudRecords.length > 0) {
              setRecords(cloudRecords);
              try {
                localStorage.setItem(`attendance_${currentGroupId}`, JSON.stringify(cloudRecords));
              } catch (e) {}
            }
          },
          () => {}
        );
      } catch (err) {}
    };

    setupSubscription();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isMounted) {
        const c = await fetchGroupCloudData(true, currentGroupId);
        if (isMounted && c && Array.isArray(c.attendance) && c.attendance.length > 0) {
          setRecords(c.attendance);
          try {
            localStorage.setItem(`attendance_${currentGroupId}`, JSON.stringify(c.attendance));
          } catch (e) {}
        }
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
      if (firestoreUnsub) firestoreUnsub();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentGroupId, refreshTrigger]);

  const markBatchAttendance = async (updates: Array<{
    date: string;
    lessonId: string;
    absentStudentIds: number[];
    excusedStudentIds?: number[];
    isCancelled?: boolean;
  }>) => {
    if (!updates || updates.length === 0) return;
    const groupId = currentGroupId || 'ingt-310';

    // 1. Synchronously get current records from ref, state, or localStorage
    let baseList = recordsRef.current && recordsRef.current.length > 0 ? recordsRef.current : records;
    if (baseList.length === 0) {
      try {
        const saved = localStorage.getItem(`attendance_${groupId}`);
        if (saved) baseList = JSON.parse(saved);
      } catch (e) {}
    }

    // 2. Map keyed by date_lessonId for atomic in-memory update
    const map = new Map<string, AttendanceRecord>();
    baseList.forEach(r => map.set(`${r.date}_${r.lessonId}`, r));

    const createdRecords: AttendanceRecord[] = [];

    for (const update of updates) {
      const recordId = `${groupId}_${update.date}_${update.lessonId}`;
      const newRecord: AttendanceRecord = {
        docId: recordId,
        groupId,
        date: update.date,
        lessonId: update.lessonId,
        absentStudentIds: update.absentStudentIds,
        excusedStudentIds: update.excusedStudentIds || [],
        isCancelled: update.isCancelled ?? false,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid || 'starosta_pin'
      };
      map.set(`${update.date}_${update.lessonId}`, newRecord);
      createdRecords.push(newRecord);
    }

    const updatedRecords = Array.from(map.values());

    // 3. Immediately update ref, React state, and LocalStorage
    recordsRef.current = updatedRecords;
    setRecords(updatedRecords);
    try {
      localStorage.setItem(`attendance_${groupId}`, JSON.stringify(updatedRecords));
    } catch (e) {}

    // 4. Push the GUARANTEED valid array to REST Cloud immediately (syncs to all classmates)
    pushGroupCloudData({ attendance: updatedRecords }, groupId);

    // 5. Sync to Firestore Cloud as well in the background
    try {
      for (const rec of createdRecords) {
        if (rec.docId) {
          const recordRef = doc(db, 'attendance', rec.docId);
          setDoc(recordRef, {
            ...rec,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch(() => {});
        }
      }
    } catch (error) {
      console.warn('Firestore batch write saved locally:', error);
    }
  };

  const markAttendance = async (
    date: string, 
    lessonId: string, 
    absentStudentIds: number[], 
    excusedStudentIds: number[] = [], 
    isCancelled: boolean = false
  ) => {
    await markBatchAttendance([{
      date,
      lessonId,
      absentStudentIds,
      excusedStudentIds,
      isCancelled
    }]);

    toast.success(isCancelled ? 'Пара отмечена как отмененная' : 'Посещаемость сохранена');
  };

  const getAttendance = (date: string, lessonId: string): AttendanceRecord => {
    const list = recordsRef.current && recordsRef.current.length > 0 ? recordsRef.current : records;
    const record = list.find(r => r.date === date && r.lessonId === lessonId);
    return record || { groupId: currentGroupId || 'ingt-310', date, lessonId, absentStudentIds: [], excusedStudentIds: [], isCancelled: false };
  };

  return { records, markAttendance, markBatchAttendance, getAttendance };
};

export const BLOCKS = [
  { id: 1, name: "Блок 1 (31.08 - 20.09)", start: "2026-08-31", end: "2026-09-20" },
  { id: 2, name: "Блок 2 (21.09 - 20.10)", start: "2026-09-21", end: "2026-10-20" },
  { id: 3, name: "Блок 3 (21.10 - 20.11)", start: "2026-10-21", end: "2026-11-20" },
  { id: 4, name: "Блок 4 (21.11 - 31.12)", start: "2026-11-21", end: "2026-12-31" } // было 2026-12-25
];

export const getSamaraDate = (): Date => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (4 * 3600000)); // Samara is UTC+4
};

export const getSamaraISODate = (): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Samara',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch (e) {
    const d = getSamaraDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
};

export const getSemesterWeek = (date: Date = getSamaraDate(), groupId?: string): number => {
  // 4-week cycle starts on Monday, August 31, 2026
  const start = new Date(2026, 7, 31);
  const diffTime = date.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 1;
  const cycleLength = 4;
  const week = Math.floor(diffDays / 7) % cycleLength + 1;
  return week;
};

export const getDayName = (date: Date = getSamaraDate()): string => {
  const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  return days[date.getDay()];
};

const SEMESTER_START = new Date(2026, 7, 31); // 31 Aug 2026
const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сент', 'окт', 'нояб', 'дек'];
const DAY_OFFSETS: Record<string, number> = {
  'Понедельник': 0,
  'Вторник': 1,
  'Среда': 2,
  'Четверг': 3,
  'Пятница': 4,
  'Суббота': 5,
  'Воскресенье': 6
};

export const getDayCalendarDate = (dayName: string, weekNumber: number, targetDate: Date = getSamaraDate()): string => {
  const diffTime = targetDate.getTime() - SEMESTER_START.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.max(0, Math.floor(diffDays / 7));
  const cycleIndex = Math.floor(totalWeeks / 4);

  const monday = new Date(SEMESTER_START);
  monday.setDate(SEMESTER_START.getDate() + cycleIndex * 28 + (weekNumber - 1) * 7);

  const offset = DAY_OFFSETS[dayName] !== undefined ? DAY_OFFSETS[dayName] : 0;
  const d = new Date(monday);
  d.setDate(monday.getDate() + offset);

  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
};

export const getWeekDateRange = (weekNumber: number, targetDate: Date = getSamaraDate()): string => {
  const diffTime = targetDate.getTime() - SEMESTER_START.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.max(0, Math.floor(diffDays / 7));
  const cycleIndex = Math.floor(totalWeeks / 4);

  const monday = new Date(SEMESTER_START);
  monday.setDate(SEMESTER_START.getDate() + cycleIndex * 28 + (weekNumber - 1) * 7);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  return `${monday.getDate()} ${RU_MONTHS[monday.getMonth()]} - ${saturday.getDate()} ${RU_MONTHS[saturday.getMonth()]}`;
};

export const getDayISODate = (dayName: string, weekNumber: number, targetDate: Date = getSamaraDate()): string => {
  const diffTime = targetDate.getTime() - SEMESTER_START.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.max(0, Math.floor(diffDays / 7));
  const cycleIndex = Math.floor(totalWeeks / 4);

  const monday = new Date(SEMESTER_START);
  monday.setDate(SEMESTER_START.getDate() + cycleIndex * 28 + (weekNumber - 1) * 7);

  const offset = DAY_OFFSETS[dayName] !== undefined ? DAY_OFFSETS[dayName] : 0;
  const d = new Date(monday);
  d.setDate(monday.getDate() + offset);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
