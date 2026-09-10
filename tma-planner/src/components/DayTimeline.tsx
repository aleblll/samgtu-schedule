import React, { useState, useEffect } from 'react';
import { Plus, Coffee, CalendarOff, Dumbbell } from 'lucide-react';
import { PlannerEvent, StudentStatus } from '../types/planner';
import { EventCard } from './EventCard';
import { timeToMinutes, formatDurationHuman } from '../utils/timeUtils';
import { hapticLight } from '../services/telegram';

interface DayTimelineProps {
  events: PlannerEvent[];
  isToday: boolean;
  onUpdateStatus: (eventId: string, nextStatus: StudentStatus) => void;
  onToggleComplete: (eventId: string) => void;
  onOpenReschedule: (event: PlannerEvent) => void;
  onEditNote: (event: PlannerEvent) => void;
  onAddEventInSlot: (start: string, end: string) => void;
}

export const DayTimeline: React.FC<DayTimelineProps> = ({
  events,
  isToday,
  onUpdateStatus,
  onToggleComplete,
  onOpenReschedule,
  onEditNote,
  onAddEventInSlot
}) => {
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Сортировка по времени начала
  const sortedEvents = [...events].sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart));

  if (sortedEvents.length === 0) {
    return (
      <div className="py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border card-border flex items-center justify-center mx-auto mb-3 text-[var(--text-dim)]">
          <CalendarOff className="w-6 h-6" />
        </div>
        <h3 className="text-[15px] font-semibold text-[var(--text-main)]">
          Событий не найдено
        </h3>
        <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto mt-1 leading-relaxed">
          На этот день ничего не запланировано или выбранный фильтр скрыл все карточки.
        </p>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onAddEventInSlot('12:00', '13:00');
          }}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--bg-card-hover)] border card-border text-xs font-medium text-[var(--text-main)] hover:bg-white/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span>Добавить занятие или тренировку</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative px-4 py-3 space-y-3">
      {sortedEvents.map((event, idx) => {
        const evStartMins = timeToMinutes(event.timeStart);
        const nextEvent = sortedEvents[idx + 1];
        const evEndMins = timeToMinutes(event.timeEnd);

        // Проверяем, есть ли окно до следующего события
        let gapMinutes = 0;
        let gapStart = event.timeEnd;
        let gapEnd = '';

        if (nextEvent) {
          const nextStartMins = timeToMinutes(nextEvent.timeStart);
          if (nextStartMins - evEndMins >= 45) {
            gapMinutes = nextStartMins - evEndMins;
            gapEnd = nextEvent.timeStart;
          }
        }

        // Проверяем, нужно ли показать маркер текущего времени перед этим событием
        const showTimeMarkerBefore =
          isToday &&
          idx === 0 &&
          currentMinutes < evStartMins &&
          currentMinutes >= timeToMinutes('07:30');

        const showTimeMarkerAfter =
          isToday &&
          currentMinutes >= evEndMins &&
          (!nextEvent || currentMinutes < timeToMinutes(nextEvent.timeStart));

        return (
          <React.Fragment key={event.id}>
            {/* Red Time Marker Before first event */}
            {showTimeMarkerBefore && (
              <div className="flex items-center gap-2 py-1 select-none">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <div className="h-[1px] flex-1 bg-rose-500/40" />
                <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                  Сейчас
                </span>
              </div>
            )}

            {/* Event Card */}
            <EventCard
              event={event}
              onUpdateStatus={onUpdateStatus}
              onToggleComplete={onToggleComplete}
              onOpenReschedule={onOpenReschedule}
              onEditNote={onEditNote}
            />

            {/* Red Time Marker After this event */}
            {showTimeMarkerAfter && (
              <div className="flex items-center gap-2 py-1 select-none">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <div className="h-[1px] flex-1 bg-rose-500/40" />
                <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                  Сейчас
                </span>
              </div>
            )}

            {/* Free window slot between events */}
            {gapMinutes >= 45 && gapEnd && (
              <div
                onClick={() => {
                  hapticLight();
                  onAddEventInSlot(gapStart, gapEnd);
                }}
                className="my-1.5 py-2 px-3 rounded-lg border border-dashed border-white/10 dark:border-white/10 bg-[var(--bg-card)]/40 hover:bg-[var(--bg-card-hover)] hover:border-amber-500/40 transition-colors cursor-pointer flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]"
              >
                <div className="flex items-center gap-2">
                  <Coffee className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-mono text-[11px] text-[var(--text-dim)]">
                    {gapStart} – {gapEnd}
                  </span>
                  <span className="font-medium text-[var(--text-muted)]">
                    Свободное окно ({formatDurationHuman(gapMinutes)})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-amber-400/90 shrink-0">
                  <Dumbbell className="w-3 h-3" />
                  <span>Поставить Зал</span>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
