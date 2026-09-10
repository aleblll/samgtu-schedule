import React from 'react';
import { FilterType, PlannerEvent } from '../types/planner';
import { hapticLight } from '../services/telegram';

interface FilterBarProps {
  activeFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  dayEvents: PlannerEvent[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeFilter,
  onSelectFilter,
  dayEvents
}) => {
  const uniCount = dayEvents.filter(e => e.type === 'university').length;
  const tutCount = dayEvents.filter(e => e.type === 'tutoring').length;
  const workCount = dayEvents.filter(e => e.type === 'workout').length;
  const totalCount = dayEvents.length;

  const filters: { id: FilterType; label: string; count: number; activeClass: string }[] = [
    {
      id: 'all',
      label: 'Все',
      count: totalCount,
      activeClass: 'bg-white/12 text-white border-white/20 dark:bg-white/10 dark:text-white dark:border-white/15'
    },
    {
      id: 'university',
      label: 'Универ',
      count: uniCount,
      activeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40'
    },
    {
      id: 'tutoring',
      label: 'Репет',
      count: tutCount,
      activeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
    },
    {
      id: 'workout',
      label: 'Трени',
      count: workCount,
      activeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    }
  ];

  return (
    <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {filters.map(f => {
        const isActive = activeFilter === f.id;

        return (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              hapticLight();
              onSelectFilter(f.id);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border ${
              isActive
                ? `${f.activeClass} font-semibold shadow-xs`
                : 'text-[var(--text-muted)] bg-[var(--bg-card)] border-[var(--border-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                isActive
                  ? 'bg-black/30 text-white dark:bg-black/40'
                  : 'bg-[var(--bg-card-hover)] text-[var(--text-dim)]'
              }`}
            >
              {f.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
