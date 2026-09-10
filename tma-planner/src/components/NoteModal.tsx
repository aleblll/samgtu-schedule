import React, { useState } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { PlannerEvent } from '../types/planner';
import { hapticSuccess } from '../services/telegram';

interface NoteModalProps {
  event: PlannerEvent | null;
  onClose: () => void;
  onSaveNote: (eventId: string, noteText: string) => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  event,
  onClose,
  onSaveNote
}) => {
  if (!event) return null;

  const [note, setNote] = useState(event.note || '');

  const handleSave = () => {
    hapticSuccess();
    onSaveNote(event.id, note.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md card-bg card-border rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl safe-bottom border-t sm:border animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b card-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-[16px] font-bold text-[var(--text-main)]">
              Заметка к событию
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--text-muted)] mb-2 font-medium truncate">
          {event.title} ({event.timeStart} – {event.timeEnd})
        </p>

        <textarea
          rows={4}
          autoFocus
          placeholder="Напишите задачу, тему урока или план тренировки..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full text-sm p-3 rounded-xl bg-[var(--bg-card-hover)] border card-border text-[var(--text-main)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
        />

        <div className="flex items-center gap-2 mt-4">
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
            <span>Сохранить заметку</span>
          </button>
        </div>
      </div>
    </div>
  );
};
