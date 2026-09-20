import React, { useState } from 'react';
import { UserRole } from '../types';
import { Shield, ShieldAlert, ShieldCheck, Key, UserCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { verifyPinCode } from '../utils/auth';
import { SAMGTU_GROUP_MAP } from '../utils/samgtuGroupMap';
import { fetchOfficialSamgtuSchedule } from '../utils/cloudSync';
import { SCHEDULE_REGISTRY } from '../constants';
import { logger } from '../utils/logger';

interface AdminPanelProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole, targetGroupId?: string) => void;
  userEmail: string | null;
  currentGroupId?: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentRole, onRoleChange, currentGroupId }) => {
  const [pinCode, setPinCode] = useState('');
  const [selectedAuditGroup, setSelectedAuditGroup] = useState(currentGroupId && SAMGTU_GROUP_MAP[currentGroupId] ? currentGroupId : 'ingt-310');
  const [isCheckingOfficial, setIsCheckingOfficial] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    groupName: string;
    status: 'match' | 'diff' | 'error';
    summary: string;
    details: string[];
  } | null>(null);

  const handleVerifyPin = async () => {
    const pin = pinCode.trim();
    if (!pin) return;

    try {
      const authRes = await verifyPinCode(pin);
      if (!authRes) {
        toast.error('Неверный PIN-код доступа');
        return;
      }

      if (authRes.role === 'admin') {
        onRoleChange('admin');
        toast.success('Авторизован режим Главного Администратора');
        setPinCode('');
      } else if (authRes.role === 'starosta' && authRes.targetGroupId) {
        onRoleChange('starosta', authRes.targetGroupId);
        toast.success(`Авторизован режим Старосты (${authRes.groupName || authRes.targetGroupId})`);
        setPinCode('');
      }
    } catch {
      toast.error('Ошибка проверки PIN-кода');
    }
  };

  const handleCheckOfficial = async (groupId: string) => {
    const groupConf = SAMGTU_GROUP_MAP[groupId];
    if (!groupConf) {
      toast.error('Данная группа не привязана к официальному API');
      return;
    }

    setIsCheckingOfficial(true);
    setAuditResult(null);
    logger.action('SYNC', `Admin initiated official schedule check for ${groupConf.name}`);

    try {
      const officialData = await fetchOfficialSamgtuSchedule(groupConf.samgtuGroupId, 1);
      if (!officialData || !officialData.wd) {
        setAuditResult({
          groupName: groupConf.name,
          status: 'error',
          summary: 'Сервер СамГТУ не вернул данные или временно недоступен. Проверьте сеть.',
          details: []
        });
        setIsCheckingOfficial(false);
        return;
      }

      let officialCount = 0;
      for (let dayIdx = 1; dayIdx <= 6; dayIdx++) {
        const offDay = officialData.wd[String(dayIdx)];
        if (offDay && offDay.at) {
          Object.values(offDay.at).forEach((slot: any) => {
            if (slot.Cells && slot.Cells.length > 0) {
              officialCount += slot.Cells.length;
            }
          });
        }
      }

      const existingWeek1 = SCHEDULE_REGISTRY[groupId]?.[1] || [];
      const currentCount = existingWeek1.reduce((sum, d) => sum + d.lessons.length, 0);

      if (Math.abs(officialCount - currentCount) === 0) {
        setAuditResult({
          groupName: groupConf.name,
          status: 'match',
          summary: `Расписание 1-й недели полностью совпадает с базой СамГТУ (${officialCount} пар). Расхождений нет.`,
          details: []
        });
        toast.success(`Сверка ${groupConf.name}: 0 расхождений`);
      } else {
        setAuditResult({
          groupName: groupConf.name,
          status: 'diff',
          summary: `Обнаружены расхождения в количестве пар: в СамГТУ — ${officialCount}, в приложении — ${currentCount}.`,
          details: [
            `Официальный реестр СамГТУ: ${officialCount} пар на 1-й неделе`,
            `Текущее расписание приложения: ${currentCount} пар на 1-й неделе`
          ]
        });
        toast.warning(`Группа ${groupConf.name}: есть расхождения`);
      }
    } catch (err: any) {
      setAuditResult({
        groupName: groupConf.name,
        status: 'error',
        summary: `Ошибка при проверке: ${err?.message || 'Неизвестная ошибка'}`,
        details: []
      });
    } finally {
      setIsCheckingOfficial(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Role Banner Header */}
      <div className="bg-gradient-to-r from-amber-500 to-indigo-600 p-6 rounded-3xl text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Панель управления доступом</h2>
            <p className="text-xs text-white/80 mt-0.5">
              Текущий статус: <span className="font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">{currentRole}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => { onRoleChange('student'); toast.info('Режим студента'); }}
            className={`flex-1 sm:flex-initial px-3 py-2 text-xs font-bold rounded-xl transition-all ${
              currentRole === 'student' ? 'bg-white text-slate-900 shadow-md' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            Студент
          </button>
          {currentRole !== 'student' && (
            <button
              onClick={() => { onRoleChange('student'); toast.info('Выход из системы'); }}
              className="flex-1 sm:flex-initial px-3 py-2 text-xs font-bold rounded-xl bg-red-500/30 hover:bg-red-500/50 text-white transition-all"
            >
              Выйти
            </button>
          )}
        </div>
      </div>

      {/* Role State Banner / PIN Verification Form */}
      {currentRole === 'admin' ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Режим Главного Администратора активен</h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Полный доступ ко всем функциям управления системой</p>
                </div>
              </div>
              <button
                onClick={() => { onRoleChange('student'); toast.info('Сессия администратора завершена'); }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all self-start sm:self-auto"
              >
                Выйти из админки
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Авторизация подтверждена. Вам доступны: глобальное редактирование расписания, сверка с СамГТУ, назначение ответственных преподавателей, сброс кэша и принудительная синхронизация с облаком.
            </p>
          </div>

          {/* SamGTU Schedule Sync Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <RefreshCw className={`w-5 h-5 ${isCheckingOfficial ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Сверка расписания с официальным API СамГТУ</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Проверка актуальности данных в приложении по базе университета</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                API СамГТУ
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <select
                value={selectedAuditGroup}
                onChange={(e) => setSelectedAuditGroup(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none min-h-[44px]"
              >
                {Object.entries(SAMGTU_GROUP_MAP).map(([gid, conf]) => (
                  <option key={gid} value={gid}>
                    {conf.name} ({conf.samgtuName})
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleCheckOfficial(selectedAuditGroup)}
                disabled={isCheckingOfficial}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingOfficial ? 'animate-spin' : ''}`} />
                {isCheckingOfficial ? 'Сверяю...' : 'Запустить сверку'}
              </button>
            </div>

            {auditResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                auditResult.status === 'match'
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                  : auditResult.status === 'diff'
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
                  : 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-800/40 text-red-900 dark:text-red-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>Результат для группы {auditResult.groupName}:</span>
                  <span>{auditResult.status === 'match' ? '✅ Полное совпадение' : auditResult.status === 'diff' ? '⚠️ Есть расхождения' : '❌ Ошибка сети'}</span>
                </div>
                <p className="text-[11px] opacity-90">{auditResult.summary}</p>
                {auditResult.details.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-[11px] pt-1">
                    {auditResult.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      ) : currentRole === 'starosta' ? (
        <div className="bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent border border-indigo-500/20 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Режим Старосты активен</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Доступны отметки посещаемости и редактирование пар группы</p>
              </div>
            </div>
            <button
              onClick={() => { onRoleChange('student'); toast.info('Сессия старосты завершена'); }}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all self-start sm:self-auto"
            >
              Выйти
            </button>
          </div>
          <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Для перехода в режим Главного Администратора введите PIN-код администратора:
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                inputMode="text"
                maxLength={16}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                placeholder="PIN-код Главного Администратора"
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none min-h-[44px]"
              />
              <button
                onClick={handleVerifyPin}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm min-h-[44px]"
              >
                Повысить до Админа
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Авторизация по PIN-коду</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Для доступа к функциям Старосты или Главного Администратора введите ваш закрытый персональный PIN-код.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              inputMode="text"
              maxLength={16}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
              placeholder="Введите секретный PIN-код"
              className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none min-h-[44px]"
            />
            <button
              onClick={handleVerifyPin}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm min-h-[44px]"
            >
              Подтвердить
            </button>
          </div>
        </div>
      )}

      {/* Roles & Permissions Reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900 dark:text-white">Студент</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Свободный просмотр расписания пар и своей статистики без паролей.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900 dark:text-white">Староста</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Отметка пропусков ("н-ок") для группы 3-ИНГТ-110 и редактирование состава группы по PIN-коду.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900 dark:text-white">Администратор</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Полный доступ к системе управления, сбросу данных и управлению группой.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
