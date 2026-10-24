import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { PlayerProfile } from '../../types/social';
import { ComponentState } from '../../types/common';
import { SocialService } from '../../services/social.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { Calendar, Building2, TrendingUp, Car, Plane, Factory, Sprout, Ship, Cpu } from 'lucide-react';

interface ProfileViewProps {
  forcedState?: ComponentState;
  targetUserId?: string;
  onClose?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ forcedState, targetUserId, onClose }) => {
  const { token, user } = useAuth();
  const { t } = useLanguage();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeUserId = targetUserId ?? user?.id ?? '';

  const fetchProfile = useCallback(async (): Promise<void> => {
    if (!token || !activeUserId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await SocialService.getPlayerProfile(token, activeUserId);
      setProfile(data);
    } catch {
      setError('تعذر تحميل الملف الاستثماري للمستخدم.');
    } finally {
      setLoading(false);
    }
  }, [token, activeUserId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  let activeState: ComponentState = 'success';
  if (forcedState) {
    activeState = forcedState;
  } else if (loading) {
    activeState = 'loading';
  } else if (error) {
    activeState = 'error';
  } else if (!profile) {
    activeState = 'empty';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-100 font-cairo">
            {t('nav_profile')}
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            مراجعة شاملة للمحفظة الاستثمارية وتوزيع الأصول عبر القطاعات.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-cairo"
          >
            {t('close')}
          </button>
        )}
      </div>

      <ComponentStateWrapper
        state={activeState}
        errorMessage={error ?? undefined}
        onRetry={fetchProfile}
      >
        {profile && (
          <div className="space-y-6">
            {/* Identity & Title Banner */}
            <div className="glass-panel rounded-3xl border border-dark-800 p-6 md:p-8 bg-gradient-to-br from-dark-900/90 via-dark-850/80 to-dark-900/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-2xl font-mono shadow-emerald-glow">
                    {profile.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-2xl font-black text-slate-100 font-cairo">
                        {profile.username}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold">
                        المستوى {profile.level}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-amber-400 font-cairo block mt-0.5">
                      {profile.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 font-cairo">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>تاريخ الانضمام: {new Date(profile.created_at).toLocaleDateString('ar-EG')}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700 text-amber-400 font-mono">
                    {profile.achievements_count} إنجازاً
                  </span>
                </div>
              </div>

              {/* Net Worth Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-dark-800/80">
                <div className="p-4 rounded-xl bg-dark-950/60 border border-dark-800">
                  <span className="text-[10px] uppercase font-cairo text-slate-400 block">صافي الثروة الشاملة</span>
                  <span className="text-xl font-black font-mono text-emerald-400">
                    ${profile.net_worth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-dark-950/60 border border-dark-800">
                  <span className="text-[10px] uppercase font-cairo text-slate-400 block">السيولة النقدية في الخزينة</span>
                  <span className="text-xl font-black font-mono text-slate-100">
                    ${profile.liquid_cash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-dark-950/60 border border-dark-800">
                  <span className="text-[10px] uppercase font-cairo text-slate-400 block">إجمالي قيمة الأصول المستثمرة</span>
                  <span className="text-xl font-black font-mono text-cyan-400">
                    ${profile.total_assets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Multi-Sector Asset Breakdown */}
            <div className="glass-panel rounded-2xl border border-dark-800 p-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-200 font-cairo">
                توزيع وتقييم الأصول حسب القطاعات
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-cairo text-slate-300">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>العقارات والأبراج</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-100 block">
                    ${profile.asset_breakdown.real_estate_value.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-cairo text-slate-300">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span>سوق الأسهم</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-100 block">
                    ${profile.asset_breakdown.stocks_value.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-cairo text-slate-300">
                    <Car className="w-4 h-4 text-amber-400" />
                    <span>معرض السيارات</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-100 block">
                    ${profile.asset_breakdown.dealership_value.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-cairo text-slate-300">
                    <Plane className="w-4 h-4 text-cyan-400" />
                    <span>أسطول الطيران</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-100 block">
                    ${profile.asset_breakdown.airport_value.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-cairo text-slate-300">
                    <Factory className="w-4 h-4 text-cyan-400" />
                    <span>المصانع والإنتاج</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-100 block">
                    ${profile.asset_breakdown.factory_value.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-cairo text-slate-300">
                    <Sprout className="w-4 h-4 text-emerald-400" />
                    <span>المزارع الزراعية</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-100 block">
                    ${profile.asset_breakdown.farm_value.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-cairo text-slate-300">
                    <Ship className="w-4 h-4 text-cyan-400" />
                    <span>الشحن البحري</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-100 block">
                    ${profile.asset_breakdown.logistics_value.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-cairo text-slate-300">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <span>تعدين الكريبتو</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-100 block">
                    ${profile.asset_breakdown.crypto_value.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </ComponentStateWrapper>
    </div>
  );
};
