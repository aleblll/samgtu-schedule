import React, { useState } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';
import { Lesson } from '../types';

export type TeacherAssignmentScope = 'none' | 'type' | 'all';

interface EditLessonModalProps {
  lesson: Lesson;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLesson: Partial<Lesson>, applyScope?: TeacherAssignmentScope) => void;
  onReset: () => void;
}

const EditLessonModal: React.FC<EditLessonModalProps> = ({
  lesson,
  isOpen,
  onClose,
  onSave,
  onReset,
}) => {
  const [subject, setSubject] = useState(lesson.subject);
  const [teacher, setTeacher] = useState(lesson.teacher || '');
  const [location, setLocation] = useState(lesson.location || '');
  const [note, setNote] = useState(lesson.note || '');
  const [applyScope, setApplyScope] = useState<TeacherAssignmentScope>('type');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      subject,
      teacher,
      location,
      note,
    }, applyScope);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5 shrink-0">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Редактирование данных пары</h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
              {lesson.timeStart} - {lesson.timeEnd} • {lesson.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="edit-lesson-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Название предмета
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Преподаватель (ФИО)
              </label>
              <input
                type="text"
                placeholder="ФИО преподавателя"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Аудитория / Корпус
              </label>
              <input
                type="text"
                placeholder="напр. Корпус 1, 109Б"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Granular Scope Selector */}
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 block">
              Куда применить преподавателя:
            </span>
            
            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="teacherScope"
                  checked={applyScope === 'type'}
                  onChange={() => setApplyScope('type')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span>На все «{lesson.type}» по предмету во всех 4 неделях</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="teacherScope"
                  checked={applyScope === 'all'}
                  onChange={() => setApplyScope('all')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span>На ВСЕ виды занятий (лекции, практики, лабы) предмета</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="teacherScope"
                  checked={applyScope === 'none'}
                  onChange={() => setApplyScope('none')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Только на эту конкретную пару</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Заметка к паре (для всей группы)
            </label>
            <input
              type="text"
              placeholder="напр. Принести калькулятор, методичка №2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
            />
          </div>
        </form>

        {/* Fixed Footer with Safe Area */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-2 pb-safe bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Сбросить
          </button>

          <button
            type="submit"
            form="edit-lesson-form"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all min-h-[44px]"
          >
            <Check className="w-4 h-4" /> Сохранить для группы
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditLessonModal;
