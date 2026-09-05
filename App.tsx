import React, { useState, useEffect, useMemo } from 'react';
import { SCHEDULE_REGISTRY, AVAILABLE_GROUPS, FACULTIES, ADMIN_PIN, GROUP_STAROSTA_PINS } from './constants';
import { getSemesterWeek, getWeekDateRange, getDayISODate, useAttendance, getSamaraDate, getSamaraISODate } from './attendance';
import AttendanceTracker from './components/AttendanceTracker';
import HomeworkTracker from './components/HomeworkTracker';
import SubjectTeachersModal from './components/SubjectTeachersModal';
import SwipeableDays from './components/SwipeableDays';
import BottomNav from './components/BottomNav';
import GroupManager from './components/GroupManager';
import AdminPanel from './components/AdminPanel';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';
import { UserRole, Lesson } from './types';
import { TeacherAssignmentScope } from './components/EditLessonModal';
import { fetchGroupCloudData, pushGroupCloudData, sanitizeTeachers, sanitizeOverrides } from './utils/cloudSync';
import { SEED_SCHEDULE_OVERRIDES, SEED_SUBJECT_TEACHERS } from './defaultData';
import {
  LogIn, LogOut, Calendar, BookOpen, ClipboardCheck, Sun, Moon,
  GraduationCap, Users, RefreshCw, Shield, User as UserIcon, Key, UserCheck, ChevronDown
} from 'lucide-react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved) return saved === 'dark';
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.colorScheme) {
      return window.Telegram.WebApp.colorScheme === 'dark';
    }
    return (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  });
  const [activeTab, setActiveTab] = useState<'schedule' | 'homework' | 'attendance' | 'group' | 'admin' | 'profile'>('schedule');
  const [user, setUser] = useState<User | null>(null);
  
  // Default role is 'student' for unauthenticated users
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('user_role') as UserRole) || 'student';
  });

  // Track which group this starosta has authority over
  const [starostaGroupId, setStarostaGroupId] = useState<string | null>(() => {
    return localStorage.getItem('starosta_group_id') || null;
  });

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quickPin, setQuickPin] = useState('');
  const [isSubjectTeachersModalOpen, setIsSubjectTeachersModalOpen] = useState(false);

  // Student group binding: check if student has already bound their group
  const [boundGroupId, setBoundGroupId] = useState<string | null>(() => {
    return localStorage.getItem('my_group_id') || null;
  });
  const [isGroupSelectionModalOpen, setIsGroupSelectionModalOpen] = useState(() => {
    return !localStorage.getItem('my_group_id');
  });

  // Multi-group state: defaults to bound group, then saved selection, then 3-ИНГТ-110
  const [currentGroupId, setCurrentGroupId] = useState<string>(() => {
    const bound = localStorage.getItem('my_group_id');
    if (bound && AVAILABLE_GROUPS.some(g => g.id === bound)) return bound;
    const saved = localStorage.getItem('selected_group_id');
    if (saved === 'ingt-1') return 'ingt-301';
    if (saved === 'faid-110') return 'faid-310';
    if (saved && AVAILABLE_GROUPS.some(g => g.id === saved)) return saved;
    return 'ingt-310';
  });

  // Effective Role: Starosta only has edit rights in their designated group.
  // When viewing other groups, they become a read-only 'student'.
  // Global admin PIN 2808 has full access across all groups.
  const effectiveRole: UserRole = useMemo(() => {
    if (userRole === 'admin') return 'admin';
    if (userRole === 'starosta') {
      if (starostaGroupId && currentGroupId === starostaGroupId) {
        return 'starosta';
      }
      return 'student';
    }
    return 'student';
  }, [userRole, starostaGroupId, currentGroupId]);

  const canEdit = effectiveRole === 'admin' || effectiveRole === 'starosta';

  const handleSelectGroup = (groupId: string) => {
    setBoundGroupId(groupId);
    setCurrentGroupId(groupId);
    localStorage.setItem('my_group_id', groupId);
    localStorage.setItem('selected_group_id', groupId);
    setIsGroupSelectionModalOpen(false);
    const grp = AVAILABLE_GROUPS.find(g => g.id === groupId);
    toast.success(`Выбрана группа ${grp?.name || groupId}`);
  };

  const currentGroupConfig = useMemo(() => {
    return AVAILABLE_GROUPS.find(g => g.id === currentGroupId) || AVAILABLE_GROUPS[0];
  }, [currentGroupId]);

  const currentFaculty = useMemo(() => {
    return FACULTIES.find(f => f.id === currentGroupConfig?.facultyId) || FACULTIES[0];
  }, [currentGroupConfig]);

  // Load attendance records and markAttendance for cross-linking cancelled lessons
  const { records: attendanceRecords, markAttendance } = useAttendance(
    canEdit, 
    currentGroupId, 
    refreshTrigger
  );

  // Calculate current week automatically based on Samara time (UTC+4) starting Aug 31, 2026
  const samaraNow = useMemo(() => getSamaraDate(), [refreshTrigger]);
  const currentWeek = useMemo(() => getSemesterWeek(samaraNow, currentGroupId), [samaraNow, currentGroupId]);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);

  // Global Subject Teachers mapping (e.g. subject -> teacher)
  const [subjectTeachers, setSubjectTeachers] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`subject_teachers_${currentGroupId}`);
      const parsed = saved ? JSON.parse(saved) : {};
      return sanitizeTeachers({ ...SEED_SUBJECT_TEACHERS, ...parsed });
    } catch (e) {
      return sanitizeTeachers({ ...SEED_SUBJECT_TEACHERS });
    }
  });

  // Schedule Overrides (Edited teachers, rooms, notes per lesson)
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, Partial<Lesson>>>(() => {
    try {
      const saved = localStorage.getItem(`schedule_overrides_${currentGroupId}`);
      if (saved !== null) {
        return sanitizeOverrides(JSON.parse(saved));
      }
      return sanitizeOverrides({ ...SEED_SCHEDULE_OVERRIDES });
    } catch (e) {
      return sanitizeOverrides({ ...SEED_SCHEDULE_OVERRIDES });
    }
  });

  useEffect(() => {
    setSelectedWeek(currentWeek);
  }, [currentWeek]);

  // Sync group selection and reload group-specific overrides and teachers
  useEffect(() => {
    localStorage.setItem('selected_group_id', currentGroupId);
    try {
      const savedOv = localStorage.getItem(`schedule_overrides_${currentGroupId}`);
      setScheduleOverrides(savedOv ? sanitizeOverrides(JSON.parse(savedOv)) : sanitizeOverrides({ ...SEED_SCHEDULE_OVERRIDES }));
    } catch {
      setScheduleOverrides(sanitizeOverrides({ ...SEED_SCHEDULE_OVERRIDES }));
    }
    try {
      const savedSt = localStorage.getItem(`subject_teachers_${currentGroupId}`);
      setSubjectTeachers(savedSt ? sanitizeTeachers({ ...SEED_SUBJECT_TEACHERS, ...JSON.parse(savedSt) }) : sanitizeTeachers({ ...SEED_SUBJECT_TEACHERS }));
    } catch {
      setSubjectTeachers(sanitizeTeachers({ ...SEED_SUBJECT_TEACHERS }));
    }
  }, [currentGroupId]);

  // Telegram WebApp auto-expand, ready and events
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.enableClosingConfirmation?.();
      } catch (e) {}

      const handleThemeChange = () => {
        try {
          if (!localStorage.getItem('app_theme') && window.Telegram?.WebApp?.colorScheme) {
            setDarkMode(window.Telegram.WebApp.colorScheme === 'dark');
          }
        } catch (e) {}
      };

      try {
        window.Telegram.WebApp.onEvent?.('themeChanged', handleThemeChange);
      } catch (e) {}

      return () => {
        try {
          window.Telegram?.WebApp?.offEvent?.('themeChanged', handleThemeChange);
        } catch (e) {}
      };
    }
  }, []);

  // Save role to localStorage
  useEffect(() => {
    localStorage.setItem('user_role', userRole);
  }, [userRole]);

  // Theme preference persistence and Telegram UI sync
  useEffect(() => {
    localStorage.setItem('app_theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.setHeaderColor?.(darkMode ? '#0f172a' : '#ffffff');
        window.Telegram.WebApp.setBackgroundColor?.(darkMode ? '#020617' : '#f8fafc');
      } catch (e) {}
    }
  }, [darkMode]);

  // Real-time Cloud Sync for Subject Teachers and Schedule Overrides (via universal REST cloud)
  useEffect(() => {
    let isMounted = true;

    const loadCloud = async (force: boolean = false) => {
      const cloud = await fetchGroupCloudData(force, currentGroupId);
      if (cloud && isMounted) {
        if (cloud.scheduleOverrides !== undefined) {
          const cleanOv = sanitizeOverrides(cloud.scheduleOverrides);
          setScheduleOverrides(cleanOv);
          try {
            localStorage.setItem(`schedule_overrides_${currentGroupId}`, JSON.stringify(cleanOv));
          } catch (e) {}
        }
        if (cloud.subjectTeachers !== undefined) {
          const cleanSt = sanitizeTeachers(cloud.subjectTeachers);
          setSubjectTeachers(cleanSt);
          try {
            localStorage.setItem(`subject_teachers_${currentGroupId}`, JSON.stringify(cleanSt));
          } catch (e) {}
        }
      }
    };

    loadCloud(true);

    const timer = setInterval(() => {
      loadCloud(false);
    }, 15000); // 15s real-time cloud sync across devices

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadCloud(true);
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(timer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [currentGroupId, refreshTrigger]);

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        if (currentUser.email === 'alexeyberezin2@gmail.com') {
          setUserRole('admin');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    try {
      const cloud = await fetchGroupCloudData(true, currentGroupId);
      if (cloud) {
        if (cloud.scheduleOverrides !== undefined) {
          const cleanOv = sanitizeOverrides(cloud.scheduleOverrides);
          setScheduleOverrides(cleanOv);
        }
        if (cloud.subjectTeachers !== undefined) {
          const cleanSt = sanitizeTeachers(cloud.subjectTeachers);
          setSubjectTeachers(cleanSt);
        }
      }
    } catch (e) {}
    toast.success('Данные обновлены');
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleQuickPinLogin = () => {
    const pin = quickPin.trim().toLowerCase();
    if (pin === ADMIN_PIN) {
      setUserRole('admin');
      setStarostaGroupId(null);
      localStorage.removeItem('starosta_group_id');
      toast.success('Активирован режим ГЛАВНОГО АДМИНИСТРАТОРА (все группы)');
      setQuickPin('');
    } else if (pin === '101') {
      setUserRole('starosta');
      setStarostaGroupId('ingt-301');
      localStorage.setItem('starosta_group_id', 'ingt-301');
      setCurrentGroupId('ingt-301');
      localStorage.setItem('my_group_id', 'ingt-301');
      setBoundGroupId('ingt-301');
      toast.success('Активирован режим СТАРОСТЫ (3-ИНГТ-101)');
      setQuickPin('');
    } else if (pin === '103') {
      setUserRole('starosta');
      setStarostaGroupId('ingt-303');
      localStorage.setItem('starosta_group_id', 'ingt-303');
      setCurrentGroupId('ingt-303');
      localStorage.setItem('my_group_id', 'ingt-303');
      setBoundGroupId('ingt-303');
      toast.success('Активирован режим СТАРОСТЫ (3-ИНГТ-103)');
      setQuickPin('');
    } else if (pin === '110') {
      setUserRole('starosta');
      if (currentGroupId === 'faid-310') {
        setStarostaGroupId('faid-310');
        localStorage.setItem('starosta_group_id', 'faid-310');
        toast.success('Активирован режим СТАРОСТЫ (3-ФАИД-110)');
      } else {
        setStarostaGroupId('ingt-310');
        localStorage.setItem('starosta_group_id', 'ingt-310');
        setCurrentGroupId('ingt-310');
        localStorage.setItem('my_group_id', 'ingt-310');
        setBoundGroupId('ingt-310');
        toast.success('Активирован режим СТАРОСТЫ (3-ИНГТ-110)');
      }
      setQuickPin('');
    } else if (pin === 'faid110' || pin === '3110') {
      setUserRole('starosta');
      setStarostaGroupId('faid-310');
      localStorage.setItem('starosta_group_id', 'faid-310');
      setCurrentGroupId('faid-310');
      localStorage.setItem('my_group_id', 'faid-310');
      setBoundGroupId('faid-310');
      toast.success('Активирован режим СТАРОСТЫ (3-ФАИД-110)');
      setQuickPin('');
    } else {
      toast.error('Неверный PIN-код доступа');
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserRole('student');
    setStarostaGroupId(null);
    localStorage.removeItem('starosta_group_id');
    toast.success('Вы перешли в режим Студента');
  };

  // Schedule Customization Handlers (Editing Teacher, Room, Notes)
  const handleUpdateLesson = async (lessonId: string, updatedLesson: Partial<Lesson>, applyScope: TeacherAssignmentScope = 'type') => {
    if (!canEdit) {
      toast.error('Только Староста своей группы или Администратор могут редактировать пары');
      return;
    }

    const currentOverride = scheduleOverrides[lessonId] || {};
    const merged = {
      ...currentOverride,
      ...updatedLesson
    };

    // If note is emptied or whitespace, delete the note property so it does not persist
    if (updatedLesson.note !== undefined && updatedLesson.note.trim() === '') {
      delete merged.note;
    }

    const updated = {
      ...scheduleOverrides,
      [lessonId]: merged
    };

    // If this lesson has no customized properties left, remove it from overrides
    if (Object.keys(merged).length === 0) {
      delete updated[lessonId];
    }

    setScheduleOverrides(updated);
    try {
      localStorage.setItem(`schedule_overrides_${currentGroupId}`, JSON.stringify(updated));
    } catch (e) {}

    // Find the original lesson to know its type, default teacher, etc.
    let originalLesson: Lesson | undefined;
    const weeks = SCHEDULE_REGISTRY[currentGroupId] || {};
    for (const days of Object.values(weeks)) {
      for (const day of days) {
        const found = day.lessons.find(l => l.id === lessonId);
        if (found) {
          originalLesson = found;
          break;
        }
      }
      if (originalLesson) break;
    }

    const lessonType = originalLesson?.type || updatedLesson.type || 'Занятие';
    const originalTeacher = originalLesson?.teacher || '';
    const currentTeacher = currentOverride.teacher !== undefined 
      ? currentOverride.teacher 
      : (subjectTeachers[`${updatedLesson.subject}::${lessonType}`] || subjectTeachers[updatedLesson.subject || ''] || originalTeacher);

    const isTeacherChanged = updatedLesson.teacher !== undefined && updatedLesson.teacher.trim() !== currentTeacher.trim();
    const isNoteChanged = updatedLesson.note !== undefined && updatedLesson.note !== (currentOverride.note || '');
    const isLocationChanged = updatedLesson.location !== undefined && updatedLesson.location !== (currentOverride.location || originalLesson?.location || '');
    const isCancelledChanged = updatedLesson.isCancelled !== undefined && updatedLesson.isCancelled !== !!currentOverride.isCancelled;

    if (isCancelledChanged) {
      // Find the day for this lesson to get ISO date
      const allDays = Object.values(SCHEDULE_REGISTRY[currentGroupId] || {}).flatMap(days => days);
      const targetDay = allDays.find(d => d.lessons.some(l => l.id === lessonId));
      const dayName = targetDay?.dayName || 'Понедельник';
      const isoDate = getDayISODate(dayName, selectedWeek);
      const existingAtt = attendanceRecords.find(r => r.date === isoDate && r.lessonId === lessonId);
      markAttendance(
        isoDate, 
        lessonId, 
        existingAtt?.absentStudentIds || [], 
        existingAtt?.excusedStudentIds || [], 
        updatedLesson.isCancelled!
      );
    }

    // Handle Teacher Assignment Scope (only if teacher actually changed!):
    if (isTeacherChanged && updatedLesson.subject && updatedLesson.teacher) {
      if (applyScope === 'type') {
        const key = `${updatedLesson.subject}::${lessonType}`;
        const updatedTeachers = {
          ...subjectTeachers,
          [key]: updatedLesson.teacher
        };
        setSubjectTeachers(updatedTeachers);
        try {
          localStorage.setItem(`subject_teachers_${currentGroupId}`, JSON.stringify(updatedTeachers));
        } catch (e) {}

        // Push to REST Cloud immediately (syncs to all classmates)
        pushGroupCloudData({ scheduleOverrides: updated, subjectTeachers: updatedTeachers }, currentGroupId);

        try {
          await setDoc(doc(db, 'subject_teachers', currentGroupId), updatedTeachers, { merge: true });
        } catch (e) {
          console.warn('Error syncing subject teachers:', e);
        }

        if (isNoteChanged) {
          toast.success('Преподаватель и заметка к паре сохранены');
        } else {
          toast.success(`Преподаватель «${updatedLesson.teacher}» назначен на все «${lessonType}»`);
        }
      } else if (applyScope === 'all') {
        const updatedTeachers = {
          ...subjectTeachers,
          [updatedLesson.subject]: updatedLesson.teacher
        };

        // Also update all types for this subject
        const weeks = SCHEDULE_REGISTRY[currentGroupId] || {};
        Object.values(weeks).forEach(days => {
          days.forEach(day => {
            day.lessons.forEach(l => {
              if (l.subject === updatedLesson.subject) {
                updatedTeachers[`${l.subject}::${l.type}`] = updatedLesson.teacher!;
              }
            });
          });
        });

        setSubjectTeachers(updatedTeachers);
        try {
          localStorage.setItem(`subject_teachers_${currentGroupId}`, JSON.stringify(updatedTeachers));
        } catch (e) {}

        // Push to REST Cloud immediately (syncs to all classmates)
        pushGroupCloudData({ scheduleOverrides: updated, subjectTeachers: updatedTeachers }, currentGroupId);

        try {
          await setDoc(doc(db, 'subject_teachers', currentGroupId), updatedTeachers, { merge: true });
        } catch (e) {
          console.warn('Error syncing subject teachers:', e);
        }

        if (isNoteChanged) {
          toast.success('Преподаватель (на все пары) и заметка сохранены');
        } else {
          toast.success(`Преподаватель «${updatedLesson.teacher}» назначен на ВСЕ виды занятий предмета`);
        }
      } else {
        // Push single pair override to cloud
        pushGroupCloudData({ scheduleOverrides: updated }, currentGroupId);
        toast.success(isNoteChanged ? 'Преподаватель и заметка к паре сохранены' : 'Преподаватель пары обновлен');
      }
    } else if (isCancelledChanged) {
      pushGroupCloudData({ scheduleOverrides: updated }, currentGroupId);
      if (updatedLesson.isCancelled) {
        toast.warning('Пара отменена для всей группы');
      } else {
        toast.success('Пара восстановлена в расписании');
      }
    } else if (isNoteChanged) {
      // Only note was changed:
      pushGroupCloudData({ scheduleOverrides: updated }, currentGroupId);
      toast.success(updatedLesson.note ? 'Заметка к паре добавлена для всей группы!' : 'Заметка к паре удалена');
    } else if (isLocationChanged) {
      // Only location was changed:
      pushGroupCloudData({ scheduleOverrides: updated }, currentGroupId);
      toast.success('Аудитория пары обновлена для группы');
    } else {
      // Push single pair override to cloud
      pushGroupCloudData({ scheduleOverrides: updated }, currentGroupId);
      toast.success('Данные пары сохранены для группы');
    }

    // Sync with Firestore Cloud
    try {
      await setDoc(doc(db, 'schedule_overrides', lessonId), merged, { merge: true });
    } catch (e) {
      console.warn('Cloud sync error for update:', e);
    }
  };

  const handleSaveSubjectTeachers = async (updated: Record<string, string>) => {
    setSubjectTeachers(updated);
    try {
      localStorage.setItem(`subject_teachers_${currentGroupId}`, JSON.stringify(updated));
    } catch (e) {}

    // Push to REST Cloud immediately
    pushGroupCloudData({ subjectTeachers: updated }, currentGroupId);

    toast.success('Список преподавателей сохранен для всех 4 недель расписания');

    try {
      await setDoc(doc(db, 'subject_teachers', currentGroupId), updated);
    } catch (e) {
      console.warn('Error saving subject teachers to cloud:', e);
    }
  };

  const handleResetLesson = async (lessonId: string) => {
    if (!canEdit) return;

    const updated = { ...scheduleOverrides };
    delete updated[lessonId];

    setScheduleOverrides(updated);
    try {
      localStorage.setItem(`schedule_overrides_${currentGroupId}`, JSON.stringify(updated));
    } catch (e) {}

    // Also un-cancel in attendance if it was cancelled
    const allDays = Object.values(SCHEDULE_REGISTRY[currentGroupId] || {}).flatMap(days => days);
    const targetDay = allDays.find(d => d.lessons.some(l => l.id === lessonId));
    const dayName = targetDay?.dayName || 'Понедельник';
    const isoDate = getDayISODate(dayName, selectedWeek);
    const existingAtt = attendanceRecords.find(r => r.date === isoDate && r.lessonId === lessonId);
    if (existingAtt && existingAtt.isCancelled) {
      markAttendance(isoDate, lessonId, existingAtt.absentStudentIds, existingAtt.excusedStudentIds || [], false);
    }

    // Push reset to REST Cloud immediately
    pushGroupCloudData({ scheduleOverrides: updated }, currentGroupId);

    toast.info('Пара сброшена до исходного расписания');

    try {
      await deleteDoc(doc(db, 'schedule_overrides', lessonId));
    } catch (e) {}
  };

  // Merge default schedule with subject teachers, attendance cancellations, overrides & custom lessons
  const currentSchedule = useMemo(() => {
    const rawSchedule = SCHEDULE_REGISTRY[currentGroupId]?.[selectedWeek] || [];
    return rawSchedule.map(day => {
      const isoDate = getDayISODate(day.dayName, selectedWeek);
      const standardLessons = day.lessons.map(lesson => {
        const override = scheduleOverrides[lesson.id] || {};
        const teacherByType = subjectTeachers[`${lesson.subject}::${lesson.type}`];
        const flatTeacher = subjectTeachers[lesson.subject];
        const resolvedTeacher = override.teacher !== undefined ? override.teacher : (teacherByType || flatTeacher || lesson.teacher);
        
        // Check if this lesson is marked as cancelled on this specific date in Attendance tracker
        const isCancelledInAttendance = attendanceRecords.some(
          r => r.date === isoDate && r.lessonId === lesson.id && r.isCancelled
        );

        return {
          ...lesson,
          teacher: resolvedTeacher,
          ...override,
          isCancelled: isCancelledInAttendance || !!override.isCancelled
        };
      });

      // Include dynamically added custom lessons for empty days / weeks
      const customLessons: Lesson[] = Object.entries(scheduleOverrides)
        .filter(([id, rawOv]) => {
          const ov = rawOv as Partial<Lesson> & { dayName?: string };
          const isCustom = id.includes('_extra_') || id.includes('_custom_');
          const matchesDay = ov.dayName === day.dayName || id.startsWith(`${day.dayName.toLowerCase()}_w${selectedWeek}_`);
          const notAlreadyIncluded = !day.lessons.some(l => l.id === id);
          return isCustom && matchesDay && notAlreadyIncluded;
        })
        .map(([id, rawOv]) => {
          const ov = rawOv as Partial<Lesson>;
          return {
            id,
            timeStart: ov.timeStart || '08:00',
            timeEnd: ov.timeEnd || '09:35',
            subject: ov.subject || 'Новая пара',
            type: ov.type || 'Лекции',
            location: ov.location || '',
            teacher: ov.teacher || '',
            order: ov.order || (standardLessons.length + 1),
            ...ov
          } as Lesson;
        });

      const allLessons = [...standardLessons, ...customLessons].sort((a, b) => 
        (a.timeStart || '').localeCompare(b.timeStart || '')
      );

      return {
        ...day,
        lessons: allLessons
      };
    });
  }, [currentGroupId, selectedWeek, scheduleOverrides, attendanceRecords, subjectTeachers]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200 pb-28">
      <Toaster position="top-center" offset={75} richColors />

      {/* Header with Safe Area Inset */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 w-full pt-safe">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200 dark:shadow-none">
                {currentGroupConfig.course}
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Расписание {currentGroupConfig.name}
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  {currentFaculty.shortName} • СамГТУ
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs (Senior Review P0) */}
            <nav className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'schedule'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Расписание
              </button>
              <button
                onClick={() => setActiveTab('homework')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'homework'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> ДЗ
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'attendance'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" /> Посещение
              </button>
              <button
                onClick={() => setActiveTab('group')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'group'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Группа
              </button>
              {effectiveRole === 'admin' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" /> Админ
                </button>
              )}
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'profile'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" /> Профиль
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Обновить данные"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              </button>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Переключить тему"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Group and Week Controls */}
          <div className="mt-3 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                {userRole === 'student' ? (
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 min-h-[36px] flex items-center gap-1.5">
                    <span>{currentGroupConfig.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({currentGroupConfig.course} курс)</span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={currentGroupId}
                      onChange={(e) => {
                        setCurrentGroupId(e.target.value);
                        localStorage.setItem('selected_group_id', e.target.value);
                      }}
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 min-h-[36px] pr-7 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none transition-colors"
                    >
                      {AVAILABLE_GROUPS.map(g => (
                        <option key={g.id} value={g.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {g.name} ({g.course} курс)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {canEdit && activeTab === 'schedule' && (
                  <button
                    onClick={() => setIsSubjectTeachersModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold rounded-xl transition-all"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Преподаватели
                  </button>
                )}
                
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  effectiveRole === 'admin' 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                    : effectiveRole === 'starosta' 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {effectiveRole === 'admin' ? 'admin' : (userRole === 'starosta' ? (effectiveRole === 'starosta' ? 'starosta' : 'гость (студент)') : 'student')}
                </span>
              </div>
            </div>

            {/* 4-Week Cycle Switcher - Grid of 4 equal buttons (Zero overflow!) */}
            {activeTab === 'schedule' && (
              <div className="space-y-1.5 w-full">
                <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl w-full">
                  {[1, 2, 3, 4].map(w => (
                    <button
                      key={w}
                      onClick={() => setSelectedWeek(w)}
                      className={`py-1.5 text-center rounded-xl text-xs font-bold transition-all ${
                        selectedWeek === w
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Нед. {w} {w === currentWeek && '★'}
                    </button>
                  ))}
                </div>
                <div className="text-center text-[11px] font-medium text-slate-400">
                  Даты недели: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{getWeekDateRange(selectedWeek)}</span>
                  {selectedWeek === currentWeek && <span className="text-amber-500 font-semibold ml-1.5">(Текущая)</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full max-w-full">
        {activeTab === 'schedule' && (
          <SwipeableDays 
            days={currentSchedule} 
            weekNumber={selectedWeek}
            userRole={effectiveRole}
            onUpdateLesson={handleUpdateLesson}
            onResetLesson={handleResetLesson}
          />
        )}

        {activeTab === 'homework' && (
          <HomeworkTracker
            currentGroupId={currentGroupId}
            userRole={effectiveRole}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceTracker
            isAuthenticated={canEdit}
            userRole={effectiveRole}
            userEmail={user?.email || null}
            currentGroupId={currentGroupId}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'group' && (
          <GroupManager
            currentGroupId={currentGroupId}
            userRole={effectiveRole}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            currentRole={effectiveRole}
            onRoleChange={(role, targetGroup) => {
              setUserRole(role);
              if (role === 'starosta' && targetGroup) {
                setStarostaGroupId(targetGroup);
                localStorage.setItem('starosta_group_id', targetGroup);
              } else if (role !== 'starosta') {
                setStarostaGroupId(null);
                localStorage.removeItem('starosta_group_id');
              }
              if (targetGroup) {
                setCurrentGroupId(targetGroup);
                localStorage.setItem('my_group_id', targetGroup);
                setBoundGroupId(targetGroup);
              }
            }}
            userEmail={user?.email || null}
          />
        )}

        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <UserIcon className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {user ? user.displayName || user.email : `Студент ${currentGroupConfig.name}`}
              </h2>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                effectiveRole === 'admin' 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' 
                  : effectiveRole === 'starosta' 
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
              }`}>
                Роль: {effectiveRole} {userRole === 'starosta' && effectiveRole === 'student' && `(Староста группы ${AVAILABLE_GROUPS.find(g => g.id === starostaGroupId)?.name || starostaGroupId})`}
              </span>
            </div>

            {/* Academic Group Binding */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  <span>Ваша учебная группа</span>
                </div>
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 rounded-lg">
                  {currentGroupConfig.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Расписание, посещаемость и домашние задания привязаны к этой группе.
              </p>
              <button
                onClick={() => setIsGroupSelectionModalOpen(true)}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm min-h-[44px] flex items-center justify-center gap-2"
              >
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                Сменить учебную группу
              </button>
            </div>

            {/* Quick PIN Login Form */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Key className="w-4 h-4 text-indigo-500" />
                <span>Авторизация по PIN-коду</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={quickPin}
                  onChange={(e) => setQuickPin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickPinLogin()}
                  placeholder="Введите PIN-код"
                  className="flex-1 px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none min-h-[44px]"
                />
                <button
                  onClick={handleQuickPinLogin}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm shrink-0 min-h-[44px]"
                >
                  Войти
                </button>
              </div>
            </div>

            {userRole !== 'student' && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm min-h-[44px]"
              >
                <LogOut className="w-4 h-4" /> Выйти в режим Студента
              </button>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={activeTab}
        onTabChange={setActiveTab}
        userRole={effectiveRole}
        isLoggedIn={canEdit || !!user}
      />

      {/* Global Subject Teachers Modal */}
      {isSubjectTeachersModalOpen && (
        <SubjectTeachersModal
          isOpen={isSubjectTeachersModalOpen}
          onClose={() => setIsSubjectTeachersModalOpen(false)}
          currentGroupId={currentGroupId}
          subjectTeachers={subjectTeachers}
          onSave={handleSaveSubjectTeachers}
        />
      )}

      {/* Group Selection Modal (Onboarding & Switching) */}
      {isGroupSelectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 mx-auto bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Выберите вашу группу
              </h3>
              <p className="text-xs text-slate-400">
                Расписание и задания будут настроены для вашей группы СамГТУ:
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {AVAILABLE_GROUPS.map((grp) => {
                const isSelected = currentGroupId === grp.id;
                const faculty = FACULTIES.find(f => f.id === grp.facultyId);
                return (
                  <button
                    key={grp.id}
                    onClick={() => handleSelectGroup(grp.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all min-h-[52px] ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{grp.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {faculty?.shortName || grp.facultyId.toUpperCase()} • {grp.course} курс
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {boundGroupId && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsGroupSelectionModalOpen(false)}
                  className="w-full py-2.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
