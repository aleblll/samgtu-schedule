import React, { useState } from 'react';
import {
  MapPin,
  User,
  CheckCircle2,
  Circle,
  FileText,
  ArrowRight
} from 'lucide-react';
import { PlannerEvent, StudentStatus } from '../types/planner';
import { getDurationMinutes } from '../utils/timeUtils';
import { hapticLight, hapticSuccess, hapticSelection } from '../services/telegram';

interface EventCardProps {
  event: PlannerEvent;
  onUpdateStatus?: (eventId: string, nextStatus: StudentStatus) => void;
  onToggleComplete?: (eventId: string) => void;
  onOpenReschedule?: (event: PlannerEvent) => void;
  onEditNote?: (event: PlannerEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onUpdateStatus,
  onToggleComplete,
  onOpenReschedule,
  onEditNote
}) => {
  const [showQuickActions, setShowQuickActions] = useState(false);

  const duration = getDurationMinutes(event.timeStart, event.timeEnd);

  // Цветовое кодирование по слоям
  const isUni = event.type === 'university';
  const isTutoring = event.type === 'tutoring';
  const isWorkout = event.type === 'workout';

  // Статусы ученика
  const getStatusDetails = (status?: StudentStatus) => {
    switch (status) {
      case 'completed':
        return { label: 'Проведен', class: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
      case 'paid':
        return { label: 'Оплачен', class: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'cancelled':
        return { label: 'Отменен', class: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      case 'rescheduled':
        return { label: 'Перенесен', class: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'planned':
      default:
        return { label: 'Ожидается', class: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    }
  };

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateStatus) return;
    hapticSelection();

    const order: StudentStatus[] = ['planned', 'completed', 'paid', 'cancelled'];
    const curIdx = order.indexOf(event.status || 'planned');
    const nextStatus = order[(curIdx + 1) % order.length];
    onUpdateStatus(event.id, nextStatus);
  };

  return (
    <div
      onClick={() => setShowQuickActions(!showQuickActions)}
      className={`relative group rounded-xl p-3.5 transition-all card-bg card-border cursor-pointer select-none ${
        event.isCompleted ? 'opacity-65' : ''
      }`}
    >
      {/* Top row: Times and Category Badges */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {/* Timecodes */}
        <div className="flex items-center gap-2 font-mono text-[13px] font-medium text-[var(--text-main)]">
          <span className="font-semibold">{event.timeStart}</span>
          <span className="text-[var(--text-dim)]">–</span>
          <span>{event.timeEnd}</span>
          <span className="text-[10px] text-[var(--text-dim)] font-normal ml-0.5">
            ({duration}м)
          </span>

          {/* Timezone badge for Moscow lessons */}
          {event.timezoneBadge && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 rounded">
              {event.timezoneBadge}
            </span>
          )}
        </div>

        {/* Right Badges */}
        <div className="flex items-center gap-1.5">
          {/* University Lesson Type */}
          {isUni && event.lessonType && (
            <span
              className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded border ${
                event.lessonType === 'Лекции'
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : event.lessonType === 'Лабораторные работы'
                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                  : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
              }`}
            >
              {event.lessonType.replace(' занятия', '').replace(' работы', '')}
            </span>
          )}

          {/* Tutoring Status Pill Switcher */}
          {isTutoring && (
            <button
              type="button"
              onClick={cycleStatus}
              className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded border transition-transform active:scale-95 ${
                getStatusDetails(event.status).class
              }`}
              title="Нажмите для смены статуса урока"
            >
              {getStatusDetails(event.status).label}
            </button>
          )}

          {/* Workout Completion Checkbox */}
          {isWorkout && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticSuccess();
                onToggleComplete?.(event.id);
              }}
              className="p-1 text-[var(--text-muted)] hover:text-amber-400 transition-colors"
              title="Отметить выполнение"
            >
              {event.isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-[var(--text-dim)]" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Title & Details */}
      <div className="flex items-start gap-2.5">
        {/* Left vertical accent line */}
        <div
          className={`w-1 self-stretch rounded-full shrink-0 ${
            isUni
              ? 'bg-blue-500'
              : isTutoring
              ? 'bg-emerald-500'
              : isWorkout
              ? 'bg-amber-500'
              : 'bg-slate-500'
          }`}
        />

        <div className="flex-1 min-w-0">
          <h3
            className={`text-[15px] font-semibold leading-snug tracking-tight text-[var(--text-main)] ${
              event.isCompleted ? 'line-through text-[var(--text-muted)]' : ''
            }`}
          >
            {event.title}
          </h3>

          {/* Meta line: Location, Teacher, or Info */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--text-muted)]">
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[var(--text-dim)] shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {event.teacher && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-[var(--text-dim)] shrink-0" />
                <span className="truncate">{event.teacher}</span>
              </div>
            )}
          </div>

          {/* User Notes Preview */}
          {event.note && (
            <div className="mt-2 text-xs text-[var(--text-muted)] bg-[var(--bg-card-hover)] border card-border px-2.5 py-1.5 rounded-lg flex items-start gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
              <span className="leading-relaxed break-words">{event.note}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Quick Actions Toolbar */}
      {showQuickActions && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 pt-2.5 border-t card-border flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-1.5">
            {/* Quick Reschedule */}
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onOpenReschedule?.(event);
              }}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[var(--bg-card-hover)] text-[var(--text-main)] hover:bg-white/10 transition-colors border card-border"
            >
              <ArrowRight className="w-3 h-3 text-amber-400" />
              <span>Перенести</span>
            </button>

            {/* Edit Note */}
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onEditNote?.(event);
              }}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[var(--bg-card-hover)] text-[var(--text-main)] hover:bg-white/10 transition-colors border card-border"
            >
              <FileText className="w-3 h-3 text-blue-400" />
              <span>{event.note ? 'Изменить заметку' : '+ Заметка'}</span>
            </button>
          </div>

          {/* Quick status cycle for tutoring */}
          {isTutoring && (
            <button
              type="button"
              onClick={cycleStatus}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] px-2 py-1"
            >
              Сменить статус ➜
            </button>
          )}
        </div>
      )}
    </div>
  );
};
