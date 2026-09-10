import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  PlannerEvent,
  AppSettings,
  FilterType,
  StudentStatus,
  WeekParity
} from './types/planner';
import { loadEvents, saveEvents, loadSettings, saveSettings } from './services/storage';
import { initTelegramApp, setTelegramColors, hapticLight } from './services/telegram';
import { getCurrentDayOfWeek, formatDateHuman } from './utils/timeUtils';
import { calculateWeekParityFromDate } from './utils/parityUtils';

import { Header } from './components/Header';
import { WeekCalendarStrip } from './components/WeekCalendarStrip';
import { FilterBar } from './components/FilterBar';
import { NowStatusWidget } from './components/NowStatusWidget';
import { DayTimeline } from './components/DayTimeline';
import { QuickRescheduleModal } from './components/QuickRescheduleModal';
import { AddEventModal } from './components/AddEventModal';
import { NoteModal } from './components/NoteModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    timezone: 'both',
    weekParity: 'odd',
    autoParityWithCalendar: true,
    semesterStartDate: '2026-09-01'
  });

  const [isLoading, setIsLoading] = useState(true);

  // Календарный контекст
  const todayDayOfWeek = getCurrentDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<number>(todayDayOfWeek);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Состояния модалок
  const [rescheduleTarget, setRescheduleTarget] = useState<PlannerEvent | null>(null);
  const [noteTarget, setNoteTarget] = useState<PlannerEvent | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSlotPrefill, setAddSlotPrefill] = useState<{ start: string; end: string } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Инициализация данных и Telegram WebApp
  useEffect(() => {
    async function init() {
      const loadedSettings = await loadSettings();
      const loadedEvents = await loadEvents();

      // Авто-определение четности по дате, если включено
      if (loadedSettings.autoParityWithCalendar) {
        const { parity } = calculateWeekParityFromDate(new Date(), loadedSettings.semesterStartDate);
        loadedSettings.weekParity = parity;
      }

      setSettings(loadedSettings);
      setEvents(loadedEvents);
      setIsLoading(false);

      const isDark = loadedSettings.theme === 'dark';
      initTelegramApp(isDark);
      applyThemeToDom(loadedSettings.theme);
    }

    init();
  }, []);

  const applyThemeToDom = (theme: 'dark' | 'light' | 'auto') => {
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    setTelegramColors(isDark);
  };

  // Переключение темы
  const handleToggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const updated = { ...settings, theme: newTheme as 'dark' | 'light' };
    setSettings(updated);
    saveSettings(updated);
    applyThemeToDom(newTheme);
  };

  // Переключение четности недели
  const handleToggleParity = () => {
    const nextParity: WeekParity = settings.weekParity === 'odd' ? 'even' : 'odd';
    const updated = {
      ...settings,
      weekParity: nextParity as 'odd' | 'even',
      autoParityWithCalendar: false // При ручном переключении отключаем автосинхронизацию
    };
    setSettings(updated);
    saveSettings(updated);
  };

  // Обновление статуса ученика
  const handleUpdateStatus = (eventId: string, nextStatus: StudentStatus) => {
    const updated = events.map(ev => {
      if (ev.id === eventId) {
        return { ...ev, status: nextStatus, updatedAt: Date.now() };
      }
      return ev;
    });
    setEvents(updated);
    saveEvents(updated);
  };

  // Отметка выполнения тренировки
  const handleToggleComplete = (eventId: string) => {
    const updated = events.map(ev => {
      if (ev.id === eventId) {
        return { ...ev, isCompleted: !ev.isCompleted, updatedAt: Date.now() };
      }
      return ev;
    });
    setEvents(updated);
    saveEvents(updated);
  };

  // Сохранение быстрого переноса
  const handleSaveReschedule = (updatedEvent: PlannerEvent) => {
    const updated = events.map(ev => (ev.id === updatedEvent.id ? updatedEvent : ev));
    setEvents(updated);
    saveEvents(updated);
  };

  // Сохранение заметки
  const handleSaveNote = (eventId: string, noteText: string) => {
    const updated = events.map(ev => {
      if (ev.id === eventId) {
        return { ...ev, note: noteText, updatedAt: Date.now() };
      }
      return ev;
    });
    setEvents(updated);
    saveEvents(updated);
  };

  // Добавление нового события
  const handleAddEvent = (newEvent: PlannerEvent) => {
    const updated = [...events, newEvent];
    setEvents(updated);
    saveEvents(updated);
  };

  // Клик по свободному окну для добавления Зала или дела
  const handleAddInSlot = (start: string, end: string) => {
    setAddSlotPrefill({ start, end });
    setIsAddModalOpen(true);
  };

  // События для выбранного дня с учетом четности недели
  const dayAllEvents = events.filter(
    ev => ev.dayOfWeek === selectedDay && (ev.weekParity === 'all' || ev.weekParity === settings.weekParity)
  );

  // Фильтрация по выбранной категории
  const filteredDayEvents = dayAllEvents.filter(ev => {
    if (activeFilter === 'all') return true;
    return ev.type === activeFilter;
  });

  // События сегодняшнего дня (для виджета «Сейчас»)
  const todayEvents = events.filter(
    ev => ev.dayOfWeek === todayDayOfWeek && (ev.weekParity === 'all' || ev.weekParity === settings.weekParity)
  );

  const formattedDateStr = formatDateHuman(new Date());

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] text-[var(--text-muted)] font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span>Загрузка планера 3-ИНГТ-101...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-main)] max-w-lg mx-auto relative pb-20 shadow-2xl">
      {/* 1. Top Header */}
      <Header
        currentParity={settings.weekParity}
        onToggleParity={handleToggleParity}
        isDarkMode={settings.theme === 'dark'}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        formattedDateStr={formattedDateStr}
      />

      {/* 2. 7-Day Calendar Strip */}
      <WeekCalendarStrip
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        currentParity={settings.weekParity}
        events={events}
        todayDayOfWeek={todayDayOfWeek}
      />

      {/* 3. Quick Filter Chips */}
      <FilterBar
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        dayEvents={dayAllEvents}
      />

      {/* 4. Live "Now" Status Widget (показывается только в текущем дне) */}
      {selectedDay === todayDayOfWeek && (
        <NowStatusWidget
          todayEvents={todayEvents}
          timezoneMode={settings.timezone}
        />
      )}

      {/* 5. Chronological Day Timeline */}
      <main className="flex-1">
        <DayTimeline
          events={filteredDayEvents}
          isToday={selectedDay === todayDayOfWeek}
          onUpdateStatus={handleUpdateStatus}
          onToggleComplete={handleToggleComplete}
          onOpenReschedule={(ev) => setRescheduleTarget(ev)}
          onEditNote={(ev) => setNoteTarget(ev)}
          onAddEventInSlot={handleAddInSlot}
        />
      </main>

      {/* 6. Floating Action Button (+) */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            setAddSlotPrefill(null);
            setIsAddModalOpen(true);
          }}
          className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center transition-transform active:scale-95 border border-blue-400/30"
          title="Добавить событие"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Modals */}
      {rescheduleTarget && (
        <QuickRescheduleModal
          event={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSave={handleSaveReschedule}
        />
      )}

      {noteTarget && (
        <NoteModal
          event={noteTarget}
          onClose={() => setNoteTarget(null)}
          onSaveNote={handleSaveNote}
        />
      )}

      {isAddModalOpen && (
        <AddEventModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setAddSlotPrefill(null);
          }}
          onAdd={handleAddEvent}
          initialDay={selectedDay}
          initialParity={settings.weekParity}
          initialSlot={addSlotPrefill}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={(newSettings) => {
            setSettings(newSettings);
            saveSettings(newSettings);
            applyThemeToDom(newSettings.theme);
          }}
          events={events}
          onReloadEvents={(newEvents) => {
            setEvents(newEvents);
            saveEvents(newEvents);
          }}
        />
      )}
    </div>
  );
};
