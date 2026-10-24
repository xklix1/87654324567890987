import React from 'react';
import { ComponentState } from '../../types/common';
import { useLanguage } from '../../context/LanguageContext';
import { RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

interface ComponentStateWrapperProps {
  state: ComponentState;
  children: React.ReactNode;
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export const ComponentStateWrapper: React.FC<ComponentStateWrapperProps> = ({
  state,
  children,
  loadingMessage,
  errorMessage,
  emptyMessage,
  onRetry,
  loadingComponent,
  errorComponent,
  emptyComponent,
}) => {
  const { t } = useLanguage();

  if (state === 'loading') {
    if (loadingComponent) return <>{loadingComponent}</>;
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center glass-panel rounded-xl border border-dark-700 min-h-[220px]">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <Loader2 className="w-6 h-6 text-emerald-400 absolute animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-slate-300 tracking-wide">
          {loadingMessage ?? t('status_running')}
        </p>
      </div>
    );
  }

  if (state === 'error') {
    if (errorComponent) return <>{errorComponent}</>;
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center glass-panel rounded-xl border border-red-500/30 bg-red-950/20 min-h-[220px]">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400 shadow-danger-glow">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-red-200 mb-1">{t('splash_error_title')}</h4>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
          {errorMessage ?? t('splash_error_desc')}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold tracking-wider transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('retry')}
          </button>
        )}
      </div>
    );
  }

  if (state === 'empty') {
    if (emptyComponent) return <>{emptyComponent}</>;
    if (emptyMessage) {
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-dark-900/80 border border-dark-800 text-center text-xs font-mono text-slate-400">
            {emptyMessage}
          </div>
          {children}
        </div>
      );
    }
    return <>{children}</>;
  }

  return <>{children}</>;
};
