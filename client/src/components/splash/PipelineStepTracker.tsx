import React from 'react';
import { PipelineStep } from '../../types/common';
import { useLanguage } from '../../context/LanguageContext';
import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';

interface PipelineStepTrackerProps {
  steps: PipelineStep[];
  currentStepIndex: number;
}

export const PipelineStepTracker: React.FC<PipelineStepTrackerProps> = ({ steps, currentStepIndex }) => {
  const { t } = useLanguage();

  return (
    <div className="w-full flex flex-col gap-3">
      {steps.map((step, idx) => {
        const isCurrent = idx === currentStepIndex && step.status === 'running';
        const isCompleted = step.status === 'completed';
        const isFailed = step.status === 'failed';

        return (
          <div
            key={step.id}
            className={`p-3.5 rounded-xl border transition-all ${
              isCurrent
                ? 'bg-dark-850/90 border-cyan-500/50 shadow-cyan-glow'
                : isCompleted
                ? 'bg-dark-900/60 border-emerald-500/30 text-slate-300'
                : isFailed
                ? 'bg-red-950/30 border-red-500/50 text-red-200'
                : 'bg-dark-900/40 border-dark-800 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : isFailed ? (
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-slate-600">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">
                      0{step.order}
                    </span>
                    <h5
                      className={`text-xs font-bold tracking-wide ${
                        isCurrent
                          ? 'text-cyan-300'
                          : isCompleted
                          ? 'text-slate-200'
                          : isFailed
                          ? 'text-red-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {t(step.labelKey)}
                    </h5>
                  </div>
                  {step.detail && (
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 text-[11px] font-medium">
                {isCompleted && (
                  <span className="text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    [OK]
                  </span>
                )}
                {isCurrent && (
                  <span className="text-cyan-400 font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                    RUN
                  </span>
                )}
                {isFailed && (
                  <span className="text-red-400 font-mono text-[10px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                    ERR
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
