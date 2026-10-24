import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFloatingVfx } from '../../context/FloatingVfxContext';
import { GameAudio } from '../../utils/audio';
import { Wallet, Plus, Volume2, VolumeX, Globe, Sliders, Scale } from 'lucide-react';

interface GameTopHudProps {
  balance: number;
  hourlyYield: number;
  level: number;
  xp: number;
  title: string;
  onOpenFaucet: () => void;
  onOpenBudget?: () => void;
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
}

export const GameTopHud: React.FC<GameTopHudProps> = ({
  balance,
  hourlyYield,
  level,
  xp,
  title,
  onOpenFaucet,
  onOpenBudget,
  onToggleInspector,
  isInspectorOpen,
}) => {
  const { user } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { spawnTextFloat } = useFloatingVfx();
  const [isMuted, setIsMuted] = useState<boolean>(() => GameAudio.getIsMuted());

  const handleToggleMute = () => {
    const nextMuted = GameAudio.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      GameAudio.playCoinSound();
      spawnTextFloat('تم تفعيل الصوت', true);
    }
  };

  const currentLevelMinXp = Math.pow((level - 1) * 10, 2);
  const nextLevelXp = Math.pow(level * 10, 2);
  const xpProgress = Math.min(
    100,
    Math.max(0, ((xp - currentLevelMinXp) / (nextLevelXp - currentLevelMinXp || 1)) * 100)
  );

  return (
    <header className="sticky top-0 z-30 w-full glass-panel bg-dark-950/90 border-b border-dark-800 backdrop-blur-xl px-3 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Player Profile & Level Progress */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-dark-800 border-2 border-emerald-500/40 flex items-center justify-center font-black text-xs md:text-sm font-mono text-emerald-400 shadow-emerald-glow">
              {(user?.username ?? 'TY').substring(0, 2).toUpperCase()}
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-emerald-500 text-dark-950 font-black text-[9px] font-cairo border border-emerald-300">
              م{level}
            </span>
          </div>

          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-100 font-cairo">
                {user?.username ?? 'المستثمر'}
              </span>
              <span className="text-[10px] text-amber-400 font-bold font-cairo">
                {title}
              </span>
            </div>

            {/* XP Bar */}
            <div className="w-24 md:w-32 h-1.5 bg-dark-800 rounded-full overflow-hidden mt-1 border border-dark-700">
              <div
                style={{ width: `${xpProgress}%` }}
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Middle: Live Net Cashflow Ticker & General Budget Access */}
        <button
          onClick={onOpenBudget}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-dark-900/90 to-amber-950/30 border border-amber-500/30 hover:border-amber-400/60 text-xs font-cairo cursor-pointer transition shadow-sm hover:shadow-amber-500/10 active:scale-[0.98]"
          title="فتح الموازنة العامة وتحليل التدفقات الساعية والسياسات الاقتصادية"
        >
          <Scale className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-amber-300 font-bold hidden lg:inline">الموازنة العامة:</span>
          <span className={`font-bold font-mono ${hourlyYield >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {hourlyYield >= 0 ? '+' : ''}${hourlyYield.toFixed(2)}/ساعة
          </span>
        </button>

        {/* Right: Cash Counter & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Quick General Budget Access for Small Screens / Shortcuts */}
          <button
            onClick={onOpenBudget}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/20 hover:from-amber-500/20 hover:to-amber-600/30 text-amber-400 border border-amber-500/30 font-bold text-xs transition active:scale-95 cursor-pointer font-cairo"
            title="الموازنة العامة والسياسات المالية"
          >
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">الموازنة</span>
          </button>
          {/* Liquid Cash Vault Container */}
          <div className="flex items-center bg-dark-900 border border-dark-700 rounded-xl p-1 shadow-inner">
            <div className="flex items-center gap-1.5 px-2.5 py-1">
              <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm md:text-base font-black font-mono text-emerald-300 tracking-tight">
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Quick Capital Deposit Button */}
            <button
              onClick={() => {
                GameAudio.playCoinSound();
                onOpenFaucet();
              }}
              className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-dark-950 flex items-center justify-center font-black active:scale-90 transition-transform cursor-pointer shadow-emerald-glow"
              title="طلب دعم استثماري ($50,000)"
              aria-label="Add Funds"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Sound FX Toggle Button */}
          <button
            onClick={handleToggleMute}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-dark-900 text-slate-500 border-dark-800'
                : 'bg-dark-850 text-cyan-400 border-cyan-500/40 shadow-cyan-glow'
            }`}
            title={isMuted ? 'تشغيل المؤثرات الصوتية' : 'كتم الصوت'}
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Language Switch Button */}
          <button
            onClick={() => {
              GameAudio.playTapSound();
              toggleLanguage();
            }}
            className="h-9 px-2.5 rounded-xl bg-dark-900 hover:bg-dark-800 text-slate-300 border border-dark-800 flex items-center gap-1 text-xs font-cairo font-bold transition-all"
            aria-label="Toggle Language"
            title="تبديل اللغة"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{language === 'ar' ? 'العربية' : 'EN'}</span>
          </button>

          {/* Inspector Diagnostic Button */}
          {onToggleInspector && (
            <button
              onClick={() => {
                GameAudio.playTapSound();
                onToggleInspector();
              }}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                isInspectorOpen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-dark-900 text-slate-400 border-dark-800 hover:text-slate-200'
              }`}
              title="لوحة تشخيص ومراقبة الأداء"
              aria-label="Inspector"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
