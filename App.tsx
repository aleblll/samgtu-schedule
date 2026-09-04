import React, { useState, useEffect, useMemo } from 'react';
import { SCHEDULE_REGISTRY, AVAILABLE_GROUPS } from './constants';
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
import { fetchGroupCloudData, pushGroupCloudData } from './utils/cloudSync';
import { SEED_SCHEDULE_OVERRIDES, SEED_SUBJECT_TEACHERS } from './defaultData';
import {
  LogIn, LogOut, Calendar, BookOpen, ClipboardCheck, Sun, Moon,
  GraduationCap, Users, RefreshCw, Shield, User as UserIcon, Key, UserCheck
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

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quickPin, setQuickPin] = useState('');
  const [isSubjectTeachersModalOpen, setIsSubjectTeachersModalOpen] = useState(false);

  // Fixed group: 3-ИНГТ-110
  const currentGroupId = 'ingt-310';

  // Load attendance records for cross-linking cancelled lessons
  const { records: attendanceRecords } = useAttendance(
    userRole === 'admin' || userRole === 'starosta', 
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
      return { ...SEED_SUBJECT_TEACHERS, ...parsed };
    } catch (e) {
      return { ...SEED_SUBJECT_TEACHERS };
    }
  });

  // Schedule Overrides (Edited teachers, rooms, notes per lesson)
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, Partial<Lesson>>>(() => {
    try {
      const saved = localStorage.getItem(`schedule_overrides_${currentGroupId}`);
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return { ...SEED_SCHEDULE_OVERRIDES };
    } catch (e) {
      return { ...SEED_SCHEDULE_OVERRIDES };
    }
  });

  useEffect(() => {
    setSelectedWeek(currentWeek);
  }, [currentWeek]);

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
          setScheduleOverrides(cloud.scheduleOverrides);
          try {
            localStorage.setItem(`schedule_overrides_${currentGroupId}`, JSON.stringify(cloud.scheduleOverrides));
          } catch (e) {}
        }
        if (cloud.subjectTeachers !== undefined) {
          setSubjectTeachers(cloud.subjectTeachers);
          try {
            localStorage.setItem(`subject_teachers_${currentGroupId}`, JSON.stringify(cloud.subjectTeachers));
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
        if (cloud.scheduleOverrides !== undefined) setScheduleOverrides(cloud.scheduleOverrides);
        if (cloud.subjectTeachers !== undefined) setSubjectTeachers(cloud.subjectTeachers);
      }
    } catch (e) {}
    toast.success('Данные обновлены');
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleQuickPinLogin = () => {
    if (quickPin === '110') {
      setUserRole('starosta');
      toast.success('Активирован режим СТАРОСТЫ (3-ИНГТ-110)');
      setQuickPin('');
    } else if (quickPin === '2808') {
      setUserRole('admin');
      toast.success('Активирован режим ГЛАВНОГО АДМИНИСТРАТОРА');
      setQuickPin('');
    } else {
      toast.error('Неверный PIN-код доступа');
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserRole('student');
    toast.success('Вы перешли в режим Студента');
  };

  // Schedule Customization Handlers (Editing Teacher, Room, Notes)
  const handleUpdateLesson = async (lessonId: string, updatedLesson: Partial<Lesson>, applyScope: TeacherAssignmentScope = 'type') => {
    if (userRole === 'student') {
      toast.error('Только Староста или Админ могут редактировать пары');
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
        pushGroupCloudData({ scheduleOverrides: updated, subjectTeachers: updatedTeachers });

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
    if (userRole === 'student') return;

    const updated = { ...scheduleOverrides };
    delete updated[lessonId];

    setScheduleOverrides(updated);
    try {
      localStorage.setItem(`schedule_overrides_${currentGroupId}`, JSON.stringify(updated));
    } catch (e) {}

    // Push reset to REST Cloud immediately
    pushGroupCloudData({ scheduleOverrides: updated }, currentGroupId);

    toast.info('Пара сброшена до исходного расписания');

    try {
      await deleteDoc(doc(db, 'schedule_overrides', lessonId));
    } catch (e) {}
  };

  // Merge default schedule with subject teachers, attendance cancellations & overrides
  const currentSchedule = useMemo(() => {
    const rawSchedule = SCHEDULE_REGISTRY[currentGroupId]?.[selectedWeek] || [];
    return rawSchedule.map(day => {
      const isoDate = getDayISODate(day.dayName, selectedWeek);
      return {
        ...day,
        lessons: day.lessons.map(lesson => {
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
        })
      };
    });
  }, [currentGroupId, selectedWeek, scheduleOverrides, attendanceRecords, subjectTeachers]);

  const canEdit = userRole === 'admin' || userRole === 'starosta';

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200 pb-28">
      <Toaster position="top-center" offset={75} richColors />

      {/* Header with Safe Area Inset */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 w-full pt-safe">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200 dark:shadow-none">
                3
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Расписание 3-ИНГТ-110
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  СамГТУ • Мобильное приложение
                </p>
              </div>
            </div>

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Группа 3-ИНГТ-110
                </span>
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
                  userRole === 'admin' 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                    : userRole === 'starosta' 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {userRole}
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
            userRole={userRole}
            onUpdateLesson={handleUpdateLesson}
            onResetLesson={handleResetLesson}
          />
        )}

        {activeTab === 'homework' && (
          <HomeworkTracker
            currentGroupId={currentGroupId}
            userRole={userRole}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceTracker
            isAuthenticated={userRole === 'admin' || userRole === 'starosta'}
            userRole={userRole}
            userEmail={user?.email || null}
            currentGroupId={currentGroupId}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'group' && (
          <GroupManager
            currentGroupId={currentGroupId}
            userRole={userRole}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            currentRole={userRole}
            onRoleChange={setUserRole}
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
                {user ? user.displayName || user.email : 'Студент 3-ИНГТ-110'}
              </h2>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                userRole === 'admin' 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' 
                  : userRole === 'starosta' 
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
              }`}>
                Роль: {userRole}
              </span>
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
        userRole={userRole}
        isLoggedIn={userRole !== 'student' || !!user}
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
    </div>
  );
};

export default App;
