import React, { useState } from 'react';
import { X, Plus, Dumbbell, GraduationCap, Briefcase, FileText, MapPin } from 'lucide-react';
import { PlannerEvent, EventType, WeekParity } from '../types/planner';
import { hapticSuccess, hapticLight } from '../services/telegram';
import { RUSSIAN_DAYS_FULL } from '../utils/timeUtils';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newEvent: PlannerEvent) => void;
  initialDay: number;
  initialParity: WeekParity;
  initialSlot?: { start: string; end: string } | null;
}

export const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  initialDay,
  initialParity,
  initialSlot
}) => {
  if (!isOpen) return null;

  const [type, setType] = useState<EventType>(initialSlot ? 'workout' : 'tutoring');
  const [title, setTitle] = useState(initialSlot ? 'Зал' : '');
  const [timeStart, setTimeStart] = useState(initialSlot?.start || '16:00');
  const [timeEnd, setTimeEnd] = useState(initialSlot?.end || '17:00');
  const [dayOfWeek, setDayOfWeek] = useState(initialDay);
  const [weekParity, setWeekParity] = useState<WeekParity>(initialParity);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  const quickPupils = ['Макс', 'Нина', 'Ева', 'Честер', 'Карим', 'Арина', 'Андрюха'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    hapticSuccess();
    const newEvent: PlannerEvent = {
      id: `custom-${Date.now()}`,
      type,
      title: title.trim(),
      timeStart,
      timeEnd,
      dayOfWeek,
      weekParity,
      location: location.trim() || (type === 'workout' ? 'Зал' : type === 'tutoring' ? 'Online' : undefined),
      timezoneBadge: type === 'tutoring' ? 'МСК' : undefined,
      status: type === 'tutoring' ? 'planned' : undefined,
      note: note.trim() || undefined,
      createdAt: Date.now()
    };

    onAdd(newEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md card-bg card-border rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl safe-bottom border-t sm:border animate-in fade-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b card-border">
          <h3 className="text-[16px] font-bold text-[var(--text-main)]">
            Новое событие
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sphere / Category Type Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Сфера жизни
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setType('tutoring');
                  if (!title || title === 'Зал') setTitle('');
                }}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                  type === 'tutoring'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold'
                    : 'bg-[var(--bg-card-hover)] text-[var(--text-muted)] border-transparent'
                }`}
              >
                <Briefcase className="w-4 h-4 mb-1" />
                <span>Репетитор</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setType('workout');
                  if (!title) setTitle('Зал');
                }}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                  type === 'workout'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold'
                    : 'bg-[var(--bg-card-hover)] text-[var(--text-muted)] border-transparent'
                }`}
              >
                <Dumbbell className="w-4 h-4 mb-1" />
                <span>Тренировка</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setType('university');
                }}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                  type === 'university'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 font-semibold'
                    : 'bg-[var(--bg-card-hover)] text-[var(--text-muted)] border-transparent'
                }`}
              >
                <GraduationCap className="w-4 h-4 mb-1" />
                <span>Универ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setType('personal');
                }}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                  type === 'personal'
                    ? 'bg-slate-500/20 text-slate-300 border-slate-500/40 font-semibold'
                    : 'bg-[var(--bg-card-hover)] text-[var(--text-muted)] border-transparent'
                }`}
              >
                <FileText className="w-4 h-4 mb-1" />
                <span>Заметка</span>
              </button>
            </div>
          </div>

          {/* Quick presets for tutoring pupils */}
          {type === 'tutoring' && (
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">
                Быстрый выбор ученика (МСК)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickPupils.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setTitle(p);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      title === p
                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 font-semibold'
                        : 'bg-[var(--bg-card-hover)] text-[var(--text-muted)] border card-border hover:text-[var(--text-main)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title input */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Название события
            </label>
            <input
              type="text"
              required
              placeholder={
                type === 'tutoring'
                  ? 'Имя ученика (напр. Макс)'
                  : type === 'workout'
                  ? 'Зал / Тренировка с Тёмиком'
                  : 'Название предмета или дела'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-hover)] border card-border text-[var(--text-main)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Время начала {type === 'tutoring' && '(МСК)'}
              </label>
              <input
                type="time"
                required
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-[var(--bg-card-hover)] border card-border text-[var(--text-main)] focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Время конца {type === 'tutoring' && '(МСК)'}
              </label>
              <input
                type="time"
                required
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-[var(--bg-card-hover)] border card-border text-[var(--text-main)] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Day of Week */}
          <div>
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
                        : 'bg-[var(--bg-card-hover)] border card-border text-[var(--text-muted)]'
                    }`}
                  >
                    {name.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Week Parity */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Четность недели
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'Каждую неделю' },
                { id: 'odd', label: 'Нечётная' },
                { id: 'even', label: 'Чётная' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setWeekParity(p.id as WeekParity);
                  }}
                  className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                    weekParity === p.id
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 font-bold'
                      : 'bg-[var(--bg-card-hover)] border card-border text-[var(--text-muted)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Заметка (тема занятия, группа мышц, ДЗ)
            </label>
            <input
              type="text"
              placeholder="Напр. Стереометрия №14 или День ног"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-sm px-3.5 py-2 rounded-xl bg-[var(--bg-card-hover)] border card-border text-[var(--text-main)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Location / Platform */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Место / Платформа (опционально)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={type === 'tutoring' ? 'Discord / Zoom / Telegram' : type === 'workout' ? 'Зал / Фитнес-клуб' : 'Корпус № 1, 225'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-sm pl-9 pr-3.5 py-2 rounded-xl bg-[var(--bg-card-hover)] border card-border text-[var(--text-main)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-blue-500"
              />
              <MapPin className="w-4 h-4 text-[var(--text-dim)] absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border card-border text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Создать событие</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
