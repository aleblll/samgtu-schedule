import React, { useState, useEffect, useRef } from 'react';
import { X, Bug, Upload, Image as ImageIcon, Trash2, Send, ExternalLink, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { WORKER_BASE } from '../utils/cloudSync';
import { getGroupTag } from '../constants';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGroupId: string;
  currentGroupName: string;
  currentCourse?: number;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  currentGroupId,
  currentGroupName,
  currentCourse
}) => {
  const [course, setCourse] = useState<number | string>(currentCourse || 1);
  const [groupName, setGroupName] = useState<string>(currentGroupName);
  const [contact, setContact] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      setCourse(currentCourse || 1);
      setGroupName(currentGroupName);
      setIsSuccess(false);
      try {
        const savedContact = localStorage.getItem('bugreport_contact');
        if (savedContact) setContact(savedContact);
      } catch (e) {}
    }
  }, [isOpen, currentCourse, currentGroupName]);

  // Clean up object URL when unmounting or changing screenshot
  useEffect(() => {
    return () => {
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Размер скриншота не должен превышать 10 МБ');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите файл изображения (PNG, JPG, WEBP)');
      return;
    }

    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }

    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleRemoveScreenshot = () => {
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanDesc = description.trim();
    if (cleanDesc.length < 5) {
      toast.error('Пожалуйста, опишите проблему подробнее (минимум 5 символов)');
      return;
    }

    const cleanGroup = groupName.trim();
    if (!cleanGroup) {
      toast.error('Пожалуйста, укажите номер группы');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save contact for future convenience
      if (contact.trim()) {
        try {
          localStorage.setItem('bugreport_contact', contact.trim());
        } catch (e) {}
      }

      const groupTag = getGroupTag(cleanGroup);
      const nowSamara = new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Samara',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Prepare text caption for Telegram
      const captionLines = [
        '🚨 БАГ-РЕПОРТ #bugreport #' + (groupTag || 'samgtu'),
        '',
        `🎓 Курс: ${course}`,
        `👥 Группа: ${cleanGroup} (${currentGroupId})`,
        `📱 Контакт: ${contact.trim() ? contact.trim() : 'не указан'}`,
        '',
        '📝 Описание проблемы:',
        cleanDesc.length > 700 ? cleanDesc.slice(0, 700) + '...' : cleanDesc,
        '',
        `⏰ Время: ${nowSamara} (Самара, UTC+4)`,
        `🌐 Клиент: ${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}`
      ];

      const caption = captionLines.join('\n');

      const formData = new FormData();

      if (screenshotFile) {
        formData.append('document', screenshotFile, screenshotFile.name);
      } else {
        // Create an informational text document if no screenshot attached
        const fullReportText = [
          '========================================',
          '        БАГ-РЕПОРТ: РАСПИСАНИЕ САМГТУ   ',
          '========================================',
          `Дата и время: ${nowSamara} (UTC+4)`,
          `Курс: ${course}`,
          `Группа: ${cleanGroup} (ID: ${currentGroupId})`,
          `Контакт для связи: ${contact.trim() || 'Не указан'}`,
          `User Agent: ${navigator.userAgent}`,
          '----------------------------------------',
          'ПОДРОБНОЕ ОПИСАНИЕ ПРОБЛЕМЫ:',
          cleanDesc,
          '========================================'
        ].join('\n');

        const blob = new Blob([fullReportText], { type: 'text/plain;charset=utf-8' });
        const fileName = `report_${cleanGroup.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')}_${Date.now()}.txt`;
        formData.append('document', blob, fileName);
      }

      formData.append('caption', caption);

      const res = await fetch(`${WORKER_BASE}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Ошибка шлюза: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.description || 'Telegram отклонил отправку отчета');
      }

      setIsSuccess(true);
      toast.success('Баг-репорт успешно отправлен разработчику!');

      setTimeout(() => {
        setDescription('');
        handleRemoveScreenshot();
        onClose();
        setIsSuccess(false);
      }, 1500);

    } catch (err: any) {
      console.error('Bug report error:', err);
      toast.error(`Не удалось отправить отчет: ${err.message || 'Ошибка сети'}. Вы можете написать напрямую @A_le_BL`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                Сообщить об ошибке
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Баг-репорт с расписания СамГТУ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 flex-1">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Отчет успешно доставлен!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Спасибо за помощь в улучшении сервиса. Разработчик уже получил уведомление.
              </p>
            </div>
          ) : (
            <>
              {/* Developer Direct Contact Banner */}
              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 p-3.5 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">Связь с разработчиком</div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Telegram: <span className="font-semibold text-indigo-600 dark:text-indigo-400">@A_le_BL</span>
                    </div>
                  </div>
                </div>
                <a
                  href="https://t.me/A_le_BL"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition-colors shrink-0 shadow-sm"
                >
                  Написать <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Course & Group Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                    Курс
                  </label>
                  <select
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {[1, 2, 3, 4, 5, 6].map(c => (
                      <option key={c} value={c}>{c} курс</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                    Группа
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Например: 2-ХТФ-115"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Contact / Phone / TG */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Ваш контакт (Telegram или номер) <span className="text-slate-400 font-normal lowercase">(по желанию)</span>
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="@username или +7 999 000-00-00"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Problem Description */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Описание проблемы <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите, что именно пошло не так: какая пара, день недели, неверная аудитория или сбой..."
                  rows={4}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              {/* Screenshot Attachment */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Скриншот ошибки <span className="text-slate-400 font-normal lowercase">(рекомендуется)</span>
                </label>

                {screenshotPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 max-h-48 flex items-center justify-center group">
                    <img 
                      src={screenshotPreview} 
                      alt="Скриншот проблемы" 
                      className="max-h-48 w-auto object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveScreenshot}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors"
                      title="Удалить скриншот"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20"
                  >
                    <div className="w-9 h-9 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Нажмите, чтобы прикрепить скриншот
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      PNG, JPG, WEBP до 10 МБ
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || description.trim().length < 5}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md shadow-red-200 dark:shadow-none flex items-center gap-1.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Отправка в ТГК...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Отправить баг-репорт
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default BugReportModal;
