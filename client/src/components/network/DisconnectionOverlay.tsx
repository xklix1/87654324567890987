import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { NetworkResilienceService } from '../../services/network-resilience.service';
import { SocketService } from '../../services/socket.service';
import { useLanguage } from '../../context/LanguageContext';

export const DisconnectionOverlay: React.FC = () => {
  const { language } = useLanguage();
  const [isDisconnected, setIsDisconnected] = useState<boolean>(() =>
    NetworkResilienceService.getIsDisconnected()
  );
  const [retryAttempt, setRetryAttempt] = useState<number>(0);
  const [nextRetryMs, setNextRetryMs] = useState<number>(0);
  const [isManualReconnecting, setIsManualReconnecting] = useState<boolean>(false);

  useEffect(() => {
    const unsub = NetworkResilienceService.onDisconnectionChange((disc, attempt, nextMs) => {
      setIsDisconnected(disc);
      setRetryAttempt(attempt);
      setNextRetryMs(nextMs);
      if (!disc) {
        setIsManualReconnecting(false);
      }
    });

    return unsub;
  }, []);

  const handleManualRetry = () => {
    setIsManualReconnecting(true);
    SocketService.reconnect();
    // Also re-verify health
    fetch('/api/health')
      .then((res) => {
        if (res.ok) {
          NetworkResilienceService.setDisconnected(false);
        }
      })
      .catch(() => {
        // Will be picked up by resilience service
      })
      .finally(() => {
        setIsManualReconnecting(false);
      });
  };

  if (!isDisconnected) return null;

  const secondsRemaining = Math.max(1, Math.ceil(nextRetryMs / 1000));
  const isAr = language === 'ar';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md px-4 select-none animate-fadeIn"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="relative max-w-md w-full bg-dark-900/90 border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/10 overflow-hidden">
        {/* Radar Ping Animation */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative mx-auto w-20 h-20 mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 animate-ping opacity-75" />
          <div className="absolute inset-2 rounded-full border border-amber-500/20 animate-pulse" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/50 flex items-center justify-center shadow-lg">
            <WifiOff className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-wide">
          {isAr ? 'انقطع الاتصال بالخادم' : 'Connection Lost - Reconnecting...'}
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
          {isAr
            ? 'تم تجميد واجهة اللعبة تلقائياً لمنع أي تضارب أو فقدان في البيانات المالية. جارٍ إعادة الاتصال التلقائي بالخادم.'
            : 'Interactive controls are frozen to prevent corrupted transactions. The game engine is automatically restoring your connection.'}
        </p>

        {/* Retry Status Box */}
        <div className="bg-dark-950/70 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              {isAr ? 'محاولة إعادة الاتصال' : 'Retry Attempt'}
            </span>
            <span className="text-amber-400 font-mono font-semibold">#{retryAttempt}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isAr ? 'المحاولة القادمة خلال' : 'Next auto-retry in'}</span>
            <span className="text-cyan-400 font-mono font-bold text-sm">
              {isAr ? `${secondsRemaining} ثوانٍ` : `${secondsRemaining}s`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-cyan-400 h-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(10, ((15000 - nextRetryMs) / 15000) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Manual Reconnect Button */}
        <button
          onClick={handleManualRetry}
          disabled={isManualReconnecting}
          className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isManualReconnecting ? 'animate-spin' : ''}`} />
          {isManualReconnecting
            ? isAr
              ? 'جارٍ التحقق...'
              : 'Testing Connection...'
            : isAr
              ? 'إعادة المحاولة الآن'
              : 'Retry Connection Now'}
        </button>
      </div>
    </div>
  );
};
