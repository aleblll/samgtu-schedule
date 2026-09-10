import React, { useRef, useState } from 'react';
import {
  X,
  Moon,
  Sun,
  Download,
  Upload,
  RotateCcw,
  Cloud
} from 'lucide-react';
import { AppSettings, PlannerEvent, TimezoneMode } from '../types/planner';
import { exportDataToJson, importDataFromJson, resetToFactory, syncWithTelegramCloud } from '../services/storage';
import { hapticLight, hapticSuccess, hapticWarning } from '../services/telegram';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  events: PlannerEvent[];
  onReloadEvents: (newEvents: PlannerEvent[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  events,
  onReloadEvents
}) => {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cloudMsg, setCloudMsg] = useState<string | null>(null);

  const handleExport = () => {
    hapticSuccess();
    exportDataToJson(events, settings);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importDataFromJson(file);
      onUpdateSettings(data.settings);
      onReloadEvents(data.events);
      hapticSuccess();
      alert('Данные успешно импортированы!');
    } catch (err: any) {
      hapticWarning();
      alert(`Ошибка при импорте: ${err?.message || err}`);
    }
  };

  const handleFactoryReset = async () => {
    const ok = window.confirm(
      'Сбросить расписание к эталонным предустановленным данным (3-ИНГТ-101, ученики, зал)? Все пользовательские правки будут заменены.'
    );
    if (!ok) return;

    hapticWarning();
    const restored = await resetToFactory();
    onUpdateSettings(restored.settings);
    onReloadEvents(restored.events);
    onClose();
  };

  const handleCloudSync = async () => {
    hapticLight();
    setCloudMsg('Проверка Telegram CloudStorage...');
    const cloudEvents = await syncWithTelegramCloud();
    if (cloudEvents && cloudEvents.length > 0) {
      onReloadEvents(cloudEvents);
      hapticSuccess();
      setCloudMsg(`Синхронизировано ${cloudEvents.length} событий из Telegram Cloud!`);
    } else {
      setCloudMsg('Облако Telegram актуально (локальные данные синхронизированы)');
    }
    setTimeout(() => setCloudMsg(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md card-bg card-border rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl safe-bottom border-t sm:border animate-in fade-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b card-border">
          <h3 className="text-[16px] font-bold text-[var(--text-main)]">
            Настройки и хранилище
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Theme selection */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Тема оформления
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  onUpdateSettings({ ...settings, theme: 'dark' });
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-[var(--bg-card-hover)] border card-border text-[var(--text-muted)]'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Тёмный графит</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  onUpdateSettings({ ...settings, theme: 'light' });
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  settings.theme === 'light'
                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                    : 'bg-[var(--bg-card-hover)] border card-border text-[var(--text-muted)]'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Светлый фарфор</span>
              </button>
            </div>
          </div>

          {/* Timezone display */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Отображение времени
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'both', label: 'Самара + МСК' },
                { id: 'local', label: 'Только Самара' },
                { id: 'msk', label: 'Только МСК' }
              ].map(tz => (
                <button
                  key={tz.id}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onUpdateSettings({ ...settings, timezone: tz.id as TimezoneMode });
                  }}
                  className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                    settings.timezone === tz.id
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 font-bold'
                      : 'bg-[var(--bg-card-hover)] border card-border text-[var(--text-muted)]'
                  }`}
                >
                  {tz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Telegram CloudStorage Sync */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-card-hover)] border card-border">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-[var(--text-main)]">
                  Telegram CloudStorage
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Активно
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3">
              Данные автоматически синхронизируются с вашим облаком Telegram. Расписание открывается на смартфоне и в Telegram Desktop.
            </p>
            <button
              type="button"
              onClick={handleCloudSync}
              className="w-full py-2 rounded-lg bg-[var(--bg-card)] border card-border hover:bg-white/5 text-xs font-medium text-[var(--text-main)] transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Синхронизировать сейчас</span>
            </button>
            {cloudMsg && (
              <p className="text-[11px] text-emerald-400 mt-2 text-center animate-fade-in">
                {cloudMsg}
              </p>
            )}
          </div>

          {/* Backup: JSON Export / Import */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Резервная копия (JSON)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".json"
              className="hidden"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="py-2.5 px-3 rounded-xl border card-border bg-[var(--bg-card-hover)] hover:bg-white/10 text-xs font-medium text-[var(--text-main)] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Экспорт в файл</span>
              </button>

              <button
                type="button"
                onClick={handleImportClick}
                className="py-2.5 px-3 rounded-xl border card-border bg-[var(--bg-card-hover)] hover:bg-white/10 text-xs font-medium text-[var(--text-main)] transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Импорт из файла</span>
              </button>
            </div>
          </div>

          {/* Reset button */}
          <div className="pt-2 border-t card-border">
            <button
              type="button"
              onClick={handleFactoryReset}
              className="w-full py-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Восстановить эталонные данные (3-ИНГТ-101)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
