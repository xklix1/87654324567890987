import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, Award } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'achievement';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      const newToast: ToastItem = { id, type, title, message };
      setToasts((prev) => [...prev.slice(-4), newToast]);

      setTimeout(() => {
        dismissToast(id);
      }, 5000);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2">
        {toasts.map((toast) => {
          let borderClass = 'border-emerald-500/30 bg-emerald-950/80 text-emerald-300';
          let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;

          if (toast.type === 'error') {
            borderClass = 'border-red-500/30 bg-red-950/80 text-red-300';
            icon = <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />;
          } else if (toast.type === 'info') {
            borderClass = 'border-cyan-500/30 bg-cyan-950/80 text-cyan-300';
            icon = <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
          } else if (toast.type === 'achievement') {
            borderClass = 'border-amber-500/40 bg-amber-950/90 text-amber-200 shadow-gold-glow';
            icon = <Award className="w-5 h-5 text-amber-400 shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${borderClass}`}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold font-cairo tracking-wide">{toast.title}</h5>
                <p className="text-xs text-slate-300 mt-0.5 font-cairo leading-relaxed">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
