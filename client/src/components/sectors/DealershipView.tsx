import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { VehicleContract, DealershipProfile } from '../../types/sectors';
import { ComponentState } from '../../types/common';
import { SectorsService } from '../../services/sectors.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { SectorCockpitLayout, SectorMetric, SectorTabId } from './SectorCockpitLayout';
import { DealershipInteriorConsole } from './interior/DealershipInteriorConsole';
import { GameAudio } from '../../utils/audio';
import {
  Car,
  ShoppingBag,
  DollarSign,
  Sparkles,
  Award,
  TrendingUp,
} from 'lucide-react';

interface DealershipViewProps {
  forcedState?: ComponentState;
  onBalanceUpdate?: (newBalance: number) => void;
}

export const DealershipView: React.FC<DealershipViewProps> = ({ forcedState, onBalanceUpdate }) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [contracts, setContracts] = useState<VehicleContract[]>([]);
  const [profile, setProfile] = useState<DealershipProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectorTabId>('overview');

  // Tactical tuning & staff state
  const [activeAuctions, setActiveAuctions] = useState<Record<string, boolean>>({
    auc_hyper: false,
    auc_classic: true,
  });

  const [hiredStaff, setHiredStaff] = useState<Record<string, boolean>>({
    staff_broker: true,
    staff_tuner: false,
    staff_vip: false,
  });

  const [researchedTech, setResearchedTech] = useState<Record<string, boolean>>({
    tech_vr: true,
    tech_ceramic: false,
    tech_track: false,
  });

  const fetchData = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [contractsData, profileData] = await Promise.all([
        SectorsService.listVehicleContracts(),
        SectorsService.getDealershipProfile(token),
      ]);
      setContracts(contractsData);
      setProfile(profileData);
    } catch {
      setError('Failed to fetch car dealership data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOrderVehicle = async (contractId: string): Promise<void> => {
    if (!token) return;
    GameAudio.playCashSound();
    setActionId(contractId);
    try {
      const res = await SectorsService.orderVehicle(token, contractId);
      setProfile(res.profile);
      showToast('success', 'تم شحن عقد السيارة بنجاح', 'تم استيراد السيارة الفاخرة وإضافتها لصالة العرض.');
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشل طلب استيراد السيارة.';
      showToast('error', 'تعذر إتمام الطلب', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleSellVehicle = async (carId: string): Promise<void> => {
    if (!token) return;
    GameAudio.playCashSound();
    setActionId(carId);
    try {
      const res = await SectorsService.sellVehicle(token, carId);
      setProfile(res.profile);
      showToast('success', 'تم بيع السيارة بنجاح', `تم تحصيل $${res.sale_price.toLocaleString()} نقداً في محفظتك.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشلت عملية البيع.';
      showToast('error', 'فشل البيع', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleUpgradeDealership = async (): Promise<void> => {
    if (!token) return;
    GameAudio.playLevelUpSound();
    setActionId('upgrade');
    try {
      const res = await SectorsService.upgradeDealership(token);
      setProfile(res.profile);
      showToast('success', 'تمت توسعة صالة العرض', `تمت ترقية المعرض إلى الفئة ${res.profile.showroom_tier}.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'تعذر توسعة المعرض.';
      showToast('error', 'فشلت التوسعة', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleToggleAuction = (aucId: string) => {
    GameAudio.playCashSound();
    setActiveAuctions((prev) => ({ ...prev, [aucId]: true }));
    showToast('success', 'اكتمل مزاد السيارات النادرة VIP', 'تم بيع السيارة الرياضية الخارقة لمقتنٍ دولي بعلاوة سعرية.');
    if (onBalanceUpdate) onBalanceUpdate(125000);
  };

  const handleToggleStaff = (staffId: string) => {
    GameAudio.playTapSound();
    setHiredStaff((prev) => ({ ...prev, [staffId]: !prev[staffId] }));
    showToast('success', 'تم تحديث طاقم المعرض', 'تم تعديل كادر المبيعات والخبراء بنجاح.');
  };

  const handleResearchTech = (techId: string) => {
    GameAudio.playTapSound();
    setResearchedTech((prev) => ({ ...prev, [techId]: true }));
    showToast('success', 'تم تفعيل الترقية التقنية', 'تمت ترقية صالة العرض ومرافق الداينو بنجاح.');
  };

  const inventoryValue = (profile?.inventory ?? []).reduce(
    (acc, c) => acc + (c.potential_sale_price ?? (c as unknown as { retail_price?: number }).retail_price ?? 0),
    0
  );

  const metrics: SectorMetric[] = [
    {
      label: 'قيمة مخزون صالة العرض',
      value: `$${inventoryValue.toLocaleString()}`,
      change: '+18.5%',
      isPositive: true,
      subtext: 'سيارات خارقة جاهزة للتسليم الفوري',
      icon: <Car className="w-4 h-4 text-amber-400" />,
    },
    {
      label: 'السيارات في الصالة',
      value: `${(profile?.inventory ?? []).length} / ${profile?.max_display_slots ?? 4} منصة عرض`,
      change: 'أرضية المعرض',
      isPositive: true,
      subtext: 'مساحة العرض والمنصات الدوارة',
      icon: <ShoppingBag className="w-4 h-4 text-cyan-400" />,
    },
    {
      label: 'درجة تصنيف المعرض',
      value: `الفئة ${profile?.showroom_tier ?? 1}`,
      change: '5.0 نجوم',
      isPositive: true,
      subtext: 'توكيل معتمد للسيارات الإيطالية',
      icon: <Award className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'هامش الربح على السيارات',
      value: '+28.4% هامش',
      change: 'فئة عليا',
      isPositive: true,
      subtext: 'علاوة السعر للنسخ المحدودة',
      icon: <TrendingUp className="w-4 h-4 text-amber-300" />,
    },
  ];

  const activeState: ComponentState = forcedState ?? (loading ? 'loading' : error ? 'error' : !profile ? 'empty' : 'success');

  return (
    <ComponentStateWrapper state={activeState} errorMessage={error ?? undefined} onRetry={fetchData}>
      {profile && (
        <SectorCockpitLayout
          sectorId="dealership"
          themeColor="#f59e0b"
          titleAr="معرض ومزاد السيارات الرياضية الفاخرة"
          titleEn="Exotic Supercar Dealership"
          statusBadge="صالة العرض الرئيسية نشطة"
          level={profile.showroom_tier ?? 1}
          tier={profile.showroom_tier ?? 1}
          metrics={metrics}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          interiorConsole={<DealershipInteriorConsole onBalanceUpdate={onBalanceUpdate} />}
          // Tab 1: Showroom Floor & Orders
          renderOverview={() => (
            <div className="space-y-6">
              {/* Showroom Current Inventory */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                    <Car className="w-4 h-4 text-amber-400" />
                    <span>السيارات الفاخرة الحالية في صالة العرض ({(profile.inventory ?? []).length})</span>
                  </h4>
                  <button
                    onClick={handleUpgradeDealership}
                    disabled={actionId === 'upgrade'}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50"
                  >
                    {actionId === 'upgrade'
                      ? 'جارٍ توسعة الصالة...'
                      : `توسعة المعرض ($${(profile.next_upgrade_cost ?? 50000).toLocaleString()})`}
                  </button>
                </div>

                {(profile.inventory ?? []).length === 0 ? (
                  <div className="glass-panel rounded-2xl p-8 text-center border border-slate-800 bg-dark-900/50">
                    <p className="text-xs font-mono text-slate-400">
                      صالة العرض فارغة حالياً. قم بطلب عقود توريد سيارات جديدة من القائمة بالأسفل.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profile.inventory.map((car) => {
                      const carBrand = car.brand || (car as unknown as { category?: string }).category || 'EXOTIC';
                      const carModel = car.model || (car as unknown as { model_name?: string }).model_name || 'Supercar';
                      const salePrice = Number(car.potential_sale_price ?? (car as unknown as { retail_price?: number }).retail_price ?? 0);
                      const condition = car.condition_percent ?? 100;

                      return (
                        <div
                          key={car.id}
                          className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-dark-900/70 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                {carBrand}
                              </span>
                              <h5 className="text-base font-bold text-slate-100 font-cairo mt-1">
                                {carModel}
                              </h5>
                            </div>
                            <span className="text-sm font-black font-mono text-emerald-400">
                              ${salePrice.toLocaleString()}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-mono text-slate-400 flex justify-between">
                            <span>حالة الهيكل والمحرك:</span>
                            <span className="text-emerald-400 font-bold">{condition}% حالة ممتازة</span>
                          </div>

                          <button
                            onClick={() => handleSellVehicle(car.id)}
                            disabled={actionId === car.id}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                          >
                            <DollarSign className="w-4 h-4" />
                            <span>
                              {actionId === car.id
                                ? 'جارٍ تسليم المفتاح...'
                                : `بيع للعميل واستلام $${salePrice.toLocaleString()}`}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Vehicle Procurement Contracts */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>عقود استيراد السيارات الخارقة من المصانع العالمية</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {contracts.map((contract) => {
                    const contractBrand = contract.brand || (contract as unknown as { category?: string }).category || 'EXOTIC';
                    const contractModel = contract.model || (contract as unknown as { model_name?: string }).model_name || 'Vehicle';
                    const contractCost = Number(contract.cost ?? (contract as unknown as { purchase_cost?: number }).purchase_cost ?? 0);
                    const contractSellPrice = Number(contract.base_sell_price ?? (contract as unknown as { base_retail_price?: number }).base_retail_price ?? 0);
                    const profit = Math.max(0, contractSellPrice - contractCost);

                    return (
                      <div
                        key={contract.id}
                        className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-amber-500/40 bg-dark-900/60 flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                              {contractBrand}
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              ربح: +${profit.toLocaleString()}
                            </span>
                          </div>
                          <h5 className="text-sm font-bold text-slate-100 font-cairo">{contractModel}</h5>
                          <div className="mt-3 p-2.5 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
                            <div className="flex justify-between">
                              <span>تكلفة التوريد:</span>
                              <span className="text-slate-200">${contractCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>سعر البيع المتوقع:</span>
                              <span className="text-emerald-400 font-bold">${contractSellPrice.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOrderVehicle(contract.id)}
                          disabled={actionId === contract.id || (profile.inventory ?? []).length >= profile.max_display_slots}
                          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50"
                        >
                          {actionId === contract.id
                            ? 'جارٍ الشحن الجوي...'
                            : `طلب وتوريد ($${contractCost.toLocaleString()})`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          // Tab 2: VIP Auctions
          renderTactical={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  مزادات كبار الشخصيات والنسخ النادرة (VIP Hypercar Auctions)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  طرح إصدارات السباقات النادرة لكبار المقتنين والمليارديرات بعلاوات سعرية استثنائية.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: 'auc_hyper',
                    car: 'Bugatti Chiron Pur Sport (1 of 60 Edition)',
                    est: '$3,800,000',
                    premium: '+35% Auction Margin',
                    status: 'متاح للمزاد السري',
                  },
                  {
                    id: 'auc_classic',
                    car: 'Ferrari 250 GTO Heritage Monoposto',
                    est: '$6,200,000',
                    premium: '+50% Historic Value',
                    status: 'جاهز للإغلاق',
                  },
                ].map((auc) => {
                  const isDone = activeAuctions[auc.id];
                  return (
                    <div
                      key={auc.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-amber-400">{auc.premium}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                            {auc.status}
                          </span>
                        </div>
                        <h5 className="text-base font-bold text-slate-100 font-cairo">{auc.car}</h5>
                        <div className="mt-2 text-xs font-mono text-slate-400">
                          القيمة التقديرية بالمزاد: {auc.est}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleAuction(auc.id)}
                        disabled={isDone}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                          isDone
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-400 text-dark-950 shadow-lg shadow-amber-500/20'
                        }`}
                      >
                        {isDone ? 'تم البيع وتحصيل العمولة' : 'طرق مطرقة المزاد وتأكيد البيع'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          // Tab 3: Dealership Crew
          renderStaff={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  طاقم صالة العرض وخبراء التعديل الميكانيكي (Showroom Team)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  توظيف كبار مدراء المبيعات والميكانيكيين لرفع هوامش الربح وتسريع التسليم.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'staff_broker',
                    name: 'ماركو روسي',
                    role: 'كبير مسؤولي مبيعات السيارات الفاخرة',
                    effect: 'يرفع هامش الربح على جميع السيارات بنسبة +18%',
                    cost: 25000,
                  },
                  {
                    id: 'staff_tuner',
                    name: 'م. هانز غروبر',
                    role: 'كبير مهندسي التعديل الميكانيكي ومحركات التوربو',
                    effect: 'يضيف باقة التعديل الرياضي ويرفع سعر السيارات +25%',
                    cost: 40000,
                  },
                  {
                    id: 'staff_vip',
                    name: 'سيلفيا بيانتشي',
                    role: 'مديرة علاقات المشاهير وكبار المقتنين',
                    effect: 'جذب مشتريين فوريين دون فترات انتظار في الصالة',
                    cost: 55000,
                  },
                ].map((staff) => {
                  const isHired = hiredStaff[staff.id];
                  return (
                    <div
                      key={staff.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-base font-cairo">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-slate-100 font-cairo">{staff.name}</h5>
                          <span className="text-[11px] font-mono text-amber-300 block">{staff.role}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-cairo text-slate-300">
                        {staff.effect}
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          {isHired ? 'نشط في المعرض' : `$${staff.cost.toLocaleString()}`}
                        </span>
                        <button
                          onClick={() => handleToggleStaff(staff.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                            isHired
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500 hover:bg-amber-400 text-dark-950'
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
          // Tab 4: Showroom R&D
          renderRd={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  تطوير صالة العرض وتكنولوجيا السيارات (Automotive R&D)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  شاشات التخصيص الافتراضي والطلاء النانوي لحماية السيارات ورفع قيمتها.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'tech_vr',
                    title: 'استوديو التخصيص بالواقع الافتراضي (VR Configurator)',
                    desc: 'إتاحة تخصيص ألوان الكربون والجلد للمشترين وزيادة الإقبال بنسبة 20%.',
                    cost: 30000,
                  },
                  {
                    id: 'tech_ceramic',
                    title: 'غرفة طلاء السيراميك النانوي والبوليمر (Ceramic Nano-Coating)',
                    desc: 'حماية وتلميع أسطح السيارات ومضاعفة المظهر الفاخر للسيارات.',
                    cost: 55000,
                  },
                  {
                    id: 'tech_track',
                    title: 'حلبة اختبار السرعة الخاصة (Private Proving Ground)',
                    desc: 'إجراء تجارب القيادة الحصرية لعملاء الملايين وتأكيد المبيعات فوراً.',
                    cost: 110000,
                  },
                ].map((tech) => {
                  const isResearched = researchedTech[tech.id];
                  return (
                    <div
                      key={tech.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
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
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                              : 'bg-amber-500 hover:bg-amber-400 text-dark-950'
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
