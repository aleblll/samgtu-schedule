import React, { useState } from 'react';
import { ClipboardCheck, Download, FileText, Table as TableIcon } from 'lucide-react';
import { STUDENTS_REGISTRY, useAttendance, BLOCKS, getSemesterWeek, getDayName, getSamaraISODate } from '../attendance';
import { SCHEDULE_REGISTRY, AVAILABLE_GROUPS, FACULTIES } from '../constants';
import { Lesson, Student } from '../types';
import { toast } from 'sonner';
import { exportAttendanceToWord } from '../utils/exportWord';

interface AttendanceTrackerProps {
  isAuthenticated: boolean;
  userRole?: string;
  userEmail: string | null;
  currentGroupId: string;
  refreshTrigger: number;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ 
  isAuthenticated, 
  userRole = 'student', 
  userEmail, 
  currentGroupId, 
  refreshTrigger 
}) => {
  const [activeTab, setActiveTab] = useState<'mark' | 'report' | 'details'>('mark');
  const [selectedBlockId, setSelectedBlockId] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(getSamaraISODate());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const { records, markAttendance, getAttendance } = useAttendance(isAuthenticated, currentGroupId, refreshTrigger);

  // Strictly enforce edit permissions: ONLY Starosta or Admin can edit attendance!
  const normalizedRole = userRole.toLowerCase();
  const canEdit = normalizedRole === 'admin' || normalizedRole === 'starosta';

  const students: Student[] = React.useMemo(() => {
    if (!currentGroupId) return [];
    try {
      const saved = localStorage.getItem(`students_${currentGroupId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return STUDENTS_REGISTRY[currentGroupId] || [];
  }, [currentGroupId, refreshTrigger]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedLesson(null);
  };

  // Safe local date parsing (avoids UTC midnight timezone rollover bug)
  const [year, month, day] = selectedDate.split('-').map(Number);
  const dateObj = new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
  const week = getSemesterWeek(dateObj, currentGroupId);
  const dayName = getDayName(dateObj);
  
  const scheduleForWeek = SCHEDULE_REGISTRY[currentGroupId]?.[week] || [];
  const daySchedule = scheduleForWeek.find(d => d.dayName === dayName);
  const lessons = daySchedule ? daySchedule.lessons : [];

  const handleLessonSelect = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const handleSetStudentStatus = (studentId: number, status: 'present' | 'absent' | 'excused') => {
    if (!canEdit) {
      toast.error('Только Староста или Админ могут изменять посещаемость');
      return;
    }
    if (!selectedLesson) return;
    const record = getAttendance(selectedDate, selectedLesson.id);
    let newAbsentIds = record.absentStudentIds.filter(id => id !== studentId);
    let newExcusedIds = (record.excusedStudentIds || []).filter(id => id !== studentId);

    if (status === 'absent') {
      newAbsentIds.push(studentId);
    } else if (status === 'excused') {
      newExcusedIds.push(studentId);
    }

    markAttendance(selectedDate, selectedLesson.id, newAbsentIds, newExcusedIds, record.isCancelled);
  };

  const handleSetFullDayStatus = (studentId: number, status: 'absent' | 'excused') => {
    if (!canEdit) {
      toast.error('Только Староста или Админ могут изменять посещаемость');
      return;
    }
    if (lessons.length === 0) return;
    
    lessons.forEach(lesson => {
      const record = getAttendance(selectedDate, lesson.id);
      // Skip cancelled lessons so absent status is never marked on cancelled classes!
      if (record.isCancelled) return;

      let newAbsentIds = record.absentStudentIds.filter(id => id !== studentId);
      let newExcusedIds = (record.excusedStudentIds || []).filter(id => id !== studentId);

      if (status === 'absent') {
        newAbsentIds.push(studentId);
      } else if (status === 'excused') {
        newExcusedIds.push(studentId);
      }

      markAttendance(selectedDate, lesson.id, newAbsentIds, newExcusedIds, record.isCancelled);
    });

    toast.success(`Статус "${status === 'absent' ? 'Н' : 'У'}" установлен на все пары дня`);
  };

  const handleToggleLessonCancelled = (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    const record = getAttendance(selectedDate, lessonId);
    markAttendance(selectedDate, lessonId, record.absentStudentIds, record.excusedStudentIds, !record.isCancelled);
  };

  // Export official Word (.docx) document
  const handleExportWord = async () => {
    try {
      setIsExporting(true);
      const groupConfig = AVAILABLE_GROUPS.find(g => g.id === currentGroupId) || AVAILABLE_GROUPS[0];
      const faculty = FACULTIES.find(f => f.id === groupConfig.facultyId) || FACULTIES[0];
      
      toast.info('Формирование Word отчета пропусков...');
      await exportAttendanceToWord(records, students, groupConfig, faculty);
      toast.success('Официальный отчет в Word выгружен!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Не удалось сформировать Word документ');
    } finally {
      setIsExporting(false);
    }
  };

  // Pre-calculate statistics for the summary table
  const reportData = React.useMemo(() => {
    return students.map(student => {
      const absences = [0, 0, 0, 0];
      const excused = [0, 0, 0, 0];
      let totalAllTimeAbs = 0;
      let totalAllTimeExc = 0;
      
      records.forEach(record => {
        if (record.isCancelled) return;

        const isAbsent = record.absentStudentIds.includes(student.id);
        const isExcused = !isAbsent && (record.excusedStudentIds || []).includes(student.id);

        if (isAbsent) totalAllTimeAbs += 2;
        else if (isExcused) totalAllTimeExc += 2;

        if (isAbsent || isExcused) {
          BLOCKS.forEach((block, index) => {
            if (record.date >= block.start && record.date <= block.end) {
              if (isAbsent) absences[index] += 2;
              else if (isExcused) excused[index] += 2;
            }
          });
        }
      });
      
      return { ...student, absences, excused, totalAllTimeAbs, totalAllTimeExc };
    });
  }, [records, activeTab, currentGroupId, students]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header Bar with Export Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Журнал посещаемости</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Группа: <span className="font-semibold text-indigo-600 dark:text-indigo-400">3-ИНГТ-110</span> • Режим: <span className="font-bold uppercase text-indigo-600 dark:text-indigo-400">{userRole}</span>
          </p>
        </div>

        <button
          onClick={handleExportWord}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-emerald-200 dark:shadow-none w-full sm:w-auto"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Формирование...' : 'Выгрузить Word (.docx)'}</span>
        </button>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('mark')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'mark'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Отметить н-ки
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'report'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Отчет (часы пропусков)
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'details'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Сводка по парам
        </button>
      </div>

      {/* TAB 1: MARK ATTENDANCE */}
      {activeTab === 'mark' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Выберите дату занятий</label>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={handleDateChange}
                className="px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white dark:[color-scheme:dark]"
              />
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Неделя {week}, <span className="text-indigo-600 dark:text-indigo-400 font-bold">{dayName}</span>
            </div>
          </div>

          {lessons.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
              В этот день по расписанию нет пар.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lessons Selection Column */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Выберите пару для отметки</h3>
                {lessons.map(lesson => {
                  const isSelected = selectedLesson?.id === lesson.id;
                  const record = getAttendance(selectedDate, lesson.id);
                  const isCancelled = record.isCancelled;
                  const absentCount = record.absentStudentIds.length;
                  const excusedCount = (record.excusedStudentIds || []).length;
                  
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => handleLessonSelect(lesson)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        isCancelled
                          ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 opacity-60'
                          : isSelected 
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/50' 
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-indigo-600 dark:text-indigo-400'}`}>
                          {lesson.timeStart} - {lesson.timeEnd}
                        </span>
                        {!isCancelled && (absentCount > 0 || excusedCount > 0) && (
                          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {absentCount > 0 && <span className="text-red-500">{absentCount}Н</span>}
                            {absentCount > 0 && excusedCount > 0 && ' '}
                            {excusedCount > 0 && <span className="text-amber-500">{excusedCount}У</span>}
                          </span>
                        )}
                      </div>
                      <div className={`font-semibold text-sm line-clamp-2 ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                        {lesson.subject}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {lesson.type} {isCancelled && '(Отменена)'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Student Marking Area */}
              <div className="lg:col-span-2">
                {selectedLesson ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Отметка посещаемости</h3>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium">
                          {selectedLesson.subject} ({selectedLesson.timeStart} - {selectedLesson.timeEnd})
                        </p>
                      </div>

                      {canEdit && (
                        <button
                          onClick={(e) => handleToggleLessonCancelled(selectedLesson.id, e)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                            getAttendance(selectedDate, selectedLesson.id).isCancelled
                              ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                              : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100'
                          }`}
                        >
                          {getAttendance(selectedDate, selectedLesson.id).isCancelled ? '✔ Восстановить пару' : '🚫 Отменить пару на этот день'}
                        </button>
                      )}
                    </div>

                    {getAttendance(selectedDate, selectedLesson.id).isCancelled && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 text-xs font-bold text-red-600 dark:text-red-400 text-center">
                        Пара отменена на выбранную дату (посещаемость не учитывается и н-ки не начисляются).
                      </div>
                    )}

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {students.map(student => {
                        const record = getAttendance(selectedDate, selectedLesson.id);
                        const isAbsent = record.absentStudentIds.includes(student.id);
                        const isExcused = (record.excusedStudentIds || []).includes(student.id);
                        const isPresent = !isAbsent && !isExcused;
                        
                        return (
                          <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <span className={`text-sm font-semibold ${isAbsent ? 'text-red-500' : isExcused ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'}`}>
                              {student.id}. {student.name}
                            </span>

                            {canEdit ? (
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {/* Individual Lesson Status Buttons */}
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
                                  <button
                                    onClick={() => handleSetStudentStatus(student.id, 'present')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                      isPresent ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                  >
                                    Прис
                                  </button>
                                  <button
                                    onClick={() => handleSetStudentStatus(student.id, 'absent')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                      isAbsent ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                  >
                                    Н
                                  </button>
                                  <button
                                    onClick={() => handleSetStudentStatus(student.id, 'excused')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                      isExcused ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                  >
                                    УП
                                  </button>
                                </div>

                                {/* Full Day Quick Actions */}
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
                                  <button
                                    onClick={() => handleSetFullDayStatus(student.id, 'absent')}
                                    className="px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:text-red-500 transition-colors"
                                    title="Проставить Н на все пары дня"
                                  >
                                    День Н
                                  </button>
                                  <button
                                    onClick={() => handleSetFullDayStatus(student.id, 'excused')}
                                    className="px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:text-amber-500 transition-colors"
                                    title="Проставить УП на все пары дня"
                                  >
                                    День УП
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* READ ONLY FOR STUDENTS: Plain static status badge with ZERO edit capability */
                              <span className={`text-xs font-bold px-3 py-1.5 rounded-xl select-none ${isPresent ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : isAbsent ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'}`}>
                                {isPresent ? 'Присутствует' : isAbsent ? 'Отсутствует (Н)' : 'Уважительная (УП)'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-indigo-400" />
                    Выберите пару из списка слева, чтобы проставить посещаемость студентам.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MONTHLY REPORT (HOURS ABSENT & WORD EXPORT) */}
      {activeTab === 'report' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Сводка пропусков по 4 блокам</h3>
              <p className="text-xs text-slate-400 mt-0.5">Официальная отчетность для отправки в деканат в 20-х числах</p>
            </div>
            <button
              onClick={handleExportWord}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Формирование...' : 'Скачать Word (.docx)'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Студент</th>
                  {BLOCKS.map(b => (
                    <th key={b.id} className="p-3">{b.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportData.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{row.name}</td>
                    {row.absences.map((abs, blockIdx) => (
                      <td key={blockIdx} className="p-3">
                        <span className={abs > 0 ? 'text-red-500 font-bold' : 'text-slate-400'}>{abs}н</span>
                        {' / '}
                        <span className={row.excused[blockIdx] > 0 ? 'text-amber-500 font-bold' : 'text-slate-400'}>{row.excused[blockIdx]}уп</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAIR DETAILS TABLE */}
      {activeTab === 'details' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Сводная таблица по всем занятиям</h3>
            <span className="text-xs text-slate-400">Всего студентов: {students.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="p-3">№</th>
                  <th className="p-3">Студент</th>
                  <th className="p-3 text-center">Всего Н (часов)</th>
                  <th className="p-3 text-center">Всего УП (часов)</th>
                  <th className="p-3 text-center">Итого пропусков</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportData.map((row, idx) => {
                  const totalAbs = row.totalAllTimeAbs;
                  const totalExc = row.totalAllTimeExc;
                  const grandTotal = totalAbs + totalExc;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{row.name}</td>
                      <td className="p-3 text-center font-bold text-red-500">{totalAbs} ч.</td>
                      <td className="p-3 text-center font-bold text-amber-500">{totalExc} ч.</td>
                      <td className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">{grandTotal} ч.</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTracker;
