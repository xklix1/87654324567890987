import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { EconomicSinksOverview } from '../../types/sectors';
import { SectorsService } from '../../services/sectors.service';
import { FastForward, Coins, ArrowDownRight, TrendingUp } from 'lucide-react';

interface EconomyControlBarProps {
  onBalanceUpdate?: (newBalance: number) => void;
}

export const EconomyControlBar: React.FC<EconomyControlBarProps> = ({ onBalanceUpdate }) => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [sinks, setSinks] = useState<EconomicSinksOverview | null>(null);
  const [isTicking, setIsTicking] = useState<boolean>(false);
  const [isFauceting, setIsFauceting] = useState<boolean>(false);

  const fetchSinks = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      const data = await SectorsService.getEconomicSinks(token);
      setSinks(data);
    } catch {
      // Non-critical, ignore
    }
  }, [token]);

  useEffect(() => {
    fetchSinks();
  }, [fetchSinks]);

  const handleTick = async (): Promise<void> => {
    if (!token) return;
    setIsTicking(true);
    try {
      const res = await SectorsService.tickProgression(token);
      const sign = res.net_delta >= 0 ? '+' : '';
      showToast(
        'info',
        'اكتملت دورة التدفق الاقتصادي',
        `تم تسليم الأجور واحتساب الصيانة. صافي التدفق: ${sign}$${res.net_delta.toFixed(2)}`
      );
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
      await fetchSinks();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشلت معالجة التدفق الاقتصادي';
      showToast('error', 'تعذر تنفيذ دورة التدفق', msg);
    } finally {
      setIsTicking(false);
    }
  };

  const handleFaucet = async (): Promise<void> => {
    if (!token) return;
    setIsFauceting(true);
    try {
      const res = await SectorsService.requestFaucet(token);
      showToast('success', 'تم إيداع الدعم التمويلي', 'تم إيداع $50,000.00 كرأس مال استثماري في محفظتك.');
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
      await fetchSinks();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'تعذر إيداع الدعم التمويلي';
      showToast('error', 'فشل الإيداع', msg);
    } finally {
      setIsFauceting(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-dark-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-cairo">
      {/* Economic Flow Telemetry */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400 font-cairo">إجمالي الإيرادات:</span>
          <span className="text-emerald-400 font-bold font-mono">+${(sinks?.hourly_income ?? 0).toFixed(2)}/ساعة</span>
        </div>

        <div className="flex items-center gap-1.5">
          <ArrowDownRight className="w-4 h-4 text-amber-400" />
          <span className="text-slate-400 font-cairo">الصيانة والضرائب:</span>
          <span className="text-amber-400 font-bold font-mono">-${((sinks?.hourly_maintenance ?? 0) + (sinks?.hourly_taxes ?? 0)).toFixed(2)}/ساعة</span>
        </div>

        <div className="flex items-center gap-1.5 border-r border-dark-800 pr-4">
          <span className="text-slate-400 font-cairo">صافي التدفق:</span>
          <span
            className={`font-bold font-mono ${(sinks?.net_hourly_flow ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {(sinks?.net_hourly_flow ?? 0) >= 0 ? '+' : ''}
            ${(sinks?.net_hourly_flow ?? 0).toFixed(2)}/ساعة
          </span>
        </div>
      </div>

      {/* Action Accelerator Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleTick}
          disabled={isTicking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-cyan-300 border border-dark-700 text-xs font-cairo font-bold transition-all disabled:opacity-50"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>{isTicking ? 'جارٍ المعالجة...' : t('action_tick')}</span>
        </button>

        <button
          onClick={handleFaucet}
          disabled={isFauceting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-cairo font-bold transition-all disabled:opacity-50"
        >
          <Coins className="w-3.5 h-3.5" />
          <span>{isFauceting ? 'جارٍ الإيداع...' : t('action_faucet')}</span>
        </button>
      </div>
    </div>
  );
};
