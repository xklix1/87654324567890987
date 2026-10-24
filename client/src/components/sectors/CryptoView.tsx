import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CryptoOverview, CryptoRigCatalogItem } from '../../types/sectors';
import { ComponentState } from '../../types/common';
import { SectorsService } from '../../services/sectors.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { SectorCockpitLayout, SectorMetric, SectorTabId } from './SectorCockpitLayout';
import { CryptoInteriorConsole } from './interior/CryptoInteriorConsole';
import { GameAudio } from '../../utils/audio';
import {
  Cpu,
  Zap,
  Server,
  DollarSign,
  PlusCircle,
} from 'lucide-react';

interface CryptoViewProps {
  forcedState?: ComponentState;
  onBalanceUpdate?: (newBalance: number) => void;
}

export const CryptoView: React.FC<CryptoViewProps> = ({ forcedState, onBalanceUpdate }) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [overview, setOverview] = useState<CryptoOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectorTabId>('overview');

  // Tactical pools & staff states
  const [selectedPool, setSelectedPool] = useState<string>('pool_stratum');
  const [hiredTechs, setHiredTechs] = useState<Record<string, boolean>>({
    tech_thermal: true,
    tech_overclock: false,
    tech_green: false,
  });
  const [researchedTech, setResearchedTech] = useState<Record<string, boolean>>({
    tech_immersion: true,
    tech_3nm: false,
    tech_hydro: false,
  });

  const fetchData = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await SectorsService.getCryptoOverview(token);
      setOverview(data);
    } catch {
      setError('تعذر تحميل بيانات عمليات تعدين العملات المشفرة.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectCoin = async (coinSymbol: string): Promise<void> => {
    if (!token) return;
    GameAudio.playTapSound();
    setActionId(`coin_${coinSymbol}`);
    try {
      const res = await SectorsService.selectCryptoCoin(token, coinSymbol);
      setOverview(res.overview);
      showToast('info', 'تم تعديل خوارزمية التعدين', `توجيه القوة التعدينية نحو شبكة ${coinSymbol}.`);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشل تغيير العملة.';
      showToast('error', 'فشل الاختيار', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleBuyRig = async (catalogId: string): Promise<void> => {
    if (!token) return;
    GameAudio.playCashSound();
    setActionId(catalogId);
    try {
      const res = await SectorsService.buyMiningRig(token, catalogId);
      setOverview(res.overview);
      showToast('success', 'تم تدشين جهاز تعدين ASIC', 'تم تثبيت وتشغيل جهاز التعدين عالي الكثافة في الرف بنجاح.');
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشلت عملية الشراء.';
      showToast('error', 'فشل الشراء', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleClaimMined = async (): Promise<void> => {
    if (!token) return;
    GameAudio.playCashSound();
    setActionId('claim');
    try {
      const res = await SectorsService.claimMinedCrypto(token);
      setOverview(res.overview);
      showToast('success', 'تم تسييل أرباح التعدين', `تم تحويل $${res.claimed_usd.toLocaleString()} إلى الخزينة بنجاح.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشلت عملية التسييل.';
      showToast('error', 'فشل التسييل', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleToggleTech = (techId: string) => {
    GameAudio.playTapSound();
    setHiredTechs((prev) => ({ ...prev, [techId]: !prev[techId] }));
    showToast('success', 'تم تحديث طاقم المهندسين', 'تم ضبط المعايير التشغيلية للعتاد بنجاح.');
  };

  const handleResearchTech = (techId: string) => {
    GameAudio.playTapSound();
    setResearchedTech((prev) => ({ ...prev, [techId]: true }));
    showToast('success', 'تم تفعيل البحث والتطوير', 'تمت ترقية كفاءة التعدين بشكل دائم.');
  };

  const totalHashrate = overview?.total_hashrate_ths ?? 0;
  const unclaimedUSD = overview?.uncashed_value_usd ?? 0;

  const metrics: SectorMetric[] = [
    {
      label: 'القوة التعدينية الإجمالية',
      value: `${totalHashrate.toLocaleString()} TH/s`,
      change: '+22.5%',
      isPositive: true,
      subtext: 'معدل التجزئة الفعلي (Hashrate)',
      icon: <Cpu className="w-4 h-4 text-purple-400" />,
    },
    {
      label: 'أرباح البلوكشين القابلة للجني',
      value: `$${unclaimedUSD.toLocaleString()}`,
      change: 'جاهزة للتحويل',
      isPositive: true,
      subtext: 'مكافآت التعدين في المحفظة الباردة',
      icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'أجهزة التعدين العاملة',
      value: `${overview?.active_rigs_count ?? 0} أجهزة`,
      change: '100% متصل',
      isPositive: true,
      subtext: 'سيرفرات ASIC المتصلة بالشبكة',
      icon: <Server className="w-4 h-4 text-cyan-400" />,
    },
    {
      label: 'استهلاك الطاقة وكفاءة التبريد',
      value: '98.4% كفاءة الطاقة',
      change: 'حرارة مثالية',
      isPositive: true,
      subtext: 'تبريد مائي بالغمر عالي الكفاءة',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    },
  ];

  const activeState: ComponentState = forcedState ?? (loading ? 'loading' : error ? 'error' : !overview ? 'empty' : 'success');

  return (
    <ComponentStateWrapper state={activeState} errorMessage={error ?? undefined} onRetry={fetchData}>
      {overview && (
        <SectorCockpitLayout
          sectorId="crypto"
          themeColor="#a855f7"
          titleAr="مركز تعدين البلوكشين والحوسبة السحابية"
          titleEn="Blockchain Mining Facility"
          statusBadge="مزارع التعدين الرقمي نشطة"
          level={3}
          tier={2}
          metrics={metrics}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          interiorConsole={<CryptoInteriorConsole onBalanceUpdate={onBalanceUpdate} />}
          // Tab 1: Live Mining
          renderOverview={() => (
            <div className="space-y-6">
              {/* Claim Rewards & Target Coin Bar */}
              <div className="glass-panel rounded-3xl p-6 border border-purple-500/30 bg-gradient-to-r from-purple-950/25 to-dark-900 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    مكافآت التعدين المتراكمة للكتل
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black font-mono text-purple-300">
                      ${unclaimedUSD.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      (خزينة {overview.selected_coin ?? 'BTC'})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClaimMined}
                    disabled={actionId === 'claim' || unclaimedUSD <= 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-dark-950 font-bold text-xs font-cairo transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>{actionId === 'claim' ? 'جارٍ التحويل للخزينة...' : 'تسييل الأرباح ونقلها للخزينة'}</span>
                  </button>
                </div>
              </div>

              {/* Target Coin Selector */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200 font-cairo">
                  العملة المشفرة المستهدفة للتعدين
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { symbol: 'BTC', name: 'شبكة البيتكوين', reward: 'عائد مرتفع', diff: 'صعوبة عالية جداً' },
                    { symbol: 'ETH', name: 'تحصيص الإيثيريوم', reward: 'عائد مستقر', diff: 'صعوبة متوسطة' },
                    { symbol: 'KAS', name: 'شبكة كاسبا', reward: 'سرعة فائقة', diff: 'صعوبة منخفضة' },
                    { symbol: 'SOL', name: 'شبكة سولانا', reward: 'مكافآت المدققين', diff: 'صعوبة متوسطة' },
                  ].map((coin) => {
                    const isSelected = (overview.selected_coin || 'BTC') === coin.symbol;
                    return (
                      <button
                        key={coin.symbol}
                        onClick={() => handleSelectCoin(coin.symbol)}
                        className={`p-4 rounded-2xl border text-right transition-all ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500 text-slate-100 shadow-lg shadow-purple-500/10'
                            : 'bg-dark-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-base font-black font-mono text-purple-400">{coin.symbol}</span>
                          {isSelected && <span className="text-[10px] font-mono text-emerald-400 font-bold">نشط الآن</span>}
                        </div>
                        <div className="text-xs font-bold font-cairo text-slate-200">{coin.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          المكافأة: {coin.reward}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ASIC Store Catalog */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200 font-cairo flex items-center justify-between">
                  <span>شراء وتدشين أجهزة تعدين جديدة (ASIC)</span>
                  <span className="text-xs font-mono text-slate-400">توصيل فوري لرفوف السيرفرات</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(overview.rig_catalog ?? []).map((rig: CryptoRigCatalogItem) => (
                    <div
                      key={rig.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-purple-500/40 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                            مؤسسي
                          </span>
                          <span className="text-xs font-mono font-bold text-purple-400">
                            +{rig.hashrate_ths} TH/s
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-100 font-cairo">{rig.model_name}</h5>
                        <div className="mt-3 p-2.5 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
                          <div className="flex justify-between">
                            <span>استهلاك الطاقة:</span>
                            <span className="text-slate-300">{rig.power_consumption_watts}W</span>
                          </div>
                          <div className="flex justify-between">
                            <span>العائد اليومي التقديري:</span>
                            <span className="text-emerald-400 font-bold">+${Math.round(rig.hashrate_ths * 2.8)}/يوم</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleBuyRig(rig.id)}
                        disabled={actionId === rig.id}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>
                          {actionId === rig.id ? 'جارٍ التوصيل والتشغيل...' : `شراء ($${rig.purchase_cost.toLocaleString()})`}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          // Tab 2: Mining Pools
          renderTactical={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  عقود أحواض التعدين التشاركية
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  الانضمام لأكبر أحواض التعدين العالمية لضمان دخل ثابت ومستمر بدون تقلبات عشوائية.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'pool_stratum',
                    name: 'تحالف ستراتوم العالمي',
                    fee: '0.8% رسوم',
                    payoutModel: 'PPS+ (دفع فوري لكل سهم تجزئة)',
                    bonus: '+8% ثبات أرباح',
                  },
                  {
                    id: 'pool_ant',
                    name: 'حوض التعدين المؤسسي',
                    fee: '1.2% رسوم',
                    payoutModel: 'PPLNS (مكافآت كتل مباشرة)',
                    bonus: '+15% عند حل الكتل الكبرى',
                  },
                  {
                    id: 'pool_solo',
                    name: 'التعدين الفردي المستقل',
                    fee: '0.0% رسوم',
                    payoutModel: 'مكافأة البلوك كاملة 3.125 BTC',
                    bonus: 'مكافأة كبرى نادرة',
                  },
                ].map((pool) => {
                  const isActive = selectedPool === pool.id;
                  return (
                    <div
                      key={pool.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-purple-400">{pool.fee}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-emerald-400">
                            {pool.bonus}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-100 font-cairo">{pool.name}</h5>
                        <p className="text-xs font-mono text-slate-400 mt-2">{pool.payoutModel}</p>
                      </div>

                      <button
                        onClick={() => {
                          GameAudio.playTapSound();
                          setSelectedPool(pool.id);
                          showToast('info', 'تم تغيير حوض التعدين', `يتم التعدين الآن عبر ${pool.name}.`);
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-bold font-cairo transition-all ${
                          isActive
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 cursor-default'
                            : 'bg-purple-500 hover:bg-purple-400 text-dark-950'
                        }`}
                      >
                        {isActive ? 'الحوض المتصل حالياً' : 'ربط الخوادم بهذا الحوض'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          // Tab 3: Hardware Techs
          renderStaff={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  فريق مهندسي العتاد والتبريد الفائق
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  توظيف نخبة الخبراء لرفع أداء الأجهزة وتأمين سلامة السيرفرات على مدار الساعة.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'tech_thermal',
                    name: 'م. فادي شهاب',
                    role: 'خبير التبريد السائل والحراريات',
                    effect: 'يخفض حرارة الأجهزة ويقلل تكلفة الطاقة بنسبة 20%',
                    cost: 18000,
                  },
                  {
                    id: 'tech_overclock',
                    name: 'سارة الدليمي',
                    role: 'مطورة البرمجيات الثابتة المخصصة للأجهزة',
                    effect: 'كسر سرعة الرقائق لزيادة قوة الهاش بنسبة +15%',
                    cost: 32000,
                  },
                  {
                    id: 'tech_green',
                    name: 'رامي الحمصي',
                    role: 'مهندس الشبكات الكهربائية المستقلة',
                    effect: 'تجنب أعطال الشبكة وحماية الأجهزة من الصدمات',
                    cost: 40000,
                  },
                ].map((tech) => {
                  const isHired = hiredTechs[tech.id];
                  return (
                    <div
                      key={tech.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-base font-cairo">
                          {tech.name.charAt(0)}
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-slate-100 font-cairo">{tech.name}</h5>
                          <span className="text-[11px] font-mono text-purple-300 block">{tech.role}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-cairo text-slate-300">
                        {tech.effect}
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          {isHired ? 'نشط في غرفة السيرفرات' : `$${tech.cost.toLocaleString()}`}
                        </span>
                        <button
                          onClick={() => handleToggleTech(tech.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                            isHired
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-purple-500 hover:bg-purple-400 text-dark-950'
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
          // Tab 4: Datacenter R&D
          renderRd={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  تطوير وتحديث البنية التحتية لمزارع التعدين
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  تقنيات تبريد بالغمر ورقاقات السيليكون فائقة الصغر لزيادة العائد على الاستثمار.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'tech_immersion',
                    title: 'أحواض التبريد العازل بالغمر السائل',
                    desc: 'إلغاء الضوضاء بالكامل وإطالة عمر الرقاقات بنسبة 200%.',
                    cost: 35000,
                  },
                  {
                    id: 'tech_3nm',
                    title: 'رقاقات سيليكون 3 نانومتر مخصصة',
                    desc: 'مضاعفة كفاءة الطاقة لكل واط مستهلك (+30% ربحية صافية).',
                    cost: 65000,
                  },
                  {
                    id: 'tech_hydro',
                    title: 'محطة الطاقة الكهرومائية الذاتية',
                    desc: 'توليد طاقة نظيفة مجانية بنسبة 100% بدون انقطاع.',
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
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center mb-3">
                          <Zap className="w-5 h-5" />
                        </div>
                        <h5 className="text-sm font-bold text-slate-100 font-cairo">{tech.title}</h5>
                        <p className="text-xs text-slate-400 font-mono mt-2 leading-relaxed">{tech.desc}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-300">
                          {isResearched ? 'تقنية مدمجة' : `$${tech.cost.toLocaleString()}`}
                        </span>
                        <button
                          onClick={() => handleResearchTech(tech.id)}
                          disabled={isResearched}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                            isResearched
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 cursor-default'
                              : 'bg-purple-500 hover:bg-purple-400 text-dark-950'
                          }`}
                        >
                          {isResearched ? 'مفعّل بنجاح' : 'تفعيل البحث والتطوير'}
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
