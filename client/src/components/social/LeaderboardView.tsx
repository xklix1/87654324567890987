import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LeaderboardEntry } from '../../types/social';
import { ComponentState } from '../../types/common';
import { SocialService } from '../../services/social.service';
import { SocketService } from '../../services/socket.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { Eye } from 'lucide-react';

interface LeaderboardViewProps {
  forcedState?: ComponentState;
  onSelectUser?: (userId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ forcedState, onSelectUser }) => {
  const { token, user } = useAuth();
  const { t } = useLanguage();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await SocialService.getLeaderboard(token, 1, 50);
      const entries = Array.isArray(data)
        ? data
        : Array.isArray((data as unknown as { leaderboard?: LeaderboardEntry[] })?.leaderboard)
        ? (data as unknown as { leaderboard: LeaderboardEntry[] }).leaderboard
        : [];
      setLeaderboard(entries);
    } catch {
      setError('تعذر تحميل قائمة ترتيب أثرياء اللعبة.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to live WebSocket leaderboard updates
    const unsubscribe = SocketService.onLeaderboard((liveEntries) => {
      if (Array.isArray(liveEntries)) {
        setLeaderboard(liveEntries);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchLeaderboard]);

  let activeState: ComponentState = 'success';
  if (forcedState) {
    activeState = forcedState;
  } else if (loading) {
    activeState = 'loading';
  } else if (error) {
    activeState = 'error';
  } else if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
    activeState = 'empty';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-100 font-cairo">
            {t('nav_leaderboard')}
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            قائمة أثرياء المدينة مرتبة حسب صافي الثروة الشاملة والسيولة وقيمة الأصول.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-400">
            بث الثروات المباشر
          </span>
        </div>
      </div>

      <ComponentStateWrapper
        state={activeState}
        errorMessage={error ?? undefined}
        onRetry={fetchLeaderboard}
      >
        <div className="glass-panel rounded-2xl border border-dark-800 overflow-hidden">
          <div className="divide-y divide-dark-800">
            {leaderboard.map((entry) => {
              const isCurrentUser = entry.user_id === user?.id;
              let rankBadge = (
                <span className="w-8 h-8 rounded-xl bg-dark-800 text-slate-400 border border-dark-700 flex items-center justify-center font-mono font-bold text-xs">
                  #{entry.rank}
                </span>
              );

              if (entry.rank === 1) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-mono font-bold text-xs shadow-gold-glow">
                    #1
                  </span>
                );
              } else if (entry.rank === 2) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-xl bg-slate-300/20 text-slate-200 border border-slate-300/40 flex items-center justify-center font-mono font-bold text-xs">
                    #2
                  </span>
                );
              } else if (entry.rank === 3) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-xl bg-amber-700/20 text-amber-500 border border-amber-700/40 flex items-center justify-center font-mono font-bold text-xs">
                    #3
                  </span>
                );
              }

              return (
                <div
                  key={entry.user_id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isCurrentUser ? 'bg-emerald-950/20 border-r-4 border-r-emerald-500' : 'hover:bg-dark-850/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {rankBadge}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100 font-cairo">
                          {entry.username}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-cairo font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            حسابك
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-cyan-400 border border-dark-700">
                          م{entry.level}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400 block mt-0.5">
                        {entry.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-cairo text-slate-400 block">
                        صافي الثروة
                      </span>
                      <span className="text-base font-black font-mono text-emerald-400">
                        ${entry.net_worth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="hidden md:block text-right">
                      <span className="text-[10px] uppercase font-cairo text-slate-400 block">
                        السيولة النقدية / الأصول
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        ${entry.liquid_cash.toLocaleString()} / ${entry.total_assets.toLocaleString()}
                      </span>
                    </div>

                    {onSelectUser && (
                      <button
                        onClick={() => onSelectUser(entry.user_id)}
                        className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 transition-colors"
                        title="عرض الملف الاستثماري"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ComponentStateWrapper>
    </div>
  );
};
