import React, { useState } from 'react';
import { UserRole } from '../types';
import { Shield, ShieldAlert, Key, UserCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPanelProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole, targetGroupId?: string) => void;
  userEmail: string | null;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentRole, onRoleChange }) => {
  const [pinCode, setPinCode] = useState('');

  const handleVerifyPin = () => {
    const pin = pinCode.trim().toLowerCase();
    if (pin === '2808') {
      onRoleChange('admin');
      toast.success('Авторизован режим Главного Администратора');
      setPinCode('');
    } else if (pin === '101') {
      onRoleChange('starosta', 'ingt-301');
      toast.success('Авторизован режим Старосты (3-ИНГТ-101)');
      setPinCode('');
    } else if (pin === '103') {
      onRoleChange('starosta', 'ingt-303');
      toast.success('Авторизован режим Старосты (3-ИНГТ-103)');
      setPinCode('');
    } else if (pin === '110') {
      onRoleChange('starosta', 'ingt-310');
      toast.success('Авторизован режим Старосты (3-ИНГТ-110)');
      setPinCode('');
    } else if (pin === 'faid110' || pin === '3110') {
      onRoleChange('starosta', 'faid-310');
      toast.success('Авторизован режим Старосты (3-ФАИД-110)');
      setPinCode('');
    } else {
      toast.error('Неверный PIN-код доступа');
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

      {/* PIN Verification Form (Without revealing PIN codes) */}
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
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
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
