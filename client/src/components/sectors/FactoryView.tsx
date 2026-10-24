import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FactoryOverview } from '../../types/sectors';
import { ComponentState } from '../../types/common';
import { SectorsService } from '../../services/sectors.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { SectorCockpitLayout, SectorMetric, SectorTabId } from './SectorCockpitLayout';
import { FactoryInteriorConsole } from './interior/FactoryInteriorConsole';
import { GameAudio } from '../../utils/audio';
import {
  Cog,
  Package,
  PlusCircle,
  Play,
  Zap,
  TrendingUp,
  Flame,
  Boxes,
  Cpu,
} from 'lucide-react';

interface FactoryViewProps {
  forcedState?: ComponentState;
  onBalanceUpdate?: (newBalance: number) => void;
}

export const FactoryView: React.FC<FactoryViewProps> = ({ forcedState, onBalanceUpdate }) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [factory, setFactory] = useState<FactoryOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectorTabId>('overview');

  // Form modal for new line
  const [newLineName, setNewLineName] = useState<string>('Line C-1');
  const [newProductName, setNewProductName] = useState<string>('Consumer Electronics');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Staff state (client-side persisted)
  const [hiredStaff, setHiredStaff] = useState<Record<string, boolean>>({
    eng_1: true,
    qa_1: false,
    log_1: false,
  });

  // R&D tech tree state
  const [researchedTech, setResearchedTech] = useState<Record<string, boolean>>({
    tech_nano: false,
    tech_robotics: true,
    tech_solar: false,
  });

  // Tactical contracts state
  const [completedContracts, setCompletedContracts] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await SectorsService.getFactoryOverview(token);
      setFactory(data);
    } catch {
      setError('Failed to fetch manufacturing factory data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBuyMaterials = async (units: number): Promise<void> => {
    if (!token) return;
    GameAudio.playCashSound();
    setActionId('buy_mat');
    try {
      const res = await SectorsService.buyMaterials(token, units);
      setFactory(res.factory);
      showToast('success', 'تم توريد المواد الخام', `تم شراء ${units} وحدة من خامات التصنيع.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشلت عملية شراء المواد الخام.';
      showToast('error', 'فشل الشراء', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleCreateLine = async (): Promise<void> => {
    if (!token || !newLineName || !newProductName) return;
    GameAudio.playTapSound();
    setActionId('create_line');
    try {
      const res = await SectorsService.createProductionLine(token, newLineName, newProductName);
      setFactory(res.factory);
      showToast('success', 'تم تدشين خط الإنتاج', `تم إنشاء وتجهيز خط ${newLineName} للتصنيع.`);
      setShowCreateModal(false);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشل تدشين خط الإنتاج.';
      showToast('error', 'فشل التدشين', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleRunProduction = async (lineId: string): Promise<void> => {
    if (!token) return;
    GameAudio.playTapSound();
    setActionId(lineId);
    try {
      const res = await SectorsService.runProductionCycle(token, lineId);
      setFactory(res.factory);
      showToast('success', 'اكتملت دورة الإنتاج', `تم جني $${res.gross_revenue.toLocaleString()} من بيع المنتجات.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشلت دورة الإنتاج.';
      showToast('error', 'توقف دورة الإنتاج', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleRunAllLines = async (): Promise<void> => {
    if (!token || !factory || !factory.assembly_lines.length) return;
    GameAudio.playCashSound();
    setActionId('run_all');
    let totalRevenue = 0;
    try {
      for (const line of factory.assembly_lines) {
        if (factory.raw_materials_stock >= line.raw_material_required) {
          const res = await SectorsService.runProductionCycle(token, line.id);
          totalRevenue += res.gross_revenue;
          setFactory(res.factory);
          if (onBalanceUpdate) onBalanceUpdate(res.balance);
        }
      }
      showToast('success', 'تم تشغيل كافة خطوط الإنتاج', `إجمالي العائد: $${totalRevenue.toLocaleString()}`);
    } catch {
      showToast('info', 'اكتملت دورة التشغيل الدفعي', `تم تحقيق $${totalRevenue.toLocaleString()}`);
    } finally {
      setActionId(null);
    }
  };

  const handleUpgradeFactory = async (): Promise<void> => {
    if (!token) return;
    GameAudio.playLevelUpSound();
    setActionId('upgrade');
    try {
      const res = await SectorsService.upgradeFactory(token);
      setFactory(res.factory);
      showToast('success', 'تمت ترقية المصنع', `ترقية المجمع الصناعي إلى الفئة ${res.factory.factory_tier}.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'تعذر ترقية المصنع.';
      showToast('error', 'فشلت الترقية', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleHireStaff = (staffId: string, _cost: number) => {
    GameAudio.playTapSound();
    setHiredStaff((prev) => ({ ...prev, [staffId]: !prev[staffId] }));
    showToast('success', 'تم تحديث طاقم المصنع', 'تم تعديل معايير الأتمتة والتشغيل بنجاح.');
  };

  const handleResearchTech = (techId: string, _cost: number) => {
    GameAudio.playTapSound();
    setResearchedTech((prev) => ({ ...prev, [techId]: true }));
    showToast('success', 'إنجاز بحثي صناعي جديد', 'تم تفعيل علاوة الكفاءة الدائمة للمصنع!');
  };

  const handleFulfillContract = (contractId: string, payout: number) => {
    GameAudio.playCashSound();
    setCompletedContracts((prev) => ({ ...prev, [contractId]: true }));
    showToast('success', 'تم تسليم المناقصة الصناعية', `تم تحصيل مكافأة قدرها $${payout.toLocaleString()}!`);
    if (onBalanceUpdate) onBalanceUpdate(payout);
  };

  const activeState: ComponentState = forcedState ?? (loading ? 'loading' : error ? 'error' : !factory ? 'empty' : 'success');

  const metrics: SectorMetric[] = [
    {
      label: 'مخزون المواد الخام',
      value: `${(factory?.raw_materials_stock ?? 0).toLocaleString()} وحدة`,
      change: '+12% آمن',
      isPositive: true,
      subtext: `$${factory?.raw_material_unit_cost ?? 20} تكلفة الوحدة`,
      icon: <Package className="w-4 h-4 text-amber-400" />,
    },
    {
      label: 'خطوط الإنتاج النشطة',
      value: `${(factory?.assembly_lines ?? []).length} خطوط`,
      change: '100% جاهزية',
      isPositive: true,
      subtext: 'جاهزة للتشغيل الفوري',
      icon: <Cog className="w-4 h-4 text-cyan-400" />,
    },
    {
      label: 'مستوى الأتمتة',
      value: `الفئة ${factory?.factory_tier ?? 1}`,
      change: `المستوى ${factory?.automation_level ?? 1}`,
      isPositive: true,
      subtext: 'أتمتة خطوط الروبوتات',
      icon: <Zap className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'القوة الإنتاجية اليومية',
      value: `$${(((factory?.assembly_lines ?? []).reduce((acc, l) => acc + l.sale_price, 0)) * 4).toLocaleString()}`,
      change: '+18.4%',
      isPositive: true,
      subtext: 'العائد المتوقع لكل دورة',
      icon: <TrendingUp className="w-4 h-4 text-amber-300" />,
    },
  ];

  return (
    <ComponentStateWrapper state={activeState} errorMessage={error ?? undefined} onRetry={fetchData}>
      {factory && (
        <SectorCockpitLayout
          sectorId="factory"
          themeColor="#eab308"
          titleAr="المجمع الصناعي والإنتاج الثقيل"
          titleEn="Heavy Manufacturing Plant"
          statusBadge="خطوط الإنتاج والتجميع نشطة"
          level={factory.automation_level ?? 1}
          tier={factory.factory_tier ?? 1}
          metrics={metrics}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          interiorConsole={<FactoryInteriorConsole onBalanceUpdate={onBalanceUpdate} />}
          // Tab 1: Live Operations
          renderOverview={() => (
            <div className="space-y-6">
              {/* Warehouse Raw Materials Action Bar */}
              <div className="glass-panel rounded-3xl p-6 border border-amber-500/25 bg-gradient-to-r from-amber-950/20 to-dark-900 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Boxes className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                      مستودع الموارد والتغذية الخام (Raw Materials Silo)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono text-slate-100">
                        {(factory.raw_materials_stock ?? 500).toLocaleString()}{' '}
                        <span className="text-sm font-normal text-slate-400">وحدة</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleBuyMaterials(100)}
                    disabled={actionId === 'buy_mat'}
                    className="px-3.5 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-700 text-xs font-mono font-bold transition-all disabled:opacity-50"
                  >
                    +100 وحدة ($2,000)
                  </button>
                  <button
                    onClick={() => handleBuyMaterials(500)}
                    disabled={actionId === 'buy_mat'}
                    className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold transition-all disabled:opacity-50"
                  >
                    +500 وحدة ($10,000)
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 text-xs font-mono font-bold transition-all shadow-lg shadow-amber-500/20"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>خط جديد ($15,000)</span>
                  </button>
                </div>
              </div>

              {/* Master Control Bar */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h4 className="text-sm font-bold text-slate-200 font-cairo flex items-center gap-2">
                  <Cog className="w-4 h-4 text-amber-400" />
                  <span>عنابر وخطوط التجميع العاملة ({(factory.assembly_lines ?? []).length})</span>
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunAllLines}
                    disabled={actionId !== null || factory.raw_materials_stock < 50}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 text-xs font-bold font-cairo transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                  >
                    <Flame className="w-4 h-4" />
                    <span>تشغيل خطوط المصنع بالكامل (Run All)</span>
                  </button>
                  <button
                    onClick={handleUpgradeFactory}
                    disabled={actionId === 'upgrade'}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50"
                  >
                    {actionId === 'upgrade' ? 'جارٍ الترقية...' : `ترقية المصنع ($${(factory.next_upgrade_cost ?? 25000).toLocaleString()})`}
                  </button>
                </div>
              </div>

              {/* Assembly Lines Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(factory.assembly_lines ?? []).map((line) => {
                  const hasMaterials = factory.raw_materials_stock >= line.raw_material_required;
                  return (
                    <div
                      key={line.id}
                      className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-dark-900/80 space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {line.name}
                          </span>
                          <h5 className="text-sm font-bold text-slate-100 font-cairo mt-1">
                            {line.product_name}
                          </h5>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          ${line.sale_price.toLocaleString()}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-slate-400 space-y-1 bg-dark-950/60 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex justify-between">
                          <span>المواد المطلوبة:</span>
                          <span className={hasMaterials ? 'text-slate-200' : 'text-rose-400 font-bold'}>
                            {line.raw_material_required} Units
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>تكلفة الدورة:</span>
                          <span className="text-slate-200">${line.cycle_cost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>صافي الربح التقديري:</span>
                          <span className="text-emerald-400 font-bold">
                            +${(line.sale_price - line.cycle_cost).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRunProduction(line.id)}
                        disabled={actionId === line.id || !hasMaterials}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{actionId === line.id ? 'جارٍ التشغيل والتوزيع...' : 'تشغيل دورة تصنيع'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Modal to Create New Line */}
              {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-amber-500/40 bg-dark-900 space-y-4">
                    <h4 className="text-base font-bold text-slate-100 font-cairo">
                      تدشين خط إنتاج صناعي جديد
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-mono text-slate-400 block mb-1">اسم الخط</label>
                        <input
                          type="text"
                          value={newLineName}
                          onChange={(e) => setNewLineName(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-dark-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-mono text-slate-400 block mb-1">نوع المنتج المصنع</label>
                        <select
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-dark-950 border border-slate-700 text-slate-100 font-cairo text-xs focus:outline-none focus:border-amber-400"
                        >
                          <option value="Consumer Electronics">إلكترونيات استهلاكية ذكية</option>
                          <option value="Industrial Robotics">أذرع ومحركات روبوتية ثقيلة</option>
                          <option value="Aerospace Alloys">سبائك التيتانيوم للطيران</option>
                          <option value="High-Density Batteries">بطاريات ليثيوم فائقة الكثافة</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleCreateLine}
                        disabled={actionId === 'create_line'}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-xs font-cairo transition-all"
                      >
                        {actionId === 'create_line' ? 'جارٍ التدشين...' : 'تأكيد ودفع ($15,000)'}
                      </button>
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 py-2.5 rounded-xl bg-dark-800 text-slate-300 font-bold text-xs font-cairo"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          // Tab 2: Tactical Contracts
          renderTactical={() => (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-cairo">
                    مناقصات وعقود التوريد الصناعية الدولية
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    توريد طلبيات تجارية ضخمة للشركات العالمية مقابل عوائد نقدية ونقاط هيبة.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'contract_1',
                    title: 'توريد شحنة بطاريات للسيارات الكهربائية',
                    client: 'Tesla & Automotive Consortium',
                    requiredUnits: 300,
                    payout: 45000,
                    prestige: '+50 XP',
                  },
                  {
                    id: 'contract_2',
                    title: 'مناقصة توريد معالجات الحوسبة السحابية',
                    client: 'National Data Infrastructure',
                    requiredUnits: 650,
                    payout: 98000,
                    prestige: '+120 XP',
                  },
                  {
                    id: 'contract_3',
                    title: 'تجهيزات الدوائر الدقيقة للطائرات التجارية',
                    client: 'Airbus Commercial Alliance',
                    requiredUnits: 1200,
                    payout: 220000,
                    prestige: '+300 XP',
                  },
                ].map((c) => {
                  const isDone = completedContracts[c.id];
                  return (
                    <div
                      key={c.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                            {c.client}
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400">{c.prestige}</span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-100 font-cairo">{c.title}</h5>
                        <p className="text-xs font-mono text-slate-400 mt-2">
                          الحجم المطلوب: {c.requiredUnits} وحدة إنتاجية
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-sm font-black font-mono text-amber-400">
                          +${c.payout.toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleFulfillContract(c.id, c.payout)}
                          disabled={isDone}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                            isDone
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-dark-950'
                          }`}
                        >
                          {isDone ? 'مكتمل ومسلّم' : 'تسليم وتوقيع العقد'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          // Tab 3: Staff & Automation
          renderStaff={() => (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-cairo">
                    الهيكل الإداري والكوادر الهندسية (Staff Roster)
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    توظيف كبار المهندسين والمشرفين لأتمتة العمليات وتخفيض تكاليف التصنيع.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'eng_1',
                    name: 'د. مروان النجار',
                    role: 'كبير مهندسي الميكاترونكس',
                    effect: 'يخفض تكلفة دورات التشغيل بنسبة 15%',
                    cost: 12000,
                  },
                  {
                    id: 'qa_1',
                    name: 'م. لمياء الصالح',
                    role: 'مديرة ضمان الجودة الشاملة (QA)',
                    effect: 'ترفع سعر بيع المنتجات في السوق بنسبة 20%',
                    cost: 25000,
                  },
                  {
                    id: 'log_1',
                    name: 'طارق عبد الحق',
                    role: 'مسؤول المشتريات وسلاسل الإمداد',
                    effect: 'إعادة شحن المواد الخام آلياً فور نفادها',
                    cost: 35000,
                  },
                ].map((s) => {
                  const isHired = hiredStaff[s.id];
                  return (
                    <div
                      key={s.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-base font-cairo">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-slate-100 font-cairo">{s.name}</h5>
                          <span className="text-[11px] font-mono text-cyan-400 block">{s.role}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-cairo text-slate-300">
                        {s.effect}
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          {isHired ? 'نشط في المنشأة' : `$${s.cost.toLocaleString()}`}
                        </span>
                        <button
                          onClick={() => handleHireStaff(s.id, s.cost)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                            isHired
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
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
          // Tab 4: Tech Tree & R&D
          renderRd={() => (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-cairo">
                    مختبر الأبحاث والتطوير الصناعي (Industrial R&D)
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    براءات اختراع وترقيات تقنية دائمة لرفع الكفاءة وخفض البصمة الكربونية.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'tech_nano',
                    title: 'السبائك النانوية فائقة المتانة',
                    desc: 'رفع المتانة وسعر بيع جميع خطوط الإنتاج بنسبة +25%.',
                    cost: 30000,
                  },
                  {
                    id: 'tech_robotics',
                    title: 'أذرع التجميع الروبوتية من الجيل الرابع',
                    desc: 'أتمتة بنسبة 100% وإلغاء مخاطر تعطل الخطوط.',
                    cost: 45000,
                  },
                  {
                    id: 'tech_solar',
                    title: 'محطة الطاقة الشمسية الكهروضوئية الذاتية',
                    desc: 'تصفير فواتير استهلاك الطاقة الكهربائية للمصنع.',
                    cost: 60000,
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
                          <Cpu className="w-5 h-5" />
                        </div>
                        <h5 className="text-sm font-bold text-slate-100 font-cairo">{tech.title}</h5>
                        <p className="text-xs text-slate-400 font-mono mt-2 leading-relaxed">{tech.desc}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-300">
                          {isResearched ? 'براءة اختراع مسجلة' : `$${tech.cost.toLocaleString()}`}
                        </span>
                        <button
                          onClick={() => handleResearchTech(tech.id, tech.cost)}
                          disabled={isResearched}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                            isResearched
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-dark-950'
                          }`}
                        >
                          {isResearched ? 'مفعّل بنجاح' : 'بدء البحث والتطوير'}
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
