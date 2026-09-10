import React, { useRef } from 'react';
import { PlannerEvent, WeekParity } from '../types/planner';
import { RUSSIAN_DAYS_SHORT } from '../utils/timeUtils';
import { hapticLight } from '../services/telegram';

interface WeekCalendarStripProps {
  selectedDay: number; // 1..7 (1 = Пн)
  onSelectDay: (day: number) => void;
  currentParity: WeekParity;
  events: PlannerEvent[];
  todayDayOfWeek: number; // 1..7
}

export const WeekCalendarStrip: React.FC<WeekCalendarStripProps> = ({
  selectedDay,
  onSelectDay,
  currentParity,
  events,
  todayDayOfWeek
}) => {
  const touchStartX = useRef<number | null>(null);

  // Обработка свайпов влево/вправо для быстрой смены дня
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    const minSwipeDistance = 40;

    if (diff > minSwipeDistance) {
      // Свайп вправо -> предыдущий день
      if (selectedDay > 1) {
        hapticLight();
        onSelectDay(selectedDay - 1);
      }
    } else if (diff < -minSwipeDistance) {
      // Свайп влево -> следующий день
      if (selectedDay < 7) {
        hapticLight();
        onSelectDay(selectedDay + 1);
      }
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="px-3 py-2 border-b card-border card-bg select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="grid grid-cols-7 gap-1.5 max-w-md mx-auto">
        {RUSSIAN_DAYS_SHORT.map((dayName, idx) => {
          const dayNum = idx + 1;
          const isSelected = selectedDay === dayNum;
          const isToday = todayDayOfWeek === dayNum;

          // Фильтруем события для этого дня с учетом четности недели
          const dayEvents = events.filter(
            ev => ev.dayOfWeek === dayNum && (ev.weekParity === 'all' || ev.weekParity === currentParity)
          );

          const hasUni = dayEvents.some(e => e.type === 'university');
          const hasTutoring = dayEvents.some(e => e.type === 'tutoring');
          const hasWorkout = dayEvents.some(e => e.type === 'workout');

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => {
                hapticLight();
                onSelectDay(dayNum);
              }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                isSelected
                  ? 'bg-white/10 text-white font-semibold shadow-sm border border-white/20 dark:bg-white/10 dark:text-white dark:border-white/15'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-main)] border border-transparent'
              }`}
            >
              {/* Day abbreviation (Пн, Вт...) */}
              <span className="text-[11px] font-medium tracking-tight mb-0.5">
                {dayName}
              </span>

              {/* Day index badge */}
              <span
                className={`text-[13px] font-mono leading-none w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
                  isToday
                    ? 'bg-blue-500 text-white font-bold ring-2 ring-blue-500/30'
                    : isSelected
                    ? 'text-white font-bold'
                    : 'text-[var(--text-dim)] font-medium'
                }`}
              >
                {dayNum}
              </span>

              {/* Dot Indicators for Life Spheres */}
              <div className="flex items-center gap-1 mt-1.5 h-1.5">
                {hasUni && (
                  <span
                    className="w-1 h-1 rounded-full bg-blue-500"
                    title="Университет"
                  />
                )}
                {hasTutoring && (
                  <span
                    className="w-1 h-1 rounded-full bg-emerald-500"
                    title="Репетиторство"
                  />
                )}
                {hasWorkout && (
                  <span
                    className="w-1 h-1 rounded-full bg-amber-500"
                    title="Спорт"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
