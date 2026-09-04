import React from 'react';
import { DaySchedule, Lesson } from '../types';
import ClassCard from './ClassCard';
import { getDayCalendarDate } from '../attendance';
import { TeacherAssignmentScope } from './EditLessonModal';

interface DayColumnProps {
  daySchedule: DaySchedule;
  weekNumber?: number;
  userRole?: string;
  onUpdateLesson?: (lessonId: string, updated: Partial<Lesson>, applyScope?: TeacherAssignmentScope) => void;
  onResetLesson?: (lessonId: string) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({ 
  daySchedule,
  weekNumber = 1,
  userRole,
  onUpdateLesson,
  onResetLesson,
}) => {
  if (!daySchedule) return null;
  const calendarDate = getDayCalendarDate(daySchedule.dayName, weekNumber);

  return (
    <div className="flex flex-col w-full min-w-0 max-w-full">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {daySchedule.dayName}
          </h2>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 rounded-lg">
            {calendarDate}
          </span>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
          {daySchedule.lessons.length} {daySchedule.lessons.length === 1 ? 'пара' : (daySchedule.lessons.length >= 2 && daySchedule.lessons.length <= 4) ? 'пары' : 'пар'}
        </span>
      </div>
      
      <div className="flex flex-col gap-4 w-full min-w-0">
        {daySchedule.lessons.map((lesson) => (
          <ClassCard 
            key={lesson.id} 
            lesson={lesson} 
            userRole={userRole}
            onUpdateLesson={onUpdateLesson}
            onResetLesson={onResetLesson}
          />
        ))}
        {daySchedule.lessons.length === 0 && (
          <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-1.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              В этот день занятий нет
            </div>
            <div className="text-[11px] text-slate-400">
              {daySchedule.dayName === 'Четверг' 
                ? 'День самостоятельной работы / Военная кафедра' 
                : daySchedule.dayName === 'Воскресенье'
                  ? 'Выходной день'
                  : 'Занятия не добавлены (староста группы может внести пары)'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayColumn;