import React from 'react';
import { OfflineProgressionAccrual } from '../../types/sync';
import { useLanguage } from '../../context/LanguageContext';
import { Coins, Clock, Briefcase, Check } from 'lucide-react';

interface OfflineEarningsModalProps {
  accrual: OfflineProgressionAccrual;
  onClose: () => void;
}

export const OfflineEarningsModal: React.FC<OfflineEarningsModalProps> = ({ accrual, onClose }) => {
  const { t } = useLanguage();

  if (accrual.accrued_amount <= 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm p-6 glass-panel rounded-2xl border border-emerald-500/40 shadow-emerald-glow bg-dark-900/95 text-center">
        {/* Glow Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-emerald-glow">
          <Coins className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-black text-slate-100 mb-1 font-cairo">
          {t('dash_offline_earnings')}
        </h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {t('dash_offline_accrual_notice')}
        </p>

        {/* Accrual Metric Box */}
        <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 mb-6 text-center">
          <span className="text-[11px] font-medium text-slate-500 block mb-1">
            {t('dash_accrued_amount')}
          </span>
          <span className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
            +${accrual.accrued_amount.toFixed(2)}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-left mb-6 font-mono text-xs">
          <div className="p-2.5 rounded-lg bg-dark-850/60 border border-dark-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 block">Hours Accrued</span>
              <span className="font-bold text-slate-200">{accrual.capped_hours.toFixed(2)}h</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-dark-850/60 border border-dark-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 block">Rate / Hour</span>
              <span className="font-bold text-slate-200">${accrual.hourly_rate.toFixed(2)}/h</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-dark-950 font-bold text-xs shadow-emerald-glow transition-all active:scale-[0.98]"
        >
          <Check className="w-4 h-4" />
          <span>{t('dash_close_btn')}</span>
        </button>
      </div>
    </div>
  );
};
