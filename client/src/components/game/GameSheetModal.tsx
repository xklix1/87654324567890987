import React, { useEffect } from 'react';
import { GameAudio } from '../../utils/audio';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { X } from 'lucide-react';

interface GameSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxHeightClass?: string;
}

export const GameSheetModal: React.FC<GameSheetModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  maxHeightClass = 'max-h-[92vh]',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/80 backdrop-blur-md transition-opacity duration-200 p-0 sm:p-4">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div
        className={`relative z-10 w-full sm:max-w-5xl lg:max-w-6xl bg-dark-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col ${maxHeightClass} animate-in slide-in-from-bottom duration-300`}
      >
        {/* Top Handle bar on mobile */}
        <div className="w-12 h-1.5 bg-dark-700 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-dark-800 flex items-center justify-between shrink-0 bg-dark-950/60">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <h3 className="text-base font-bold text-slate-100 font-cairo">
              {title}
            </h3>
          </div>

          <button
            onClick={() => {
              GameAudio.playTapSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <ErrorBoundary fallbackTitle={title}>
            {children}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};
