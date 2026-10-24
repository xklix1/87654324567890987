import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PropertyCatalogItem, UserProperty } from '../../types/sectors';
import { ComponentState } from '../../types/common';
import { SectorsService } from '../../services/sectors.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { SectorCockpitLayout, SectorMetric, SectorTabId } from './SectorCockpitLayout';
import { RealEstateInteriorConsole } from './interior/RealEstateInteriorConsole';
import { GameAudio } from '../../utils/audio';
import {
  Building2,
  Home,
  ArrowUpCircle,
  Clock,
  DollarSign,
  Sparkles,
  Key,
} from 'lucide-react';

interface RealEstateViewProps {
  forcedState?: ComponentState;
  onBalanceUpdate?: (newBalance: number) => void;
}

export const RealEstateView: React.FC<RealEstateViewProps> = ({ forcedState, onBalanceUpdate }) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [catalog, setCatalog] = useState<PropertyCatalogItem[]>([]);
  const [userProperties, setUserProperties] = useState<UserProperty[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectorTabId>('overview');

  // Tactical leases & staff state
  const [signedLeases, setSignedLeases] = useState<Record<string, boolean>>({
    lease_corp: true,
    lease_tech: false,
    lease_vip: false,
  });

  const [hiredManagers, setHiredManagers] = useState<Record<string, boolean>>({
    mgr_concierge: true,
    mgr_architect: false,
    mgr_facility: false,
  });

  const [researchedTech, setResearchedTech] = useState<Record<string, boolean>>({
    tech_iot: true,
    tech_helipad: false,
    tech_leed: false,
  });

  const fetchData = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [catData, propData] = await Promise.all([
        SectorsService.listPropertiesCatalog(),
        SectorsService.getUserProperties(token),
      ]);
      setCatalog(catData);
      setUserProperties(propData);
    } catch {
      setError('Failed to fetch real estate portfolio and catalog.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBuy = async (catalogId: string): Promise<void> => {
    if (!token) return;
    GameAudio.playCashSound();
    setActionLoadingId(catalogId);
    try {
      const res = await SectorsService.buyProperty(token, catalogId);
      showToast('success', 'تم شراء العقار بنجاح', `تم تملك ${res.property.name} وإضافته لمحفظتك العقارية.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
      await fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشلت عملية شراء العقار.';
      showToast('error', 'تعذر إتمام الشراء', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpgrade = async (propertyId: string): Promise<void> => {
    if (!token) return;
    GameAudio.playLevelUpSound();
    setActionLoadingId(propertyId);
    try {
      const res = await SectorsService.upgradeProperty(token, propertyId);
      showToast('success', 'تمت ترقية العقار', `تمت الترقية إلى الفئة ${res.property.upgrade_tier}. ارتفع العائد الساعي إلى $${res.property.hourly_income.toFixed(2)}/ساعة.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
      await fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'تعذر ترقية العقار.';
      showToast('error', 'فشلت الترقية', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleLease = (leaseId: string) => {
    GameAudio.playTapSound();
    setSignedLeases((prev) => ({ ...prev, [leaseId]: !prev[leaseId] }));
    showToast('success', 'تم توثيق عقد الإيجار', 'تم توقيع العقد الاستثماري مع المستأجر بنجاح.');
  };

  const handleToggleManager = (mgrId: string) => {
    GameAudio.playTapSound();
    setHiredManagers((prev) => ({ ...prev, [mgrId]: !prev[mgrId] }));
    showToast('success', 'تم تعيين إدارة العقار', 'تم تكليف المشرف الإداري بنجاح.');
  };

  const handleResearchTech = (techId: string) => {
    GameAudio.playTapSound();
    setResearchedTech((prev) => ({ ...prev, [techId]: true }));
    showToast('success', 'تم تفعيل التقنية المعمارية', 'الأنظمة الذكية للأبراج تعمل بكفاءة.');
  };

  const totalHourlyRental = (userProperties ?? []).reduce((acc, p) => acc + (p.hourly_income ?? 0), 0);
  const totalValuation = (userProperties ?? []).reduce((acc, p) => acc + (p.upgrade_cost ?? 25000) * (p.upgrade_tier ?? 1) * 2, 0);

  const metrics: SectorMetric[] = [
    {
      label: 'القيمة التقديرية للمحفظة',
      value: `$${totalValuation.toLocaleString()}`,
      change: '+15.2%',
      isPositive: true,
      subtext: 'إجمالي أصول الأبراج والعقارات',
      icon: <DollarSign className="w-4 h-4 text-cyan-400" />,
    },
    {
      label: 'عائد الإيجارات بالساعة',
      value: `+$${totalHourlyRental.toFixed(2)}/ساعة`,
      change: 'تدفق نشط',
      isPositive: true,
      subtext: 'دخل سلبي مستمر للخزينة',
      icon: <Clock className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'نسبة الإشغال والتأجير',
      value: '99.4%',
      change: 'إشغال كامل',
      isPositive: true,
      subtext: 'مستأجرون دائمون بعقود موثقة',
      icon: <Key className="w-4 h-4 text-amber-400" />,
    },
    {
      label: 'العقارات المملوكة',
      value: `${userProperties.length} أبراج`,
      change: `من أصل ${catalog.length}`,
      isPositive: true,
      subtext: 'أبراج وفلل استثمارية كبرى',
      icon: <Building2 className="w-4 h-4 text-cyan-300" />,
    },
  ];

  const activeState: ComponentState = forcedState ?? (loading ? 'loading' : error ? 'error' : catalog.length === 0 && userProperties.length === 0 ? 'empty' : 'success');

  return (
    <ComponentStateWrapper state={activeState} errorMessage={error ?? undefined} onRetry={fetchData}>
      <SectorCockpitLayout
        sectorId="real_estate"
        themeColor="#06b6d4"
        titleAr="أبراج الاستثمار والتطوير العقاري"
        titleEn="Luxury Real Estate Skyline"
        statusBadge="محفظة الأبراج الاستثمارية نشطة"
        level={3}
        tier={2}
        metrics={metrics}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        interiorConsole={<RealEstateInteriorConsole onBalanceUpdate={onBalanceUpdate} />}
        // Tab 1: Owned & Catalog
        renderOverview={() => (
          <div className="space-y-6">
            {/* User Owned Properties Section */}
            {userProperties.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>عقاراتك وأبراجك الاستثمارية المملوكة ({userProperties.length})</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userProperties.map((prop) => {
                    const upgradeTier = prop.upgrade_tier ?? (prop as unknown as { upgrade_level?: number }).upgrade_level ?? 1;
                    const hourlyIncome = Number(prop.hourly_income ?? (prop as unknown as { current_hourly_income?: number }).current_hourly_income ?? 0);
                    const propName = prop.name || (prop as unknown as { property_name?: string }).property_name || 'برج استثماري';
                    const upgradeCost = prop.upgrade_cost ?? 15000;
                    return (
                      <div
                        key={prop.id}
                        className="glass-panel rounded-2xl p-5 border border-cyan-500/30 bg-dark-900/70 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                                Tier {upgradeTier}
                              </span>
                              <span className="text-xs font-mono text-emerald-400 font-bold">
                                +${hourlyIncome.toFixed(2)}/ساعة
                              </span>
                            </div>
                            <h5 className="text-base font-bold text-slate-100 font-cairo mt-1">
                              {propName}
                            </h5>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-mono text-slate-400 flex justify-between items-center">
                          <span>تكلفة الترقية للدرجة التالية:</span>
                          <span className="font-bold text-slate-200">
                            ${upgradeCost.toLocaleString()}
                          </span>
                        </div>

                        <button
                          onClick={() => handleUpgrade(prop.id)}
                          disabled={actionLoadingId === prop.id}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                          <span>
                            {actionLoadingId === prop.id
                              ? 'جارٍ تشطيب وترقية المبنى...'
                              : `ترقية البرج وزيادة الإيجار ($${upgradeCost.toLocaleString()})`}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Catalog Store */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                <Home className="w-4 h-4 text-cyan-400" />
                <span>سوق الاستحواذ العقاري والأبراج المتاحة للبيع</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catalog.map((item) => {
                  const itemPrice = item.base_price ?? (item as unknown as { purchase_price?: number }).purchase_price ?? 0;
                  const itemType = item.type || (item as unknown as { category?: string }).category || 'COMMERCIAL';
                  const baseIncome = item.base_hourly_income ?? 0;
                  return (
                    <div
                      key={item.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-cyan-500/40 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                            {itemType}
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            +${baseIncome}/ساعة
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-100 font-cairo">{item.name}</h5>
                        <p className="text-xs text-slate-400 font-mono mt-1 leading-relaxed">
                          عقار استثماري فاخر يدر عائداً تدفقياً مستمراً.
                        </p>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => handleBuy(item.id)}
                          disabled={actionLoadingId === item.id}
                          className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                        >
                          {actionLoadingId === item.id
                            ? 'جارٍ إتمام الصك والملكية...'
                            : `شراء واستحواذ ($${itemPrice.toLocaleString()})`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        // Tab 2: Commercial Leases
        renderTactical={() => (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                عقود التأجير التجاري والمقرات الرئيسية (Commercial Leases)
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                تأجير طوابق الأبراج للشركات العالمية والمصارف الاستثمارية بعقود طويلة الأجل.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'lease_corp',
                  tenant: 'Goldman & Morgan Financial HQ',
                  type: 'تأجير 10 طوابق تجارية',
                  bonusRent: '+$450/ساعة إضافية',
                  deposit: '$150,000 تأمين',
                },
                {
                  id: 'lease_tech',
                  tenant: 'Silicon Cloud AI Campus',
                  type: 'حرم تقني متكامل للأبحاث',
                  bonusRent: '+$820/ساعة إضافية',
                  deposit: '$300,000 تأمين',
                },
                {
                  id: 'lease_vip',
                  tenant: 'Luxury Penthouse Royal Suites',
                  type: 'أجنحة بنتهاوس ملوكية VIP',
                  bonusRent: '+$1,400/ساعة إضافية',
                  deposit: '$500,000 تأمين',
                },
              ].map((lease) => {
                const isSigned = signedLeases[lease.id];
                return (
                  <div
                    key={lease.id}
                    className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">{lease.bonusRent}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                          {lease.deposit}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-slate-100 font-cairo">{lease.tenant}</h5>
                      <p className="text-xs font-mono text-slate-400 mt-2">{lease.type}</p>
                    </div>

                    <button
                      onClick={() => handleToggleLease(lease.id)}
                      className={`w-full py-2 rounded-xl text-xs font-bold font-cairo transition-all ${
                        isSigned
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-dark-950'
                      }`}
                    >
                      {isSigned ? 'عقد موثق ونشط' : 'توقيع وتوثيق عقد الإيجار'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        // Tab 3: Property Managers
        renderStaff={() => (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                طاقم إدارة الأبراج والكونسيرج (Property Managers)
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                توظيف مسؤولي الضيافة والمهندسين المعماريين لرفع جاذبية العقارات وتخفيض تكلفة الترقيات.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'mgr_concierge',
                  name: 'جان كلود دوفال',
                  role: 'مدير الضيافة والكونسيرج الفاخر (VIP Concierge)',
                  effect: 'يرفع رضا المستأجرين وزيادة العائد بنسبة +15%',
                  cost: 20000,
                },
                {
                  id: 'mgr_architect',
                  name: 'م. سمر الراوي',
                  role: 'كبيرة المهندسين المعماريين',
                  effect: 'تخفض تكاليف ترقيات وتشطيب الأبراج بنسبة 25%',
                  cost: 35000,
                },
                {
                  id: 'mgr_facility',
                  name: 'كريم البصري',
                  role: 'مدير الصيانة الذكية للمرافق',
                  effect: 'إلغاء أوقات التوقف وضمان تدفق الإيجارات بلا انقطاع',
                  cost: 45000,
                },
              ].map((mgr) => {
                const isHired = hiredManagers[mgr.id];
                return (
                  <div
                    key={mgr.id}
                    className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-base font-cairo">
                        {mgr.name.charAt(0)}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-100 font-cairo">{mgr.name}</h5>
                        <span className="text-[11px] font-mono text-cyan-300 block">{mgr.role}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-cairo text-slate-300">
                      {mgr.effect}
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">
                        {isHired ? 'نشط في الأبراج' : `$${mgr.cost.toLocaleString()}`}
                      </span>
                      <button
                        onClick={() => handleToggleManager(mgr.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                          isHired
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-dark-950'
                        }`}
                      >
                        {isHired ? 'إنهاء التعاقد' : 'توظيف وتكليف'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        // Tab 4: Smart Buildings R&D
        renderRd={() => (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                تكنولوجيا الأبراج الخضراء والذكية (Smart Skyline R&D)
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                ترقيات إنترنت الأشياء والواجهات البيئية لرفع التقييم السوقي لأبراجك.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'tech_iot',
                  title: 'نظام إدارة الأبراج الذكي (IoT Smart BMS)',
                  desc: 'تحكم ذكي في التكييف والمصاعد يوفر 20% من فواتير المرافق.',
                  cost: 30000,
                },
                {
                  id: 'tech_helipad',
                  title: 'مهابط مروحيات وسيارات طائرة على الأسطح (Skyports)',
                  desc: 'جذب كبار الشخصيات وزيادة إيجار طوابق البنتهاوس بنسبة 30%.',
                  cost: 65000,
                },
                {
                  id: 'tech_leed',
                  title: 'شهادة الاستدامة البلاتينية (LEED Platinum)',
                  desc: 'إعفاءات ضريبية شاملة ورفع القيمة التقييمية لجميع الأبراج.',
                  cost: 120000,
                },
              ].map((tech) => {
                const isResearched = researchedTech[tech.id];
                return (
                  <div
                    key={tech.id}
                    className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mb-3">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h5 className="text-sm font-bold text-slate-100 font-cairo">{tech.title}</h5>
                      <p className="text-xs text-slate-400 font-mono mt-2 leading-relaxed">{tech.desc}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {isResearched ? 'تقنية معتمدة' : `$${tech.cost.toLocaleString()}`}
                      </span>
                      <button
                        onClick={() => handleResearchTech(tech.id)}
                        disabled={isResearched}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                          isResearched
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 cursor-default'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-dark-950'
                        }`}
                      >
                        {isResearched ? 'مفعّل بنجاح' : 'تطبيق الترقية'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      />
    </ComponentStateWrapper>
  );
};
