import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { CLIENT_VERSION } from '../../config/version';
import { ShieldAlert, Download, RefreshCw } from 'lucide-react';

interface ForceUpdateModalProps {
  minimumSupportedVersion: string;
  onRetry: () => void;
  onResetSimulation?: () => void;
}

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  minimumSupportedVersion,
  onRetry,
  onResetSimulation,
}) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/90 backdrop-blur-xl">
      <div className="relative w-full max-w-md p-6 glass-panel rounded-2xl border border-red-500/40 shadow-danger-glow bg-dark-900/95 text-center">
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-danger-glow">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-black text-slate-100 mb-2 font-cairo">
          {t('update_required_title')}
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-6">
          {t('update_required_desc')}
        </p>

        {/* Version Matrix Comparison */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-dark-950/80 border border-dark-800 mb-6 font-mono text-xs">
          <div className="flex flex-col items-center border-l border-dark-800">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">
              {t('update_current_ver')}
            </span>
            <span className="text-red-400 font-bold text-sm">
              v{CLIENT_VERSION}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">
              {t('update_min_ver')}
            </span>
            <span className="text-emerald-400 font-bold text-sm">
              v{minimumSupportedVersion}
            </span>
          </div>
        </div>

        {/* Primary Action: Download APK */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              window.open('https://github.com/wealth-race/releases/latest', '_blank');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs tracking-wider shadow-danger-glow transition-all active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>{t('update_download_btn')}</span>
          </button>

          <button
            onClick={() => {
              if (onResetSimulation) onResetSimulation();
              onRetry();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 font-semibold text-xs border border-dark-700 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('update_restart_btn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
