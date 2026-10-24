import React, { useEffect, useState } from 'react';
import { Wifi, AlertCircle } from 'lucide-react';
import { NetworkResilienceService, LatencyState } from '../../services/network-resilience.service';
import { useLanguage } from '../../context/LanguageContext';

export const HighLatencyBadge: React.FC = () => {
  const { language } = useLanguage();
  const [latencyState, setLatencyState] = useState<LatencyState>(() =>
    NetworkResilienceService.getLatencyState()
  );
  const [isDisconnected, setIsDisconnected] = useState<boolean>(() =>
    NetworkResilienceService.getIsDisconnected()
  );

  useEffect(() => {
    const unsubLatency = NetworkResilienceService.onLatencyChange(setLatencyState);
    const unsubDisc = NetworkResilienceService.onDisconnectionChange((disc) => {
      setIsDisconnected(disc);
    });

    return () => {
      unsubLatency();
      unsubDisc();
    };
  }, []);

  // Only display badge when latency > 500ms and not completely disconnected
  if (!latencyState.isHighLatency || isDisconnected) {
    return null;
  }

  const isAr = language === 'ar';
  const isCritical = latencyState.latencyMs > 1000;

  return (
    <div className="fixed top-3 end-3 z-50 pointer-events-none animate-slideDown">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-lg transition-all duration-300 pointer-events-auto ${
          isCritical
            ? 'bg-red-950/80 border-red-500/40 text-red-300 shadow-red-500/20'
            : 'bg-amber-950/80 border-amber-500/40 text-amber-300 shadow-amber-500/20'
        }`}
        title={
          isAr
            ? `زمن الاستجابة مرتفع (${latencyState.latencyMs}ms). تم تمديد مهلة الطلبات تلقائياً للحفاظ على سلامة العمليات.`
            : `High latency detected (${latencyState.latencyMs}ms). Request timeouts automatically extended.`
        }
      >
        <div className="relative flex items-center justify-center">
          <span
            className={`w-2 h-2 rounded-full animate-ping absolute ${
              isCritical ? 'bg-red-400' : 'bg-amber-400'
            }`}
          />
          <span
            className={`w-2 h-2 rounded-full ${
              isCritical ? 'bg-red-500' : 'bg-amber-500'
            }`}
          />
        </div>

        <Wifi className="w-3.5 h-3.5" />

        <span className="text-xs font-mono font-semibold tracking-wider">
          {latencyState.latencyMs}ms
        </span>

        <span className="text-[11px] font-medium hidden sm:inline-block border-s border-current/20 ps-2">
          {isCritical
            ? isAr
              ? 'تأخر حرج'
              : 'Critical Latency'
            : isAr
              ? 'إشارة ضعيفة'
              : 'Weak Signal'}
        </span>

        <AlertCircle className="w-3 h-3 opacity-75" />
      </div>
    </div>
  );
};
