import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Plus, Calendar, Clock, Paperclip, Link as LinkIcon, 
  Trash2, Edit3, X, Check, Download, AlertCircle, FileText, ExternalLink, Filter 
} from 'lucide-react';
import { HomeworkItem, HomeworkAttachment } from '../types';
import { SCHEDULE_REGISTRY } from '../constants';
import { getSamaraDate, getSamaraISODate } from '../attendance';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { fetchGroupCloudData, pushGroupCloudData } from '../utils/cloudSync';
import { SEED_HOMEWORK } from '../defaultData';

interface HomeworkTrackerProps {
  currentGroupId: string;
  userRole?: string;
  refreshTrigger?: number;
}

const HomeworkTracker: React.FC<HomeworkTrackerProps> = ({
  currentGroupId,
  userRole = 'student',
  refreshTrigger = 0
}) => {
  const canEdit = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'starosta';

  // Get all unique subjects for this group
  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    const weeks = SCHEDULE_REGISTRY[currentGroupId] || {};
    Object.values(weeks).forEach(days => {
      days.forEach(day => {
        day.lessons.forEach(l => {
          if (l.subject) subjects.add(l.subject);
        });
      });
    });
    return Array.from(subjects).sort();
  }, [currentGroupId]);

  // Homework items state
  const [items, setItems] = useState<HomeworkItem[]>(() => {
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem(`deleted_hw_${currentGroupId}`) || '[]');
      const deletedSet = new Set(deletedIds);
      const saved = localStorage.getItem(`homework_${currentGroupId}`);
      if (saved !== null) {
        const local: HomeworkItem[] = JSON.parse(saved);
        return local.filter(it => it && it.id && !deletedSet.has(it.id));
      }
      const defaultList = currentGroupId === 'ingt-310' ? SEED_HOMEWORK : [];
      return defaultList.filter(it => it && it.id && !deletedSet.has(it.id));
    } catch (e) {
      return [];
    }
  });

  // Filter state
  const [filterMode, setFilterMode] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HomeworkItem | null>(null);

  // Form state
  const [formSubject, setFormSubject] = useState(availableSubjects[0] || '');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssignedDate, setFormAssignedDate] = useState(getSamaraISODate());
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = getSamaraDate();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formAttachments, setFormAttachments] = useState<HomeworkAttachment[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [linkNameInput, setLinkNameInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // 1. Universal Cloud Sync & Polling (Works across all classmates' phones without auth)
  useEffect(() => {
    let isMounted = true;

    const loadCloud = async (force: boolean = false) => {
      const cloud = await fetchGroupCloudData(force, currentGroupId);
      if (!isMounted || !cloud) return;

      // Read tombstone deleted items
      let deletedSet = new Set<string>();
      try {
        const d = JSON.parse(localStorage.getItem(`deleted_hw_${currentGroupId}`) || '[]');
        deletedSet = new Set(d);
      } catch (e) {}

      // Always read latest local items directly to avoid closure stale state
      let currentLocal: HomeworkItem[] = [];
      try {
        const saved = localStorage.getItem(`homework_${currentGroupId}`);
        if (saved) currentLocal = JSON.parse(saved);
      } catch (e) {}

      const cloudHw = Array.isArray(cloud.homework) ? cloud.homework : [];

      // If cloud is empty and local has items, auto-heal cloud by pushing local items!
      if (cloudHw.length === 0 && currentLocal.length > 0) {
        pushGroupCloudData({ homework: currentLocal.filter(it => !deletedSet.has(it.id)) }, currentGroupId);
        return;
      }

      // Merge seed, cloud, and local items respecting deleted items
      const isFirstRun = localStorage.getItem(`homework_${currentGroupId}`) === null;
      const defaultList = (isFirstRun && currentGroupId === 'ingt-310') ? SEED_HOMEWORK : [];
      const map = new Map<string, HomeworkItem>();
      defaultList.forEach(it => { if (it && it.id && !deletedSet.has(it.id)) map.set(it.id, it); });
      cloudHw.forEach(it => { if (it && it.id && !deletedSet.has(it.id)) map.set(it.id, it); });
      currentLocal.forEach(it => { if (it && it.id && !deletedSet.has(it.id)) map.set(it.id, it); });

      const merged = Array.from(map.values())
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

      setItems(merged);
      try {
        localStorage.setItem(`homework_${currentGroupId}`, JSON.stringify(merged));
      } catch (e) {}
    };

    // Load on mount or refresh
    loadCloud(true);

    // Poll every 5 min so rate limits are protected
    const interval = setInterval(() => {
      loadCloud(false);
    }, 300000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentGroupId, refreshTrigger]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormSubject(availableSubjects[0] || '');
    setFormTitle('');
    setFormDescription('');
    setFormAssignedDate(getSamaraISODate());
    const due = getSamaraDate();
    due.setDate(due.getDate() + 7);
    const y = due.getFullYear();
    const m = String(due.getMonth() + 1).padStart(2, '0');
    const d = String(due.getDate()).padStart(2, '0');
    setFormDueDate(`${y}-${m}-${d}`);
    setFormAttachments([]);
    setLinkInput('');
    setLinkNameInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: HomeworkItem) => {
    setEditingItem(item);
    setFormSubject(item.subject);
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormAssignedDate(item.assignedDate);
    setFormDueDate(item.dueDate);
    setFormAttachments(item.attachments || []);
    setLinkInput('');
    setLinkNameInput('');
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Файл слишком большой (>8 МБ). Прикрепите ссылку на Яндекс.Диск или Облако');
      return;
    }

    setIsUploading(true);

    try {
      if (file.type.startsWith('image/')) {
        // High-efficiency mobile canvas compression:
        // Converts 2-5MB phone camera photos down to crisp ~60-90KB JPEG!
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const MAX_DIM = 1200;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);
              const approxKb = Math.round((compressedBase64.length * 3) / 4 / 1024);
              setFormAttachments(prev => [
                ...prev,
                {
                  name: file.name,
                  data: compressedBase64,
                  type: 'image/jpeg',
                  size: approxKb + ' КБ'
                }
              ]);
              toast.success(`Фото «${file.name}» оптимизировано (${approxKb} КБ) и прикреплено`);
              resolve();
            } else {
              reject(new Error('Canvas 2D context unavailable'));
            }
          };
          img.onerror = reject;
          img.src = objectUrl;
        });
      } else {
        // PDF or document
        if (file.size > 500 * 1024) {
          toast.error(`Документ «${file.name}» весит ${(file.size / 1024).toFixed(0)} КБ (>500 КБ). Для больших методичек используйте кнопку «+ Ссылка» на Яндекс.Диск`);
          setIsUploading(false);
          return;
        }

        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onload = () => {
            setFormAttachments(prev => [
              ...prev,
              {
                name: file.name,
                data: reader.result as string,
                type: file.type || 'application/octet-stream',
                size: (file.size / 1024).toFixed(1) + ' КБ'
              }
            ]);
            toast.success(`Файл «${file.name}» прикреплен`);
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
    } catch (err) {
      console.warn('File upload error:', err);
      toast.error('Не удалось обработать файл');
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    let url = linkInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const name = linkNameInput.trim() || url;
    setFormAttachments(prev => [
      ...prev,
      {
        name,
        url,
        type: 'link'
      }
    ]);

    setLinkInput('');
    setLinkNameInput('');
    toast.success('Ссылка прикреплена');
  };

  const handleRemoveAttachment = (index: number) => {
    setFormAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject || !formTitle.trim()) {
      toast.error('Пожалуйста, заполните предмет и название задания');
      return;
    }

    // Always read freshest local items to prevent state loss
    let freshItems: HomeworkItem[] = [];
    try {
      const saved = localStorage.getItem(`homework_${currentGroupId}`);
      if (saved) freshItems = JSON.parse(saved);
    } catch (e) {}
    if (freshItems.length === 0 && items.length > 0) freshItems = items;

    const id = editingItem ? editingItem.id : `hw_${Date.now()}`;
    const newHomework: HomeworkItem = {
      id,
      groupId: currentGroupId,
      subject: formSubject,
      title: formTitle.trim(),
      description: formDescription.trim(),
      assignedDate: formAssignedDate,
      dueDate: formDueDate,
      attachments: formAttachments,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
    };

    const updated = editingItem 
      ? freshItems.map(it => it.id === id ? newHomework : it)
      : [...freshItems.filter(it => it.id !== id), newHomework];

    // Save locally immediately
    setItems(updated);
    try {
      localStorage.setItem(`homework_${currentGroupId}`, JSON.stringify(updated));
    } catch (e) {}

    setIsModalOpen(false);
    toast.success(editingItem ? 'Задание обновлено' : 'Новое ДЗ опубликовано для группы!');

    // Push to REST Cloud immediately (syncs to all classmates)
    pushGroupCloudData({ homework: updated }, currentGroupId).then(ok => {
      if (ok) console.log('Homework synced to cloud successfully');
    });

    try {
      await setDoc(doc(db, 'homework', id), newHomework);
    } catch (e) {
      console.warn('Homework cloud sync save warning:', e);
    }
  };

  const handleDeleteHomework = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это домашнее задание?')) return;

    // 1. Record in tombstone list so seed and cloud polling can NEVER resurrect it!
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem(`deleted_hw_${currentGroupId}`) || '[]');
      if (!deletedList.includes(id)) {
        deletedList.push(id);
        localStorage.setItem(`deleted_hw_${currentGroupId}`, JSON.stringify(deletedList));
      }
    } catch (e) {}

    let freshItems: HomeworkItem[] = [];
    try {
      const saved = localStorage.getItem(`homework_${currentGroupId}`);
      if (saved) freshItems = JSON.parse(saved);
    } catch (e) {}
    if (freshItems.length === 0 && items.length > 0) freshItems = items;

    const updated = freshItems.filter(it => it.id !== id);
    setItems(updated);
    try {
      localStorage.setItem(`homework_${currentGroupId}`, JSON.stringify(updated));
    } catch (e) {}

    toast.info('Задание удалено');

    // Push to REST Cloud immediately (syncs deletion to all classmates)
    pushGroupCloudData({ homework: updated }, currentGroupId).then(ok => {
      if (ok) console.log('Homework deletion synced to cloud successfully');
    });

    try {
      await deleteDoc(doc(db, 'homework', id));
    } catch (e) {}
  };

  const handleOpenAttachment = async (att: HomeworkAttachment) => {
    if (att.type === 'link' && att.url) {
      const trimmed = att.url.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        window.open(trimmed, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Небезопасная ссылка. Разрешены только протоколы http:// и https://');
      }
      return;
    }

    if (att.data) {
      if (Capacitor.isNativePlatform()) {
        try {
          const base64Only = att.data.includes(',') ? att.data.split(',')[1] : att.data;
          const writeRes = await Filesystem.writeFile({
            path: att.name,
            data: base64Only,
            directory: Directory.Cache
          });

          if (writeRes && writeRes.uri) {
            await Share.share({
              title: att.name,
              files: [writeRes.uri],
              dialogTitle: `Открыть ${att.name}`
            });
            return;
          }
        } catch (e) {
          console.warn('Native share attachment error:', e);
        }
      }

      // Browser fallback
      const link = document.createElement('a');
      link.href = att.data;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (att.url) {
      const trimmed = att.url.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        window.open(trimmed, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Небезопасная ссылка. Разрешены только протоколы http:// и https://');
      }
      return;
    }
  };

  // Filter items
  const todayISO = getSamaraISODate();
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Subject filter
      if (subjectFilter !== 'all' && item.subject !== subjectFilter) {
        return false;
      }

      // Date status filter
      if (filterMode === 'upcoming') {
        return item.dueDate >= todayISO;
      }
      if (filterMode === 'past') {
        return item.dueDate < todayISO;
      }
      return true;
    });
  }, [items, filterMode, subjectFilter, todayISO]);

  const getDueBadge = (dueDate: string) => {
    if (dueDate < todayISO) {
      return (
        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Срок истек
        </span>
      );
    }
    if (dueDate === todayISO) {
      return (
        <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse">
          🔥 Дедлайн СЕГОДНЯ!
        </span>
      );
    }
    // Calculate days remaining
    const diff = Math.ceil((new Date(dueDate).getTime() - new Date(todayISO).getTime()) / (1000 * 3600 * 24));
    if (diff <= 3) {
      return (
        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          ⏳ Осталось {diff} {diff === 1 ? 'день' : diff < 5 ? 'дня' : 'дней'}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        До {dueDate ? dueDate.split('-').reverse().slice(0, 2).join('.') : '—'}
      </span>
    );
  };

  return (
    <div className="space-y-5 w-full max-w-full">
      {/* Top Banner & Action */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Домашние задания и дедлайны</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Актуальные задания, методички и файлы для группы 3-ИНГТ-110
          </p>
        </div>

        {canEdit && (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Добавить задание
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status Mode Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
          <button
            onClick={() => setFilterMode('upcoming')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all ${
              filterMode === 'upcoming'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Актуальные ({items.filter(i => i.dueDate >= todayISO).length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all ${
              filterMode === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Все ({items.length})
          </button>
          <button
            onClick={() => setFilterMode('past')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all ${
              filterMode === 'past'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Прошедшие ({items.filter(i => i.dueDate < todayISO).length})
          </button>
        </div>

        {/* Subject Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">Все предметы</option>
            {availableSubjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Homework Cards List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-100 dark:border-slate-800 space-y-2">
          <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            {filterMode === 'upcoming' ? 'Все задания сданы! Нет горящих дедлайнов' : 'Заданий не найдено'}
          </h3>
          <p className="text-xs text-slate-400">
            {canEdit 
              ? 'Нажмите «Добавить задание», чтобы опубликовать новое ДЗ для одногруппников.'
              : 'Староста пока не добавил новых домашних заданий в этот раздел.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                {/* Header: Subject & Due Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 truncate max-w-[70%]">
                    {item.subject}
                  </div>
                  {getDueBadge(item.dueDate)}
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug mt-1">
                  {item.title}
                </h3>

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {item.description}
                  </p>
                )}

                {/* Dates info */}
                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Выдано: {item.assignedDate ? item.assignedDate.split('-').reverse().join('.') : '—'}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                    <Clock className="w-3 h-3 text-indigo-500" /> Сдать до: {item.dueDate ? item.dueDate.split('-').reverse().join('.') : '—'}
                  </span>
                </div>

                {/* Attachments Section */}
                {item.attachments && item.attachments.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Прикрепленные файлы и ссылки ({item.attachments.length}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.attachments.map((att, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOpenAttachment(att)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all"
                        >
                          {att.url ? (
                            <ExternalLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          )}
                          <span className="truncate max-w-[150px]">{att.name}</span>
                          {att.size && <span className="text-[9px] text-slate-400">({att.size})</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Starosta / Admin Controls */}
              {canEdit && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end items-center gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Изменить
                  </button>
                  <button
                    onClick={() => handleDeleteHomework(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Удалить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Homework Modal (Mobile Bottom Sheet Pattern) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5 shrink-0">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingItem ? 'Редактировать ДЗ' : 'Новое домашнее задание'}
                </h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                  Для всей группы 3-ИНГТ-110
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="hw-form" onSubmit={handleSaveHomework} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Предмет
                </label>
                <select
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  required
                >
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Тема задания / Краткий заголовок
                </label>
                <input
                  type="text"
                  placeholder="напр. Лабораторная работа №1 (Расчет сосудов)"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Подробное описание задания
                </label>
                <textarea
                  rows={3}
                  placeholder="Опишите, что нужно сделать, какие номера решить, требования к оформлению..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Дата выдачи
                  </label>
                  <input
                    type="date"
                    value={formAssignedDate}
                    onChange={(e) => setFormAssignedDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white dark:[color-scheme:dark]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Дедлайн (сдать до)
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white dark:[color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              {/* Attachments list in form */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Прикрепления (файлы и ссылки)
                </label>

                {formAttachments.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {formAttachments.map((att, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          {att.url ? <ExternalLink className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                          <span className="truncate text-slate-900 dark:text-slate-200">{att.name}</span>
                          {att.size && <span className="text-[10px] text-slate-400">({att.size})</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add File Button */}
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors min-h-[44px]">
                    <Paperclip className="w-4 h-4 text-indigo-500" />
                    <span>{isUploading ? 'Загрузка...' : 'Прикрепить файл (PDF, docx, фото)'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {/* Add Cloud Link Input */}
                <div className="flex flex-col sm:flex-row gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Название (напр. Яндекс.Диск)"
                    value={linkNameInput}
                    onChange={(e) => setLinkNameInput(e.target.value)}
                    className="sm:w-1/3 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                  <div className="flex flex-1 gap-1">
                    <input
                      type="text"
                      placeholder="Ссылка (URL) на материалы..."
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddLink}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 min-h-[44px]"
                    >
                      + Ссылка
                    </button>
                  </div>
                </div>
              </div>

              {/* Primary Submit Button directly inside the form flow */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all min-h-[48px]"
                >
                  <Plus className="w-5 h-5" /> {editingItem ? 'Сохранить изменения' : 'Добавить домашнее задание'}
                </button>
              </div>
            </form>

            {/* Fixed Footer with Safe Area */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-xl min-h-[44px]"
              >
                Отмена
              </button>
              <button
                type="submit"
                form="hw-form"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all min-h-[44px]"
              >
                <Plus className="w-4 h-4" /> {editingItem ? 'Сохранить' : 'Добавить ДЗ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeworkTracker;
