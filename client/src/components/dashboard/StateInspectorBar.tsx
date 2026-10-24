import React from 'react';
import { ComponentState } from '../../types/common';
import { useLanguage } from '../../context/LanguageContext';
import { Sliders, RefreshCw, AlertTriangle, Inbox, CheckCircle2, Loader2 } from 'lucide-react';

interface StateInspectorBarProps {
  currentState: ComponentState;
  onSelectState: (state: ComponentState) => void;
  onRerunPipeline: () => void;
  isOpen: boolean;
}

export const StateInspectorBar: React.FC<StateInspectorBarProps> = ({
  currentState,
  onSelectState,
  onRerunPipeline,
  isOpen,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="w-full bg-dark-900 border-b border-cyan-500/30 p-3 shadow-cyan-glow transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-cyan-300 font-bold">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>{t('state_inspector_title')}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            id="inspector-state-loading"
            onClick={() => onSelectState('loading')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-all ${
              currentState === 'loading'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-cyan-glow'
                : 'bg-dark-950 text-slate-400 border-dark-800 hover:text-slate-200'
            }`}
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{t('state_loading')}</span>
          </button>

          <button
            id="inspector-state-error"
            onClick={() => onSelectState('error')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-all ${
              currentState === 'error'
                ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-danger-glow'
                : 'bg-dark-950 text-slate-400 border-dark-800 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t('state_error')}</span>
          </button>

          <button
            id="inspector-state-empty"
            onClick={() => onSelectState('empty')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-all ${
              currentState === 'empty'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-gold-glow'
                : 'bg-dark-950 text-slate-400 border-dark-800 hover:text-slate-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>{t('state_empty')}</span>
          </button>

          <button
            id="inspector-state-success"
            onClick={() => onSelectState('success')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-all ${
              currentState === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-glow'
                : 'bg-dark-950 text-slate-400 border-dark-800 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('state_success')}</span>
          </button>

          <div className="h-4 w-px bg-dark-700 mx-1 hidden sm:block" />

          <button
            id="inspector-btn-rerun"
            onClick={onRerunPipeline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-700 font-semibold transition-all"
            title="Restart Initialization Pipeline from Scratch"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            <span>{t('state_normal_mode')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
