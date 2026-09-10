import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PlannerEvent, TimezoneMode } from '../types/planner';
import { getLiveStatus, formatDurationHuman, samaraToMsk } from '../utils/timeUtils';

interface NowStatusWidgetProps {
  todayEvents: PlannerEvent[];
  timezoneMode: TimezoneMode;
}

export const NowStatusWidget: React.FC<NowStatusWidgetProps> = ({
  todayEvents,
  timezoneMode
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000); // каждые 30 секунд
    return () => clearInterval(timer);
  }, []);

  const curSamaraTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const curMskTime = samaraToMsk(curSamaraTime);

  const status = getLiveStatus(todayEvents, now);

  if (todayEvents.length === 0) {
    return null;
  }

  return (
    <div className="mx-4 my-2 p-3 rounded-xl card-bg border card-border shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] font-mono">
            {status.type === 'current' ? 'СЕЙЧАС ИДЁТ' : status.type === 'next' ? 'СЛЕДУЮЩЕЕ' : 'ДЕНЬ ЗАВЕРШЁН'}
          </span>
        </div>

        {/* Time clocks */}
        <div className="flex items-center gap-2 text-xs font-mono font-medium text-[var(--text-muted)]">
          <span className="text-[var(--text-main)] font-semibold">{curSamaraTime}</span>
          <span className="text-[10px] text-[var(--text-dim)]">(Самара)</span>
          {timezoneMode !== 'local' && (
            <>
              <span className="text-[var(--text-dim)]">•</span>
              <span>{curMskTime}</span>
              <span className="text-[10px] text-emerald-400/90 font-semibold bg-emerald-500/10 px-1 rounded">МСК</span>
            </>
          )}
        </div>
      </div>

      {/* Content depending on status */}
      {status.type === 'current' && status.event && (
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-[var(--text-main)] leading-tight truncate">
                {status.event.title}
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                {status.event.lessonType || status.event.location || status.event.teacher || 'Занятие'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[13px] font-mono font-bold text-amber-400">
                {formatDurationHuman(status.remainingMinutes)}
              </span>
              <span className="block text-[10px] text-[var(--text-dim)] font-medium">до конца</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-[var(--bg-card-hover)] rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${status.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {status.type === 'next' && status.event && (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-[13px] font-semibold text-[var(--text-main)] leading-tight truncate">
              {status.event.title}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mt-0.5">
              <span className="font-mono text-[var(--text-dim)]">
                {status.event.timeStart} – {status.event.timeEnd}
              </span>
              {status.event.timezoneBadge && (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded">
                  {status.event.timezoneBadge}
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[12px] font-mono font-medium text-blue-400">
              через {formatDurationHuman(status.untilMinutes)}
            </span>
          </div>
        </div>
      )}

      {status.type === 'done' && (
        <div className="flex items-center gap-2 py-0.5 text-xs text-[var(--text-muted)]">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Все запланированные события на сегодня завершены. Время отдыха!</span>
        </div>
      )}
    </div>
  );
};
