import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ImportExportOverview, ActiveVoyage, TradeContract } from '../../types/sectors';
import { ComponentState } from '../../types/common';
import { SectorsService } from '../../services/sectors.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { SectorCockpitLayout, SectorMetric, SectorTabId } from './SectorCockpitLayout';
import { LogisticsInteriorConsole } from './interior/LogisticsInteriorConsole';
import { GameAudio } from '../../utils/audio';
import {
  Anchor,
  Ship,
  DollarSign,
  TrendingUp,
  Globe,
  Boxes,
  Compass,
} from 'lucide-react';

interface LogisticsViewProps {
  forcedState?: ComponentState;
  onBalanceUpdate?: (newBalance: number) => void;
}

export const LogisticsView: React.FC<LogisticsViewProps> = ({ forcedState, onBalanceUpdate }) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [overview, setOverview] = useState<ImportExportOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectorTabId>('overview');

  // Tactical freight alliances & staff state
  const [signedAlliances, setSignedAlliances] = useState<Record<string, boolean>>({
    alliance_2m: true,
    alliance_ocean: false,
  });

  const [hiredOfficers, setHiredOfficers] = useState<Record<string, boolean>>({
    officer_harbor: true,
    officer_customs: false,
    officer_crane: false,
  });

  const [researchedTech, setResearchedTech] = useState<Record<string, boolean>>({
    tech_armg: true,
    tech_vts: false,
    tech_dredging: false,
  });

  const fetchData = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await SectorsService.getImportExportOverview(token);
      setOverview(data);
    } catch {
      setError('Failed to fetch maritime logistics operations.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDispatch = async (contractId: string): Promise<void> => {
    if (!token) return;
    GameAudio.playTapSound();
    setActionId(contractId);
    try {
      const res = await SectorsService.dispatchTradeVoyage(token, contractId);
      setOverview(res.overview);
      showToast('success', 'تم إبحار سفينة الشحن بنجاح', 'السفينة في طريقها الآن بحمولة البضائع الدولية.');
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشل إطلاق رحلة الشحن.';
      showToast('error', 'تعذر إطلاق الرحلة', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleCollect = async (voyageId: string): Promise<void> => {
    if (!token) return;
    GameAudio.playCashSound();
    setActionId(voyageId);
    try {
      const res = await SectorsService.collectTradeVoyage(token, voyageId);
      setOverview(res.overview);
      showToast('success', 'وصلت شحنة البضائع بسلام', `تم تحصيل $${res.revenue.toLocaleString()} من عوائد الشحن.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشل تحصيل العائد.';
      showToast('error', 'فشل التحصيل', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleUpgrade = async (): Promise<void> => {
    if (!token) return;
    GameAudio.playLevelUpSound();
    setActionId('upgrade');
    try {
      const res = await SectorsService.upgradeImportExport(token);
      setOverview(res.overview);
      showToast('success', 'تمت توسعة أسطول ومستودعات الميناء', `ترقية أرصفة الميناء إلى الفئة ${res.overview.warehouse_tier}.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'تعذر توسعة الميناء.';
      showToast('error', 'فشلت الترقية', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleToggleAlliance = (allId: string) => {
    GameAudio.playCashSound();
    setSignedAlliances((prev) => ({ ...prev, [allId]: !prev[allId] }));
    showToast('success', 'تم توثيق التحالف الملاحي', 'المسار البحري الدولي نشط.');
  };

  const handleToggleOfficer = (offId: string) => {
    GameAudio.playTapSound();
    setHiredOfficers((prev) => ({ ...prev, [offId]: !prev[offId] }));
    showToast('success', 'تم تعيين ضابط الميناء', 'تم تكليف ضابط العمليات بنجاح.');
  };

  const handleResearchTech = (techId: string) => {
    GameAudio.playTapSound();
    setResearchedTech((prev) => ({ ...prev, [techId]: true }));
    showToast('success', 'تم تفعيل الترقية التقنية', 'البنية التحتية للمحطة تعمل بكفاءة.');
  };

  const activeVoyages = overview?.active_voyages ?? [];

  const metrics: SectorMetric[] = [
    {
      label: 'شحنات الحاويات النشطة',
      value: `${activeVoyages.length} سفن شحن`,
      change: 'في عرض البحر',
      isPositive: true,
      subtext: 'سفن شحن عملاقة تجوب المحيطات',
      icon: <Ship className="w-4 h-4 text-sky-400" />,
    },
    {
      label: 'الطاقة الاستيعابية للرصيف',
      value: `الفئة ${overview?.warehouse_tier ?? 1}`,
      change: 'رصيف مياه عميقة',
      isPositive: true,
      subtext: 'محطة حاويات دولية مجهزة',
      icon: <Boxes className="w-4 h-4 text-cyan-400" />,
    },
    {
      label: 'معدل مناولة الحاويات',
      value: '35 حاوية/ساعة',
      change: '+14.2%',
      isPositive: true,
      subtext: 'رافعات جسرية آلية سريعة',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'سلامة الخطوط الملاحية',
      value: '100% مؤمنة',
      change: 'أمان ملاحي كامل',
      isPositive: true,
      subtext: 'حراسة وملاحة بالأقمار الصناعية',
      icon: <Anchor className="w-4 h-4 text-amber-400" />,
    },
  ];

  const activeState: ComponentState = forcedState ?? (loading ? 'loading' : error ? 'error' : !overview ? 'empty' : 'success');

  return (
    <ComponentStateWrapper state={activeState} errorMessage={error ?? undefined} onRetry={fetchData}>
      {overview && (
        <SectorCockpitLayout
          sectorId="logistics"
          themeColor="#0284c7"
          titleAr="ميناء الحاويات البحري والشحن الدولي"
          titleEn="Maritime Deepwater Container Port"
          statusBadge="الأرصفة وأحواض الشحن نشطة"
          level={overview.warehouse_tier ?? 1}
          tier={overview.warehouse_tier ?? 1}
          metrics={metrics}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          interiorConsole={<LogisticsInteriorConsole onBalanceUpdate={onBalanceUpdate} />}
          // Tab 1: Berths & Voyages
          renderOverview={() => (
            <div className="space-y-6">
              {/* Port Master Header */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                    <Ship className="w-4 h-4 text-sky-400" />
                    <span>سفن الشحن والرحلات البحرية الجارية ({activeVoyages.length})</span>
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    تتبع خطوط الملاحة وسفن الحاويات المتجهة للموانئ العالمية.
                  </p>
                </div>

                <button
                  onClick={handleUpgrade}
                  disabled={actionId === 'upgrade'}
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50 shadow-lg shadow-sky-500/20"
                >
                  {actionId === 'upgrade'
                    ? 'جارٍ توسعة الأرصفة...'
                    : `توسعة أرصفة الميناء ($${(overview.next_logistics_upgrade_cost ?? 60000).toLocaleString()})`}
                </button>
              </div>

              {/* Active Voyages */}
              {activeVoyages.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center border border-slate-800 bg-dark-900/50">
                  <p className="text-xs font-mono text-slate-400">
                    لا توجد سفن مبحرة حالياً. قم بتوقيع وإطلاق رحلات شحن من الكتالوج أدناه.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeVoyages.map((voyage: ActiveVoyage) => (
                    <div
                      key={voyage.id}
                      className="glass-panel rounded-2xl p-5 border border-sky-500/30 bg-dark-900/70 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                            {voyage.is_completed ? 'وصلت الميناء' : 'في عرض البحر'}
                          </span>
                          <h5 className="text-base font-bold text-slate-100 font-cairo mt-1">
                            {voyage.title}
                          </h5>
                        </div>
                        <span className="text-sm font-black font-mono text-emerald-400">
                          ${(voyage.gross_revenue ?? 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-mono text-slate-400 flex justify-between">
                        <span>خط الملاحة:</span>
                        <span className="text-slate-200">{voyage.title}</span>
                      </div>

                      {voyage.is_completed ? (
                        <button
                          onClick={() => handleCollect(voyage.id)}
                          disabled={actionId === voyage.id}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>
                            {actionId === voyage.id ? 'جارٍ التفريغ...' : `تفريغ الحاويات واستلام $${(voyage.gross_revenue ?? 0).toLocaleString()}`}
                          </span>
                        </button>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-dark-950/40 border border-slate-800 text-center text-xs font-mono text-sky-300 animate-pulse">
                          السفينة تبحر في المياه الدولية...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Available Contracts */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <span>عقود الشحن والتصدير البحري المتاحة للتعاقد</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(overview.available_contracts ?? []).map((contract: TradeContract) => {
                    const grossRev = Number(contract.gross_revenue ?? (contract as unknown as { contract_value?: number }).contract_value ?? 0);
                    const capital = Number(contract.required_capital ?? (contract as unknown as { prep_cost?: number }).prep_cost ?? 0);
                    const cargoType = contract.cargo_type || 'Cargo';
                    const title = contract.title || 'Maritime Route';

                    return (
                      <div
                        key={contract.id}
                        className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-sky-500/40 bg-dark-900/60 flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                              {cargoType}
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              +${grossRev.toLocaleString()}
                            </span>
                          </div>
                          <h5 className="text-sm font-bold text-slate-100 font-cairo">{title}</h5>
                          <div className="mt-3 p-2.5 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-mono text-slate-400 flex justify-between">
                            <span>تكلفة التجهيز:</span>
                            <span className="text-slate-200">${capital.toLocaleString()}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDispatch(contract.id)}
                          disabled={actionId === contract.id}
                          className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50"
                        >
                          {actionId === contract.id ? 'جارٍ الإبحار...' : `إطلاق السفينة ($${capital.toLocaleString()})`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          // Tab 2: Shipping Alliances
          renderTactical={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  تحالفات الخطوط الملاحية العالمية (Global Shipping Alliances)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  شراكات مع عمالقة النقل البحري (Maersk, MSC, COSCO) لمضاعفة حمولات الحاويات.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: 'alliance_2m',
                    name: '2M Alliance (Maersk & Mediterranean Shipping)',
                    perk: '+30% أرباح على الشحنات الأوروبية',
                    deposit: 'حصة سنوية مضمونة',
                  },
                  {
                    id: 'alliance_ocean',
                    name: 'Ocean Alliance (Asia-Pacific Mega Carriers)',
                    perk: '+45% أرباح على خطوط موانئ سنغافورة وشنغهاي',
                    deposit: 'أولوية رسو على الأرصفة',
                  },
                ].map((alliance) => {
                  const isSigned = signedAlliances[alliance.id];
                  return (
                    <div
                      key={alliance.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-emerald-400">{alliance.perk}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                            {alliance.deposit}
                          </span>
                        </div>
                        <h5 className="text-base font-bold text-slate-100 font-cairo">{alliance.name}</h5>
                      </div>

                      <button
                        onClick={() => handleToggleAlliance(alliance.id)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                          isSigned
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-sky-500 hover:bg-sky-400 text-dark-950'
                        }`}
                      >
                        {isSigned ? 'عقد التحالف سارٍ' : 'توقيع ميثاق التحالف الملاحي'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          // Tab 3: Harbor Officers
          renderStaff={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  ضباط إدارة الميناء والجمارك البحرية (Harbor Officers)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  توظيف كبار قباطنة الموانئ وضباط التخليص الجمركي لسرعة تفريغ الحاويات.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'officer_harbor',
                    name: 'قبطان بحري سليمان البحار',
                    role: 'كبير مسؤولي رسو السفن (Harbor Master)',
                    effect: 'تسريع دوران وتفريغ السفن بنسبة 30%',
                    cost: 20000,
                  },
                  {
                    id: 'officer_customs',
                    name: 'نهى السعيد',
                    role: 'مديرة التخليص الجمركي الفوري',
                    effect: 'إلغاء رسوم التفتيش الجمركي وضمان مرور البضائع فوراً',
                    cost: 35000,
                  },
                  {
                    id: 'officer_crane',
                    name: 'م. يوسف الغامدي',
                    role: 'رئيس مشغلي الرافعات الجسرية العملاقة',
                    effect: 'رفع حمولة السفن وزيادة أرباح كل رحلة بنسبة +20%',
                    cost: 45000,
                  },
                ].map((officer) => {
                  const isHired = hiredOfficers[officer.id];
                  return (
                    <div
                      key={officer.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-base font-cairo">
                          {officer.name.charAt(0)}
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-slate-100 font-cairo">{officer.name}</h5>
                          <span className="text-[11px] font-mono text-sky-300 block">{officer.role}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-cairo text-slate-300">
                        {officer.effect}
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          {isHired ? 'نشط في الرصيف' : `$${officer.cost.toLocaleString()}`}
                        </span>
                        <button
                          onClick={() => handleToggleOfficer(officer.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                            isHired
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-sky-500 hover:bg-sky-400 text-dark-950'
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
          // Tab 4: Maritime Port R&D
          renderRd={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  تكنولوجيا الموانئ الذكية والرادارات البحرية (Smart Port R&D)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  رافعات مؤتمتة وتعميق القنوات المائية لاستقبال ناقلات الحاويات الأضخم عالمياً.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'tech_armg',
                    title: 'رافعات الحاويات الجسرية الآلية بالكامل (ARMG Automation)',
                    desc: 'مناولة الحاويات آلياً على مدار 24 ساعة دون تدخل بشري.',
                    cost: 35000,
                  },
                  {
                    id: 'tech_vts',
                    title: 'منظومة مراقبة حركة السفن بالذكاء الاصطناعي (AI VTS)',
                    desc: 'إرشاد السفن في حالات الضباب والعواصف البحرية وتفادي الحوادث.',
                    cost: 60000,
                  },
                  {
                    id: 'tech_dredging',
                    title: 'مشروع تعميق القناة الملاحية (Deepwater Dredging)',
                    desc: 'استقبال ناقلات الحاويات العملاقة فئة Triple-E ومضاعفة الأرباح.',
                    cost: 130000,
                  },
                ].map((tech) => {
                  const isResearched = researchedTech[tech.id];
                  return (
                    <div
                      key={tech.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center mb-3">
                          <Compass className="w-5 h-5" />
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
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 cursor-default'
                              : 'bg-sky-500 hover:bg-sky-400 text-dark-950'
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
      )}
    </ComponentStateWrapper>
  );
};
