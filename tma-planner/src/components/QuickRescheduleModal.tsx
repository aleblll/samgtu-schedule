import React, { useState } from 'react';
import { X, Clock, Check, ArrowRight } from 'lucide-react';
import { PlannerEvent } from '../types/planner';
import { timeToMinutes, minutesToTime, RUSSIAN_DAYS_FULL } from '../utils/timeUtils';
import { hapticSuccess, hapticLight } from '../services/telegram';

interface QuickRescheduleModalProps {
  event: PlannerEvent | null;
  onClose: () => void;
  onSave: (updatedEvent: PlannerEvent) => void;
}

export const QuickRescheduleModal: React.FC<QuickRescheduleModalProps> = ({
  event,
  onClose,
  onSave
}) => {
  if (!event) return null;

  const [timeStart, setTimeStart] = useState(event.timeStart);
  const [timeEnd, setTimeEnd] = useState(event.timeEnd);
  const [dayOfWeek, setDayOfWeek] = useState(event.dayOfWeek);

  const duration = Math.max(30, timeToMinutes(event.timeEnd) - timeToMinutes(event.timeStart));

  // Пресет: сдвиг на deltaMinutes
  const applyShift = (deltaMinutes: number) => {
    hapticLight();
    const newStartMins = timeToMinutes(timeStart) + deltaMinutes;
    const newEndMins = newStartMins + duration;
    setTimeStart(minutesToTime(newStartMins));
    setTimeEnd(minutesToTime(newEndMins));
  };

  // Пресет: перенести на вечер (напр. 19:00)
  const applyEvening = () => {
    hapticLight();
    setTimeStart('19:00');
    setTimeEnd(minutesToTime(timeToMinutes('19:00') + duration));
  };

  const handleSave = () => {
    hapticSuccess();
    onSave({
      ...event,
      timeStart,
      timeEnd,
      dayOfWeek,
      updatedAt: Date.now()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md card-bg card-border rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl safe-bottom border-t sm:border animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b card-border">
          <div>
            <h3 className="text-[16px] font-bold text-[var(--text-main)]">
              Быстрый перенос
            </h3>
            <p className="text-xs text-[var(--text-muted)] truncate max-w-xs mt-0.5">
              {event.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Shift Presets */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Быстрые варианты
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => applyShift(60)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--bg-card-hover)] border card-border hover:bg-white/10 transition-colors text-left flex items-center justify-between"
            >
              <span>+1 час</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => applyShift(120)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--bg-card-hover)] border card-border hover:bg-white/10 transition-colors text-left flex items-center justify-between"
            >
              <span>+2 часа</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => applyShift(-60)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--bg-card-hover)] border card-border hover:bg-white/10 transition-colors text-left flex items-center justify-between"
            >
              <span>-1 час</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
            </button>
            <button
              type="button"
              onClick={applyEvening}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--bg-card-hover)] border card-border hover:bg-white/10 transition-colors text-left flex items-center justify-between"
            >
              <span>На вечер (19:00)</span>
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Manual Time Selection */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Начало
            </label>
            <input
              type="time"
              value={timeStart}
              onChange={(e) => {
                const newStart = e.target.value;
                setTimeStart(newStart);
                setTimeEnd(minutesToTime(timeToMinutes(newStart) + duration));
              }}
              className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-[var(--bg-card-hover)] border card-border text-[var(--text-main)] focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Окончание
            </label>
            <input
              type="time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-[var(--bg-card-hover)] border card-border text-[var(--text-main)] focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Day of Week Selection */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            День недели
          </label>
          <div className="grid grid-cols-7 gap-1">
            {RUSSIAN_DAYS_FULL.map((name, idx) => {
              const dNum = idx + 1;
              const isSelected = dayOfWeek === dNum;
              return (
                <button
                  key={dNum}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setDayOfWeek(dNum);
                  }}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 font-bold'
                      : 'bg-[var(--bg-card-hover)] border card-border text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title={name}
                >
                  {name.slice(0, 2)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border card-border text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Сохранить перенос</span>
          </button>
        </div>
      </div>
    </div>
  );
};
