import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Copy, Check, ArrowRight, Calendar, BookOpen, User } from 'lucide-react';
import { toast } from 'sonner';
import { parseSamgtuSchedule, exportToRegistryCode, ParsedScheduleResult } from '../utils/samgtuParser';
import { pushGroupCloudData } from '../utils/cloudSync';
import { WeekData } from '../types';

interface ScheduleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGroupId: string | null;
  onApplySchedule: (groupId: string, weekData: WeekData, groupName?: string) => void;
}

export const ScheduleImportModal: React.FC<ScheduleImportModalProps> = ({
  isOpen,
  onClose,
  currentGroupId,
  onApplySchedule
}) => {
  const [rawInput, setRawInput] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedScheduleResult | null>(null);
  const [targetGroupId, setTargetGroupId] = useState(currentGroupId || 'ingt-310');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleParse = () => {
    if (!rawInput.trim()) {
      toast.error('Пожалуйста, вставьте текст или HTML со страницы ЛК СамГТУ');
      return;
    }

    try {
      const result = parseSamgtuSchedule(rawInput, {
        groupIdOverride: targetGroupId
      });

      if (result.totalUniqueLessons === 0 && result.rawLessons.length === 0) {
        toast.error('Не удалось найти пары. Убедитесь, что скопирована страница с расписанием из ЛК');
        return;
      }

      setParsedResult(result);
      if (result.meta.normalizedGroupId) {
        setTargetGroupId(result.meta.normalizedGroupId);
      }
      toast.success(`Успешно распознано: ${result.totalUniqueLessons} пар в цикле!`);
    } catch (e: any) {
      toast.error(`Ошибка парсинга: ${e?.message || 'Неверный формат данных'}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawInput(text);
      try {
        const result = parseSamgtuSchedule(text, { groupIdOverride: targetGroupId });
        setParsedResult(result);
        if (result.meta.normalizedGroupId) {
          setTargetGroupId(result.meta.normalizedGroupId);
        }
        toast.success(`Файл ${file.name} загружен: ${result.totalUniqueLessons} пар распознано`);
      } catch (err: any) {
        toast.error(`Ошибка чтения файла: ${err?.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    if (!parsedResult) return;
    const finalGroupId = targetGroupId || parsedResult.meta.normalizedGroupId || 'custom-group';

    // Apply to App state
    onApplySchedule(finalGroupId, parsedResult.weeks as unknown as WeekData, parsedResult.meta.groupName);

    // Sync to Cloud
    pushGroupCloudData({ schedule: parsedResult.weeks }, finalGroupId);

    toast.success(`Расписание для группы ${parsedResult.meta.groupName || finalGroupId} сохранено и синхронизировано!`);
    onClose();
  };

  const handleCopyCode = () => {
    if (!parsedResult) return;
    const code = exportToRegistryCode(parsedResult, targetGroupId);
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    toast.success('TypeScript-код скопирован в буфер обмена');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Импорт расписания из ЛК СамГТУ</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Автоматический парсинг 4-недельного цикла из lk.samgtu.ru</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Instruction */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-300 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" /> Как получить данные из ЛК СамГТУ:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
              <li>Откройте личный кабинет <a href="https://lk.samgtu.ru" target="_blank" rel="noreferrer" className="underline font-semibold text-indigo-600 dark:text-indigo-400">lk.samgtu.ru</a> и перейдите во вкладку «Календарь» (расписание).</li>
              <li>Выделите всё содержимое страницы (<kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-mono">Ctrl + A</kbd>) и скопируйте (<kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-mono">Ctrl + C</kbd>), либо сохраните страницу как HTML.</li>
              <li>Вставьте текст или выберите сохраненный HTML-файл ниже.</li>
            </ol>
          </div>

          {/* Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Текст или HTML из ЛК:
              </label>
              <label className="cursor-pointer text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Загрузить .html файл
                <input
                  type="file"
                  accept=".html,.htm,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Вставьте сюда скопированный текст или HTML со страницы lk.samgtu.ru..."
              className="w-full h-32 p-3 text-xs font-mono rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleParse}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              Распознать расписание <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Parsed Result Preview */}
          {parsedResult && (
            <div className="border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Успешно распознано!</span>
                </div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Всего пар: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{parsedResult.totalUniqueLessons}</span>
                </div>
              </div>

              {/* Student & Group info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {parsedResult.meta.studentName && (
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Студент: <strong>{parsedResult.meta.studentName}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Группа: <strong>{parsedResult.meta.groupName || targetGroupId}</strong> (ID: {targetGroupId})</span>
                </div>
              </div>

              {/* Weeks breakdown badges */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[1, 2, 3, 4].map(w => {
                  const count = parsedResult.weeks[w].reduce((sum, d) => sum + d.lessons.length, 0);
                  return (
                    <div key={w} className="bg-white dark:bg-slate-800 p-2 rounded-xl text-center border border-slate-200 dark:border-slate-700 shadow-xs">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Неделя {w}</div>
                      <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{count} пар</div>
                    </div>
                  );
                })}
              </div>

              {/* Subjects & Teachers preview */}
              <div className="text-xs text-slate-600 dark:text-slate-400 pt-1 space-y-1">
                <div>
                  <strong>Дисциплины ({parsedResult.uniqueSubjects.length}):</strong>{' '}
                  <span className="text-slate-500 dark:text-slate-400">{parsedResult.uniqueSubjects.slice(0, 3).join(', ')}{parsedResult.uniqueSubjects.length > 3 ? '...' : ''}</span>
                </div>
                <div>
                  <strong>Преподаватели ({parsedResult.uniqueTeachers.length}):</strong>{' '}
                  <span className="text-slate-500 dark:text-slate-400">{parsedResult.uniqueTeachers.slice(0, 3).join(', ')}{parsedResult.uniqueTeachers.length > 3 ? '...' : ''}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleCopyCode}
            disabled={!parsedResult}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1.5"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            Скопировать TypeScript-код
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleApply}
              disabled={!parsedResult}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Применить к группе {parsedResult?.meta.groupName || targetGroupId}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
