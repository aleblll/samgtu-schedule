import React, { useState } from 'react';
import { Lesson } from '../types';
import { MapPin, User, Users, Info, Edit3 } from 'lucide-react';
import EditLessonModal, { TeacherAssignmentScope } from './EditLessonModal';

interface ClassCardProps {
  lesson: Lesson;
  userRole?: string;
  onUpdateLesson?: (lessonId: string, updated: Partial<Lesson>, applyScope?: TeacherAssignmentScope) => void;
  onResetLesson?: (lessonId: string) => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ 
  lesson, 
  userRole = 'student',
  onUpdateLesson,
  onResetLesson,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const canEdit = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'starosta';

  // Determine badge color based on lesson type
  const getTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('лекц')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    if (lowerType.includes('прак')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (lowerType.includes('лаб')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatGroups = (groups: string) => {
    return groups.replace(/2-ИНГТ-24ИНГТ-/g, '');
  };

  const isCancelled = lesson.isCancelled;

  return (
    <>
      <div className={`w-full rounded-3xl p-4 shadow-sm border transition-all duration-200 h-full flex flex-col justify-between ${
        isCancelled
          ? 'bg-slate-50/80 dark:bg-slate-900/40 border-red-200 dark:border-red-900/30 opacity-70'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:shadow-md'
      }`}>
        <div>
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col">
              <span className={`text-base font-bold leading-tight ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                {lesson.timeStart}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                - {lesson.timeEnd}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
              {isCancelled && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                  Отменена
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-xl text-[10px] uppercase font-bold tracking-wide ${getTypeColor(lesson.type)}`}>
                {lesson.type.replace(/заняти[ея]|работ[аы]/gi, '').trim() || lesson.type}
              </span>
            </div>
          </div>
          
          <h3 className={`font-bold mb-2 text-sm leading-snug [hyphens:auto] [word-break:break-word] ${
            isCancelled 
              ? 'text-slate-400 dark:text-slate-500 line-through decoration-red-500 decoration-2' 
              : 'text-slate-800 dark:text-slate-100'
          }`}>
            {lesson.subject}
          </h3>

          {lesson.note && lesson.note.trim() !== '' && (
            <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30 rounded-xl flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="leading-tight text-[11px] font-medium">{lesson.note.trim()}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {lesson.location || 'Аудитория уточняется'}
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {lesson.teacher || 'Преподаватель не назначен'}
            </span>
          </div>

          {lesson.groups && (
            <div className="flex items-start gap-2">
              <Users className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 w-full break-words leading-tight">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Группы:</span> {formatGroups(lesson.groups)}
              </span>
            </div>
          )}

          {/* Edit button for Starosta and Admin */}
          {canEdit && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" /> Редактировать данные пары
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <EditLessonModal
          lesson={lesson}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updated, applyScope) => onUpdateLesson && onUpdateLesson(lesson.id, updated, applyScope)}
          onReset={() => onResetLesson && onResetLesson(lesson.id)}
        />
      )}
    </>
  );
};

export default ClassCard;