import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DaySchedule, Lesson } from '../types';
import DayColumn from './DayColumn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDayCalendarDate, getSamaraDate, getSemesterWeek, getDayName } from '../attendance';
import { TeacherAssignmentScope } from './EditLessonModal';

interface SwipeableDaysProps {
  days: DaySchedule[];
  weekNumber?: number;
  userRole?: string;
  onUpdateLesson?: (lessonId: string, updated: Partial<Lesson>, applyScope?: TeacherAssignmentScope) => void;
  onResetLesson?: (lessonId: string) => void;
}

const SwipeableDays: React.FC<SwipeableDaysProps> = ({ 
  days,
  weekNumber = 1,
  userRole,
  onUpdateLesson,
  onResetLesson,
}) => {
  const samaraToday = useMemo(() => getSamaraDate(), []);
  const currentSemesterWeek = useMemo(() => getSemesterWeek(samaraToday), [samaraToday]);
  const todayDayName = useMemo(() => getDayName(samaraToday), [samaraToday]);

  // Determine initial day: if viewing current semester week, select today's day!
  const initialIndex = useMemo(() => {
    if (weekNumber === currentSemesterWeek && days.length > 0) {
      const idx = days.findIndex(d => d.dayName === todayDayName);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  }, [weekNumber, currentSemesterWeek, todayDayName, days]);

  const [activeDayIndex, setActiveDayIndex] = useState<number>(initialIndex);
  
  // Directional Lock swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  // Day chips scroll container
  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const dayChipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // When weekNumber changes, auto-select today if on current week, or Monday
  useEffect(() => {
    if (weekNumber === currentSemesterWeek && days.length > 0) {
      const idx = days.findIndex(d => d.dayName === todayDayName);
      setActiveDayIndex(idx >= 0 ? idx : 0);
    } else {
      setActiveDayIndex(0);
    }
  }, [weekNumber, currentSemesterWeek, todayDayName, days]);

  // Scroll active day chip horizontally WITHOUT jerking the main page!
  useEffect(() => {
    const container = chipsContainerRef.current;
    const chip = dayChipRefs.current[activeDayIndex];
    if (container && chip) {
      const targetLeft = chip.offsetLeft - (container.clientWidth / 2) + (chip.clientWidth / 2);
      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth'
      });
    }
  }, [activeDayIndex]);

  if (!days || days.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm w-full">
        <p className="text-slate-400">Расписание для этой группы не найдено.</p>
      </div>
    );
  }

  // Touch handlers with Directional Lock:
  // Distinguishes vertical page scroll from horizontal day swipe within the first 8px of finger movement!
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (isHorizontalSwipe.current !== null) return; // Already locked

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = Math.abs(currentX - touchStartX.current);
    const diffY = Math.abs(currentY - touchStartY.current);

    // After 8px movement, lock gesture direction!
    if (diffX > 8 || diffY > 8) {
      if (diffX > diffY * 1.15) {
        // Clear horizontal swipe intent
        isHorizontalSwipe.current = true;
      } else {
        // Vertical scroll intent: lock out swiping so scrolling down never flips days!
        isHorizontalSwipe.current = false;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) {
      touchStartX.current = null;
      touchStartY.current = null;
      isHorizontalSwipe.current = null;
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = Math.abs(touchStartY.current - touchEndY);
    const elapsed = Date.now() - touchStartTime.current;

    // Fast flick (> 20px in < 280ms) or intentional drag (> 35px)
    const isQuickFlick = Math.abs(diffX) > 20 && elapsed < 280;
    const isDistanceSwipe = Math.abs(diffX) > 35;
    const horizontalIntent = isHorizontalSwipe.current === true || (isHorizontalSwipe.current === null && Math.abs(diffX) > diffY * 1.2);

    if (horizontalIntent && (isDistanceSwipe || isQuickFlick) && Math.abs(diffX) > diffY) {
      if (diffX > 0 && activeDayIndex < days.length - 1) {
        // Swiped left -> Next day
        setActiveDayIndex(prev => prev + 1);
      } else if (diffX < 0 && activeDayIndex > 0) {
        // Swiped right -> Previous day
        setActiveDayIndex(prev => prev - 1);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchStartTime.current = 0;
    isHorizontalSwipe.current = null;
  };

  const handleTouchCancel = () => {
    touchStartX.current = null;
    touchStartY.current = null;
    touchStartTime.current = 0;
    isHorizontalSwipe.current = null;
  };

  const getShortDayName = (dayName: string) => {
    switch (dayName) {
      case 'Понедельник': return 'Пн';
      case 'Вторник': return 'Вт';
      case 'Среда': return 'Ср';
      case 'Четверг': return 'Чт';
      case 'Пятница': return 'Пт';
      case 'Суббота': return 'Сб';
      case 'Воскресенье': return 'Вс';
      default: return dayName.slice(0, 2);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-clip">
      {/* Day Selector Chips (Mobile Horizontal Row with Calendar Dates & Today Badge) */}
      <div 
        ref={chipsContainerRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none sm:hidden w-full max-w-full"
      >
        {days.map((day, idx) => {
          const shortName = getShortDayName(day.dayName);
          const calDate = getDayCalendarDate(day.dayName, weekNumber);
          const isToday = weekNumber === currentSemesterWeek && day.dayName === todayDayName;

          return (
            <button
              key={day.dayName}
              ref={el => { dayChipRefs.current[idx] = el; }}
              onClick={() => setActiveDayIndex(idx)}
              className={`px-3 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition-all flex flex-col items-center gap-0.5 shrink-0 relative ${
                activeDayIndex === idx
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none scale-[1.02]'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              } ${isToday && activeDayIndex !== idx ? 'border-indigo-400 dark:border-indigo-500 ring-1 ring-indigo-400' : ''}`}
            >
              <div className="flex items-center gap-1">
                <span>{shortName}</span>
                {isToday && (
                  <span className={`text-[8px] font-extrabold px-1 rounded ${
                    activeDayIndex === idx ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  }`}>
                    Сегодня
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${activeDayIndex === idx ? 'text-indigo-200' : 'text-slate-400'}`}>
                {calDate}
              </span>
            </button>
          );
        })}
      </div>

      {/* Swipe Container (Mobile) - touch-pan-y guarantees immediate, smooth native vertical scroll! */}
      <div
        className="sm:hidden relative w-full max-w-full touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <div key={activeDayIndex} className="animate-in fade-in duration-150">
          <DayColumn 
            daySchedule={days[activeDayIndex] || days[0]} 
            weekNumber={weekNumber}
            userRole={userRole}
            onUpdateLesson={onUpdateLesson}
            onResetLesson={onResetLesson}
          />
        </div>

        {/* Navigation Arrows */}
        <div className="flex justify-between items-center mt-4 w-full">
          <button
            onClick={() => setActiveDayIndex(prev => Math.max(0, prev - 1))}
            disabled={activeDayIndex === 0}
            className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-30 border border-slate-200 dark:border-slate-700 min-h-[44px] transition-transform active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" /> Назад
          </button>
          <span className="text-xs text-slate-400 font-medium">
            {activeDayIndex + 1} из {days.length} (Свайп влево/вправо)
          </span>
          <button
            onClick={() => setActiveDayIndex(prev => Math.min(days.length - 1, prev + 1))}
            disabled={activeDayIndex === days.length - 1}
            className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-30 border border-slate-200 dark:border-slate-700 min-h-[44px] transition-transform active:scale-95"
          >
            Вперед <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Layout for Desktop/Tablet */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start w-full">
        {days.map(day => (
          <DayColumn 
            key={day.dayName} 
            daySchedule={day} 
            weekNumber={weekNumber}
            userRole={userRole}
            onUpdateLesson={onUpdateLesson}
            onResetLesson={onResetLesson}
          />
        ))}
      </div>
    </div>
  );
};

export default SwipeableDays;
