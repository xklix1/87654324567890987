import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { UserAchievementItem, ProgressionSummary } from '../../types/progression';
import { ComponentState } from '../../types/common';
import { ProgressionService } from '../../services/progression.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { Award, CheckCircle2, Lock, Sparkles } from 'lucide-react';

interface AchievementsViewProps {
  forcedState?: ComponentState;
  onBalanceUpdate?: (newBalance: number) => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({ forcedState, onBalanceUpdate }) => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [achievements, setAchievements] = useState<UserAchievementItem[]>([]);
  const [summary, setSummary] = useState<ProgressionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [achData, sumData] = await Promise.all([
        ProgressionService.getAchievements(token),
        ProgressionService.getProgressionSummary(token),
      ]);
      setAchievements(achData);
      setSummary(sumData);
    } catch {
      setError('تعذر تحميل بيانات الإنجازات والمحطات الاستثمارية.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClaim = async (code: string): Promise<void> => {
    if (!token) return;
    setClaimingCode(code);
    try {
      const res = await ProgressionService.claimAchievement(token, code);
      showToast(
        'achievement',
        'تم استلام مكافأة الإنجاز',
        `تمت إضافة $${res.cash_reward.toLocaleString()} نقداً و+${res.xp_reward} نقطة هيبة! أنت الآن في المستوى ${res.new_level}.`
      );
      if (onBalanceUpdate) onBalanceUpdate(res.new_balance);
      await fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشلت عملية استلام المكافأة.';
      showToast('error', 'فشل الاستلام', msg);
    } finally {
      setClaimingCode(null);
    }
  };

  let activeState: ComponentState = 'success';
  if (forcedState) {
    activeState = forcedState;
  } else if (loading) {
    activeState = 'loading';
  } else if (error) {
    activeState = 'error';
  } else if (achievements.length === 0) {
    activeState = 'empty';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-100 font-cairo">
            {t('nav_achievements')}
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            محطات وإنجازات استثمارية تمنحك مكافآت نقدية فورية ونقاط هيبة لترقية مستواك.
          </p>
        </div>

        {summary && (
          <div className="flex items-center gap-3 bg-dark-900 border border-dark-800 px-4 py-2 rounded-xl">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-cairo block">الإنجازات المكتملة</span>
              <span className="text-sm font-bold font-mono text-amber-400">
                {summary.unlocked_achievements_count} / {summary.total_achievements_count} مكتمل
              </span>
            </div>
          </div>
        )}
      </div>

      <ComponentStateWrapper
        state={activeState}
        errorMessage={error ?? undefined}
        onRetry={fetchData}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((item) => {
            const isReadyToClaim = item.unlocked && !item.claimed;
            return (
              <div
                key={item.code}
                className={`glass-panel rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  item.claimed
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : isReadyToClaim
                    ? 'border-amber-500/50 bg-amber-950/20 shadow-gold-glow animate-pulse'
                    : 'border-dark-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-400 border border-dark-700">
                      {item.category}
                    </span>

                    {item.claimed ? (
                      <span className="flex items-center gap-1 text-[10px] font-cairo font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم الاستلام</span>
                      </span>
                    ) : item.unlocked ? (
                      <span className="flex items-center gap-1 text-[10px] font-cairo font-bold text-amber-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>جاهز للاستلام</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-cairo text-slate-500">
                        <Lock className="w-3 h-3" />
                        <span>مقفل</span>
                      </span>
                    )}
                  </div>

                  <h5 className="text-sm font-bold text-slate-100 font-cairo">
                    {item.title}
                  </h5>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-dark-800/80 flex items-center justify-between">
                  <div className="text-xs font-mono">
                    <span className="text-emerald-400 font-bold">+${item.cash_reward.toLocaleString()}</span>
                    <span className="text-cyan-400 ml-2">+{item.xp_reward} XP</span>
                  </div>

                  {isReadyToClaim ? (
                    <button
                      onClick={() => handleClaim(item.code)}
                      disabled={claimingCode === item.code}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50"
                    >
                      {claimingCode === item.code ? 'جارٍ الاستلام...' : t('action_claim_reward')}
                    </button>
                  ) : item.claimed ? (
                    <span className="text-[11px] font-cairo text-slate-500">مكتمل</span>
                  ) : (
                    <span className="text-[11px] font-cairo text-slate-500">قيد التقدم</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ComponentStateWrapper>
    </div>
  );
};
