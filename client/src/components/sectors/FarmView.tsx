import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FarmOverview, FarmPlantedBatch, FarmCatalogCrop } from '../../types/sectors';
import { ComponentState } from '../../types/common';
import { SectorsService } from '../../services/sectors.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { SectorCockpitLayout, SectorMetric, SectorTabId } from './SectorCockpitLayout';
import { FarmInteriorConsole } from './interior/FarmInteriorConsole';
import { GameAudio } from '../../utils/audio';
import {
  Sprout,
  Sun,
  TrendingUp,
  Droplets,
  Wheat,
  Wind,
} from 'lucide-react';

interface FarmViewProps {
  forcedState?: ComponentState;
  onBalanceUpdate?: (newBalance: number) => void;
}

export const FarmView: React.FC<FarmViewProps> = ({ forcedState, onBalanceUpdate }) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [farm, setFarm] = useState<FarmOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [acresToPlant, setAcresToPlant] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<SectorTabId>('overview');

  // Tactical commodity contracts & staff state
  const [signedCommodities, setSignedCommodities] = useState<Record<string, boolean>>({
    comm_coffee: true,
    comm_saffron: false,
  });

  const [hiredAgronomists, setHiredAgronomists] = useState<Record<string, boolean>>({
    staff_agronomist: true,
    staff_drone: false,
    staff_organic: false,
  });

  const [researchedTech, setResearchedTech] = useState<Record<string, boolean>>({
    tech_drip: true,
    tech_seeds: false,
    tech_harvester: false,
  });

  const fetchData = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await SectorsService.getFarmOverview(token);
      setFarm(data);
    } catch {
      setError('Failed to fetch agricultural farm data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePlant = async (cropId: string): Promise<void> => {
    if (!token || acresToPlant <= 0) return;
    GameAudio.playTapSound();
    setActionId(cropId);
    try {
      const res = await SectorsService.plantFarmBatch(token, cropId, acresToPlant);
      setFarm(res.farm);
      showToast('success', 'تم زرع دفعة المحاصيل بنجاح', `تم بذر ${acresToPlant} فدان من الأراضي الزراعية.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشلت زراعة المحصول.';
      showToast('error', 'تعذر إتمام الزراعة', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleHarvest = async (batchId: string): Promise<void> => {
    if (!token) return;
    GameAudio.playCashSound();
    setActionId(batchId);
    try {
      const res = await SectorsService.harvestFarmBatch(token, batchId);
      setFarm(res.farm);
      showToast('success', 'اكتمل الحصاد بنجاح', `تم بيع المحصول وجني $${res.revenue.toLocaleString()} نقداً.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشل الحصاد.';
      showToast('error', 'فشل الحصاد', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleExpandFarm = async (): Promise<void> => {
    if (!token) return;
    GameAudio.playLevelUpSound();
    setActionId('expand');
    try {
      const res = await SectorsService.upgradeFarm(token);
      setFarm(res.farm);
      showToast('success', 'تمت توسعة المساحة الزراعية', `تمت توسعة المساحة الإجمالية إلى ${res.farm.total_acres} فدان.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشلت التوسعة.';
      showToast('error', 'تعذر إتمام التوسعة', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleToggleCommodity = (commId: string) => {
    GameAudio.playCashSound();
    setSignedCommodities((prev) => ({ ...prev, [commId]: true }));
    showToast('success', 'تم تسليم العقد الزراعي', 'تم توريد المحاصيل للأسواق العالمية بنجاح.');
    if (onBalanceUpdate) onBalanceUpdate(75000);
  };

  const handleToggleStaff = (staffId: string) => {
    GameAudio.playTapSound();
    setHiredAgronomists((prev) => ({ ...prev, [staffId]: !prev[staffId] }));
    showToast('success', 'تم تحديث الفريق الزراعي', 'تم تعيين الخبير الزراعي بنجاح.');
  };

  const handleResearchTech = (techId: string) => {
    GameAudio.playTapSound();
    setResearchedTech((prev) => ({ ...prev, [techId]: true }));
    showToast('success', 'تم تفعيل الترقية الحيوية', 'الأبحاث والتقنيات الزراعية تعمل بكفاءة.');
  };

  const usedAcres = farm?.used_acres ?? 0;
  const totalAcres = farm?.total_acres ?? 100;
  const availableAcres = Math.max(0, totalAcres - usedAcres);

  const metrics: SectorMetric[] = [
    {
      label: 'المساحة الزراعية الإجمالية',
      value: `${totalAcres} فدان`,
      change: `${availableAcres} خالية للزراعة`,
      isPositive: true,
      subtext: 'أراضٍ خصبة مروية بالكامل',
      icon: <Wheat className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'دفعات المحاصيل النامية',
      value: `${(farm?.planted_batches ?? []).length} دفعات`,
      change: 'في طور النضج',
      isPositive: true,
      subtext: 'محاصيل نقدية في طور النضج',
      icon: <Sprout className="w-4 h-4 text-cyan-400" />,
    },
    {
      label: 'مؤشر خصوبة التربة',
      value: '99.4% عضوية',
      change: 'درجة أ+',
      isPositive: true,
      subtext: 'تربة طينية عضوية غنية',
      icon: <Droplets className="w-4 h-4 text-sky-400" />,
    },
    {
      label: 'كفاءة الحصاد الميكانيكي',
      value: '+26.8% إنتاجية',
      change: 'إنتاج وفير',
      isPositive: true,
      subtext: 'حصادات ذاتية القيادة متطورة',
      icon: <TrendingUp className="w-4 h-4 text-amber-300" />,
    },
  ];

  const activeState: ComponentState = forcedState ?? (loading ? 'loading' : error ? 'error' : !farm ? 'empty' : 'success');

  return (
    <ComponentStateWrapper state={activeState} errorMessage={error ?? undefined} onRetry={fetchData}>
      {farm && (
        <SectorCockpitLayout
          sectorId="farm"
          themeColor="#22c55e"
          titleAr="المزارع الكبرى والمحاصيل النقدية الفاخرة"
          titleEn="Agricultural Mega Estate"
          statusBadge="المزارع والمحاصيل النقدية نشطة"
          level={2}
          tier={2}
          metrics={metrics}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          interiorConsole={<FarmInteriorConsole onBalanceUpdate={onBalanceUpdate} />}
          // Tab 1: Fields & Seeding
          renderOverview={() => (
            <div className="space-y-6">
              {/* Land Management Bar */}
              <div className="glass-panel rounded-3xl p-6 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 to-dark-900 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] uppercase font-cairo tracking-wider text-slate-400 block font-bold">
                    الأراضي الزراعية المتاحة للغرس
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black font-mono text-emerald-400">
                      {availableAcres} / {totalAcres}{' '}
                      <span className="text-sm font-normal text-slate-400">فدان متاح</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExpandFarm}
                    disabled={actionId === 'expand'}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                  >
                    {actionId === 'expand'
                      ? 'جارٍ استصلاح الأراضي...'
                      : `استصلاح وشراء أراضٍ إضافية ($${(farm.next_acreage_expansion_cost ?? 40000).toLocaleString()})`}
                  </button>
                </div>
              </div>

              {/* Active Batches Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-emerald-400" />
                  <span>دفعات المحاصيل النامية في الحقول ({(farm.planted_batches ?? []).length})</span>
                </h4>

                {(farm.planted_batches ?? []).length === 0 ? (
                  <div className="glass-panel rounded-2xl p-8 text-center border border-slate-800 bg-dark-900/50">
                    <p className="text-xs font-mono text-slate-400">
                      لا توجد محاصيل مغروسة حالياً. اختر بذوراً من القائمة أدناه وحدد المساحة لبدء الغرس.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {farm.planted_batches.map((batch: FarmPlantedBatch) => (
                      <div
                        key={batch.id}
                        className="glass-panel rounded-2xl p-5 border border-emerald-500/30 bg-dark-900/70 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              {batch.is_ready ? 'جاهز للحصاد الفوري' : 'في طور النمو'}
                            </span>
                            <h5 className="text-base font-bold text-slate-100 font-cairo mt-1">
                              {batch.crop_name}
                            </h5>
                          </div>
                          <span className="text-sm font-black font-mono text-emerald-400">
                            ${batch.potential_revenue.toLocaleString()}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-mono text-slate-400 flex justify-between">
                          <span>المساحة المزروعة:</span>
                          <span className="text-slate-200">{batch.acres_planted} فدان</span>
                        </div>

                        {batch.is_ready ? (
                          <button
                            onClick={() => handleHarvest(batch.id)}
                            disabled={actionId === batch.id}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                          >
                            <Wheat className="w-4 h-4" />
                            <span>
                              {actionId === batch.id
                                ? 'جارٍ الحصاد...'
                                : `حصاد المحصول وبيع ($${batch.potential_revenue.toLocaleString()})`}
                            </span>
                          </button>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-dark-950/40 border border-slate-800 text-center text-xs font-mono text-emerald-300 animate-pulse">
                            المحصول ينمو تحت أنظمة الري الذكية...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seed Procurement Catalog */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                    <Sun className="w-4 h-4 text-emerald-400" />
                    <span>بذور المحاصيل النقدية المتاحة للغرس الفوري</span>
                  </h4>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">المساحة المطلوبة:</span>
                    {[5, 10, 25, 50].map((acres) => (
                      <button
                        key={acres}
                        onClick={() => setAcresToPlant(acres)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                          acresToPlant === acres
                            ? 'bg-emerald-500 text-dark-950'
                            : 'bg-dark-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {acres} فدان
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(farm.crops_catalog ?? []).map((crop: FarmCatalogCrop) => (
                    <div
                      key={crop.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/40 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                            عائد: ${crop.yield_revenue_per_acre}/فدان
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            دورة سريعة
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-100 font-cairo">{crop.crop_name}</h5>
                        <div className="mt-3 p-2.5 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
                          <div className="flex justify-between">
                            <span>تكلفة غرس {acresToPlant} فدان:</span>
                            <span className="text-slate-200">${(crop.seed_cost_per_acre * acresToPlant).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>صافي العائد المتوقع:</span>
                            <span className="text-emerald-400 font-bold">
                              +${(crop.yield_revenue_per_acre * acresToPlant).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePlant(crop.id)}
                        disabled={actionId === crop.id || availableAcres < acresToPlant}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50"
                      >
                        {actionId === crop.id
                          ? 'جارٍ البذر والري...'
                          : `غرس ${acresToPlant} فدان ($${(crop.seed_cost_per_acre * acresToPlant).toLocaleString()})`}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          // Tab 2: Commodity Contracts
          renderTactical={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  عقود تصدير المحاصيل الفاخرة والبورصة الزراعية (Agri Commodities)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  توريد المحاصيل العضوية وسلاسل البن والزعفران للمطاعم الفاخرة وسلاسل الغذاء العالمية.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: 'comm_coffee',
                    title: 'توريد بن أرابيكا الجبلي العضوي (Specialty Coffee)',
                    buyer: 'European Roasteries Guild',
                    payout: '+$75,000 صافي عائد',
                    status: 'جاهز للتسليم',
                  },
                  {
                    id: 'comm_saffron',
                    title: 'مناقصة الزعفران الملكي النقي (Royal Saffron Reserve)',
                    buyer: 'Michelin Star Gourmet Alliance',
                    payout: '+$160,000 صافي عائد',
                    status: 'مطلوب حصاد ممتاز',
                  },
                ].map((comm) => {
                  const isDone = signedCommodities[comm.id];
                  return (
                    <div
                      key={comm.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-emerald-400">{comm.payout}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                            {comm.buyer}
                          </span>
                        </div>
                        <h5 className="text-base font-bold text-slate-100 font-cairo">{comm.title}</h5>
                      </div>

                      <button
                        onClick={() => handleToggleCommodity(comm.id)}
                        disabled={isDone}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                          isDone
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-dark-950 shadow-lg shadow-emerald-500/20'
                        }`}
                      >
                        {isDone ? 'تم شحن المحصول وتحصيل القيمة' : 'توقيع وتوريد الشحنة الزراعية'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          // Tab 3: Agronomists & Staff
          renderStaff={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  فريق الخبراء الزراعيين وإدارة الحقول (Estate Agronomists)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  توظيف كبار المهندسين الزراعيين لرفع إنتاجية الفدان ومكافحة الآفات تلقائياً.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'staff_agronomist',
                    name: 'د. نبيل الشامي',
                    role: 'خبير التربة والخصوبة العضوية',
                    effect: 'يرفع إنتاجية جميع المحاصيل بنسبة +25%',
                    cost: 15000,
                  },
                  {
                    id: 'staff_drone',
                    name: 'رنا الجابري',
                    role: 'مشغلة درونات الري والتسميد الذكي',
                    effect: 'تخفض تكاليف البذر والري بنسبة 30%',
                    cost: 28000,
                  },
                  {
                    id: 'staff_organic',
                    name: 'جورج دانيال',
                    role: 'مفتش الجودة والشهادات العضوية (Organic Audit)',
                    effect: 'يرفع أسعار بيع المحاصيل في السوق بنسبة +35%',
                    cost: 42000,
                  },
                ].map((staff) => {
                  const isHired = hiredAgronomists[staff.id];
                  return (
                    <div
                      key={staff.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-base font-cairo">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-slate-100 font-cairo">{staff.name}</h5>
                          <span className="text-[11px] font-mono text-emerald-300 block">{staff.role}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-cairo text-slate-300">
                        {staff.effect}
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          {isHired ? 'نشط في الحقول' : `$${staff.cost.toLocaleString()}`}
                        </span>
                        <button
                          onClick={() => handleToggleStaff(staff.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                            isHired
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-dark-950'
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
          // Tab 4: Precision Farming R&D
          renderRd={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  التكنولوجيا الحيوية والزراعة الدقيقة (Precision AgriTech R&D)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  حساسات رطوبة التربة والبيوت الزجاجية الهيدروبونية لمضاعفة سرعة النمو.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'tech_drip',
                    title: 'شبكة الري بالتنقيط تحت السطحي المؤتمتة (Smart Drip)',
                    desc: 'توفير 40% من استهلاك المياه ومضاعفة كثافة المحصول.',
                    cost: 25000,
                  },
                  {
                    id: 'tech_seeds',
                    title: 'سلالات البذور الهجينة فائقة الصمود والإنتاجية',
                    desc: 'مناعة كاملة ضد الجفاف وتغيرات الطقس وتسريع النضج 30%.',
                    cost: 50000,
                  },
                  {
                    id: 'tech_harvester',
                    title: 'حصادات كهربائية ذاتية القيادة بالأقمار الصناعية',
                    desc: 'حصاد الحقول الشاسعة في دقائق معدودة دون أي هدر.',
                    cost: 100000,
                  },
                ].map((tech) => {
                  const isResearched = researchedTech[tech.id];
                  return (
                    <div
                      key={tech.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3">
                          <Wind className="w-5 h-5" />
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
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-dark-950'
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
