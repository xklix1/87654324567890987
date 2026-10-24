import React, { useState } from 'react';
import { useInitializationPipeline } from '../../hooks/useInitializationPipeline';
import { PipelineStepTracker } from './PipelineStepTracker';
import { ForceUpdateModal } from './ForceUpdateModal';
import { useLanguage } from '../../context/LanguageContext';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { RefreshCw, Play, ShieldAlert, WifiOff, TrendingUp } from 'lucide-react';

import { SyncResponseData } from '../../types/sync';

interface SplashScreenProps {
  onInitializationComplete: (data?: SyncResponseData | null) => void;
  onRequireAuth: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onInitializationComplete,
  onRequireAuth,
}) => {
  const { t } = useLanguage();
  const [simulateError, setSimulateError] = useState<boolean>(false);
  const [simulateOutdated, setSimulateOutdated] = useState<boolean>(false);

  const {
    steps,
    currentStepIndex,
    progressPercent,
    pipelineState,
    errorDetail,
    forceUpdateRequired,
    versionData,
    needsAuth,
    syncData,
    retry,
  } = useInitializationPipeline({
    forceNetworkError: simulateError,
    forceOutdatedVersion: simulateOutdated,
  });

  React.useEffect(() => {
    if (pipelineState === 'success') {
      if (needsAuth) {
        onRequireAuth();
      } else {
        onInitializationComplete(syncData);
      }
    }
  }, [pipelineState, needsAuth, syncData, onInitializationComplete, onRequireAuth]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
      {/* Background Decorative Radial Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Initialization Card */}
      <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-dark-800 p-6 md:p-8 shadow-2xl bg-dark-900/90 backdrop-blur-xl">
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-dark-950 shadow-emerald-glow mb-4 border border-emerald-400/40">
            <TrendingUp className="w-8 h-8 text-dark-950" />
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight font-cairo">
            {t('app_title')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {t('splash_initializing')}
          </p>
        </div>

        {/* 4-State Pipeline Wrapper */}
        <ComponentStateWrapper
          state={pipelineState}
          errorMessage={errorDetail?.message}
          onRetry={retry}
        >
          <div className="space-y-6">
            {/* Dynamic Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">{t('splash_progress')}</span>
                <span className="text-emerald-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-dark-950 border border-dark-800 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 transition-all duration-300 ease-out shadow-emerald-glow"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Step-by-Step Telemetry Tracker */}
            <PipelineStepTracker steps={steps} currentStepIndex={currentStepIndex} />

            {/* Action Buttons if paused or complete */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-dark-800">
              <button
                onClick={retry}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-semibold border border-dark-700 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('retry')}</span>
              </button>

              <button
                onClick={() => {
                  if (needsAuth) {
                    onRequireAuth();
                  } else {
                    onInitializationComplete();
                  }
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-dark-950 text-xs font-bold shadow-emerald-glow transition-all active:scale-[0.98]"
              >
                <span>{t('dash_close_btn')}</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>
        </ComponentStateWrapper>

        {/* Developer Diagnostics Sandbox */}
        <div className="mt-8 pt-4 border-t border-dark-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-cairo text-slate-400 uppercase tracking-wider">
              أدوات الفحص والتشخيص
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                setSimulateError((prev) => !prev);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border text-[11px] font-cairo transition-all ${
                simulateError
                  ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-danger-glow'
                  : 'bg-dark-850 hover:bg-dark-800 text-slate-400 border-dark-700'
              }`}
            >
              <WifiOff className="w-3 h-3" />
              <span>{simulateError ? 'إعادة ضبط الشبكة' : t('splash_sim_error')}</span>
            </button>

            <button
              onClick={() => {
                setSimulateOutdated((prev) => !prev);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border text-[11px] font-cairo transition-all ${
                simulateOutdated
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-gold-glow'
                  : 'bg-dark-850 hover:bg-dark-800 text-slate-400 border-dark-700'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>{simulateOutdated ? 'إعادة ضبط الإصدار' : t('splash_sim_outdated')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Blocking Force Update Gateway Modal */}
      {forceUpdateRequired && (
        <ForceUpdateModal
          minimumSupportedVersion={versionData?.minimum_supported_version ?? '1.0.0'}
          onRetry={retry}
          onResetSimulation={() => setSimulateOutdated(false)}
        />
      )}
    </div>
  );
};
