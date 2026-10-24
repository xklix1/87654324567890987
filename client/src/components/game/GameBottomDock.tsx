import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { GameAudio } from '../../utils/audio';
import { Map, Trophy, Award, Send, MessageSquare, FastForward } from 'lucide-react';

export type GameOverlaySheet =
  | 'map'
  | 'leaderboard'
  | 'achievements'
  | 'transfer'
  | 'chat'
  | 'economy';

interface GameBottomDockProps {
  activeSheet: GameOverlaySheet;
  onSelectSheet: (sheet: GameOverlaySheet) => void;
  unclaimedAchievementsCount?: number;
}

export const GameBottomDock: React.FC<GameBottomDockProps> = ({
  activeSheet,
  onSelectSheet,
  unclaimedAchievementsCount = 0,
}) => {
  const { t } = useLanguage();

  const dockButtons = [
    {
      id: 'map' as GameOverlaySheet,
      label: t('nav_overview'),
      icon: Map,
      color: 'emerald',
    },
    {
      id: 'leaderboard' as GameOverlaySheet,
      label: t('nav_leaderboard'),
      icon: Trophy,
      color: 'amber',
    },
    {
      id: 'achievements' as GameOverlaySheet,
      label: t('nav_achievements'),
      icon: Award,
      color: 'amber',
      badge: unclaimedAchievementsCount > 0 ? unclaimedAchievementsCount : undefined,
    },
    {
      id: 'transfer' as GameOverlaySheet,
      label: t('dash_transfer_btn'),
      icon: Send,
      color: 'emerald',
    },
    {
      id: 'chat' as GameOverlaySheet,
      label: t('nav_chat'),
      icon: MessageSquare,
      color: 'cyan',
    },
    {
      id: 'economy' as GameOverlaySheet,
      label: 'الاقتصاد',
      icon: FastForward,
      color: 'cyan',
    },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[94%] sm:w-auto">
      <div className="flex items-center justify-around gap-1 sm:gap-2 px-3 py-2 rounded-2xl glass-panel bg-dark-950/95 border border-dark-700/80 shadow-2xl backdrop-blur-2xl">
        {dockButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive = activeSheet === btn.id;

          return (
            <button
              key={btn.id}
              onClick={() => {
                GameAudio.playTapSound();
                onSelectSheet(btn.id);
              }}
              className={`relative flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl transition-all select-none ${
                isActive
                  ? 'bg-emerald-500 text-dark-950 font-black shadow-emerald-glow scale-105'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-850/60 active:scale-95'
              }`}
            >
              {/* Notification Badge */}
              {btn.badge !== undefined && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-dark-950 font-black font-mono text-[9px] flex items-center justify-center animate-bounce shadow-gold-glow">
                  {btn.badge}
                </span>
              )}

              <Icon className="w-5 h-5 sm:w-5 sm:h-5" />
              <span className="text-[10px] font-bold font-cairo mt-0.5 truncate max-w-[60px] sm:max-w-none">
                {btn.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
