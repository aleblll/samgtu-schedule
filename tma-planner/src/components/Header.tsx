import React from 'react';
import { Sun, Moon, Settings, RefreshCw } from 'lucide-react';
import { WeekParity } from '../types/planner';
import { hapticLight, hapticSelection } from '../services/telegram';

interface HeaderProps {
  currentParity: WeekParity;
  onToggleParity: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  formattedDateStr: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentParity,
  onToggleParity,
  isDarkMode,
  onToggleTheme,
  onOpenSettings,
  formattedDateStr
}) => {
  const isOdd = currentParity === 'odd';

  return (
    <header className="safe-top px-4 pt-3 pb-2.5 border-b card-border card-bg sticky top-0 z-30">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Group identity & Date */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-blue-400 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">
              3-ИНГТ-101
            </span>
            <span className="text-[11px] text-[var(--text-dim)] font-medium">СамГТУ</span>
          </div>
          <h1 className="text-[15px] font-bold text-[var(--text-main)] truncate mt-0.5 tracking-tight">
            {formattedDateStr}
          </h1>
        </div>

        {/* Right: Week Parity Switcher & Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Parity Pill Button */}
          <button
            type="button"
            onClick={() => {
              hapticSelection();
              onToggleParity();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide transition-all border ${
              isOdd
                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}
            title="Нажмите для переключения четности недели"
          >
            <RefreshCw className="w-3 h-3 animate-none" />
            <span>{isOdd ? 'Нечётная' : 'Чётная'}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onToggleTheme();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card-hover)] border card-border transition-colors"
            title="Сменить тему оформления"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onOpenSettings();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card-hover)] border card-border transition-colors"
            title="Настройки и бэкап"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
