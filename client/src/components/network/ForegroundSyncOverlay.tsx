import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { AppLifecycleService } from '../../services/app-lifecycle.service';
import { useLanguage } from '../../context/LanguageContext';

export const ForegroundSyncOverlay: React.FC = () => {
  const { language } = useLanguage();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showSyncedBriefly, setShowSyncedBriefly] = useState<boolean>(false);

  useEffect(() => {
    const unsub = AppLifecycleService.onSyncStateChange((syncing) => {
      setIsSyncing(syncing);
      if (!syncing) {
        setShowSyncedBriefly(true);
        const timer = setTimeout(() => {
          setShowSyncedBriefly(false);
        }, 1500);
        return () => clearTimeout(timer);
      }
    });

    return unsub;
  }, []);

  if (!isSyncing && !showSyncedBriefly) {
    return null;
  }

  const isAr = language === 'ar';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9990] animate-bounce-subtle pointer-events-none">
      <div className="px-4 py-2 rounded-full bg-dark-900/90 border border-cyan-500/40 text-cyan-300 shadow-xl shadow-cyan-500/10 backdrop-blur-md flex items-center gap-2.5 text-xs font-medium">
        {isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>{isAr ? 'مزامنة أحدث بيانات الخادم...' : 'Syncing latest state...'}</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300">{isAr ? 'تم تحديث البيانات بالكامل' : 'State Synchronized'}</span>
          </>
        )}
      </div>
    </div>
  );
};
