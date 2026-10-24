import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AirportHub, AircraftCatalogItem, AirportRoute } from '../../types/sectors';
import { ComponentState } from '../../types/common';
import { SectorsService } from '../../services/sectors.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { SectorCockpitLayout, SectorMetric, SectorTabId } from './SectorCockpitLayout';
import { AirportInteriorConsole } from './interior/AirportInteriorConsole';
import { GameAudio } from '../../utils/audio';
import {
  Plane,
  Navigation,
  Globe,
  Radio,
} from 'lucide-react';

interface AirportViewProps {
  forcedState?: ComponentState;
  onBalanceUpdate?: (newBalance: number) => void;
}

export const AirportView: React.FC<AirportViewProps> = ({ forcedState, onBalanceUpdate }) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [hub, setHub] = useState<AirportHub | null>(null);
  const [aircraftCatalog, setAircraftCatalog] = useState<AircraftCatalogItem[]>([]);
  const [routes, setRoutes] = useState<AirportRoute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<SectorTabId>('overview');

  // Tactical corridors & staff state
  const [activeCharters, setActiveCharters] = useState<Record<string, boolean>>({
    charter_london: true,
    charter_tokyo: false,
    charter_dubai: false,
  });

  const [hiredCrew, setHiredCrew] = useState<Record<string, boolean>>({
    crew_captain: true,
    crew_atc: false,
    crew_cabin: false,
  });

  const [researchedTech, setResearchedTech] = useState<Record<string, boolean>>({
    tech_biometric: true,
    tech_taxiway: false,
    tech_saf: false,
  });

  const fetchData = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [hubData, catData, routesData] = await Promise.all([
        SectorsService.getAirportHub(token),
        SectorsService.listAircraftCatalog(),
        SectorsService.listAirportRoutes(),
      ]);
      setHub(hubData);
      setAircraftCatalog(catData);
      setRoutes(routesData);
      if (routesData.length > 0) {
        setSelectedRouteId(routesData[0].id);
      }
    } catch {
      setError('Failed to fetch airport tycoon operations.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBuyAircraft = async (catalogId: string): Promise<void> => {
    if (!token) return;
    GameAudio.playCashSound();
    setActionId(catalogId);
    try {
      const res = await SectorsService.buyAircraft(token, catalogId);
      setHub(res.hub);
      showToast('success', 'تم شراء الطائرة بنجاح', 'تمت إضافة الطائرة الجديدة إلى حظيرة أسطولك التجاري.');
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشلت عملية شراء الطائرة.';
      showToast('error', 'تعذر إتمام الشراء', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleDispatchFlight = async (userAircraftId: string): Promise<void> => {
    if (!token || !selectedRouteId) return;
    GameAudio.playTapSound();
    setActionId(userAircraftId);
    try {
      const res = await SectorsService.dispatchFlight(token, userAircraftId, selectedRouteId);
      setHub(res.hub);
      showToast('success', 'انطلقت الرحلة الجوية', 'الطائرة الآن في الأجواء ضمن المسار الملاحي المعتمد.');
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'تعذر إطلاق الرحلة الجوية.';
      showToast('error', 'فشل الإقلاع', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleLandFlight = async (userAircraftId: string): Promise<void> => {
    if (!token) return;
    GameAudio.playCashSound();
    setActionId(userAircraftId);
    try {
      const res = await SectorsService.landFlight(token, userAircraftId);
      setHub(res.hub);
      showToast('success', 'هبطت الطائرة بسلام', `تم تحصيل $${res.gross_revenue.toLocaleString()} من مبيعات التذاكر.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'تعذر تنفيذ الهبوط.';
      showToast('error', 'فشل الهبوط', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleUpgradeAirport = async (): Promise<void> => {
    if (!token) return;
    GameAudio.playLevelUpSound();
    setActionId('upgrade');
    try {
      const res = await SectorsService.upgradeAirport(token);
      setHub(res.hub);
      showToast('success', 'تمت توسعة المطار', `ترقية الصالات والمدرج إلى الفئة ${res.hub.terminal_tier}.`);
      if (onBalanceUpdate) onBalanceUpdate(res.balance);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'تعذر ترقية المطار.';
      showToast('error', 'فشلت الترقية', msg);
    } finally {
      setActionId(null);
    }
  };

  const handleToggleCharter = (charterId: string) => {
    GameAudio.playCashSound();
    setActiveCharters((prev) => ({ ...prev, [charterId]: true }));
    showToast('success', 'اكتملت رحلة كبار الشخصيات VIP', 'هبطت الطائرة الخاصة وتم إيداع العائد المالي.');
    if (onBalanceUpdate) onBalanceUpdate(85000);
  };

  const handleToggleCrew = (crewId: string) => {
    GameAudio.playTapSound();
    setHiredCrew((prev) => ({ ...prev, [crewId]: !prev[crewId] }));
    showToast('success', 'تم تحديث طاقم الطيران والملاحة', 'تم تعديل كادر العمليات الجوية بنجاح.');
  };

  const handleResearchTech = (techId: string) => {
    GameAudio.playTapSound();
    setResearchedTech((prev) => ({ ...prev, [techId]: true }));
    showToast('success', 'تم اعتماد الترقية التقنية', 'تم رفع كفاءة المطار وأنظمة الملاحة.');
  };

  const activeFleet = hub?.fleet ?? [];
  const airborneCount = activeFleet.filter((a) => a.is_in_flight).length;

  const metrics: SectorMetric[] = [
    {
      label: 'الأسطول التجاري النشط',
      value: `${activeFleet.length} طائرات`,
      change: `${airborneCount} في الأجواء`,
      isPositive: true,
      subtext: 'طائرات تجارية ونفاثات كبرى',
      icon: <Plane className="w-4 h-4 text-sky-400" />,
    },
    {
      label: 'المسارات الجوية المجدولة',
      value: `${routes.length} مسارات`,
      change: 'خطوط دولية',
      isPositive: true,
      subtext: 'رحلات عبر القارات مباشرة',
      icon: <Navigation className="w-4 h-4 text-cyan-400" />,
    },
    {
      label: 'مستوى الصالة والمدارج',
      value: `الفئة ${hub?.terminal_tier ?? 1}`,
      change: 'مطار دولي معتمد',
      isPositive: true,
      subtext: 'مطار فئة أ معتمد IATA',
      icon: <Globe className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'كفاءة ودقة المواعيد',
      value: '99.2% التزام بالموعد',
      change: '+1.5%',
      isPositive: true,
      subtext: 'انضباط الإقلاع والهبوط الفوري',
      icon: <Navigation className="w-4 h-4 text-amber-400" />,
    },
  ];

  const activeState: ComponentState = forcedState ?? (loading ? 'loading' : error ? 'error' : !hub ? 'empty' : 'success');

  return (
    <ComponentStateWrapper state={activeState} errorMessage={error ?? undefined} onRetry={fetchData}>
      {hub && (
        <SectorCockpitLayout
          sectorId="airport"
          themeColor="#38bdf8"
          titleAr="المطار الدولي وأسطول الطيران التجاري"
          titleEn="International Airport Hub"
          statusBadge="المجال الجوي والمدارج نشطة"
          level={hub.terminal_tier ?? 1}
          tier={hub.terminal_tier ?? 1}
          metrics={metrics}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          interiorConsole={<AirportInteriorConsole onBalanceUpdate={onBalanceUpdate} />}
          // Tab 1: Fleet & Flights
          renderOverview={() => (
            <div className="space-y-6">
              {/* Route Selector & Dispatch Master Control */}
              <div className="glass-panel rounded-3xl p-6 border border-sky-500/30 bg-gradient-to-r from-sky-950/20 to-dark-900 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] uppercase font-cairo tracking-wider text-slate-400 block font-bold">
                    المسار الجوي المجدول للإقلاع (المسار الملاحي المعتمد)
                  </span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <select
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      className="px-4 py-2 rounded-xl bg-dark-950 border border-slate-700 text-slate-100 font-cairo text-xs focus:outline-none focus:border-sky-400"
                    >
                      {routes.map((r) => {
                        const origin = r.origin || (r as unknown as { origin_city?: string }).origin_city || 'Origin';
                        const destination = r.destination || (r as unknown as { destination_city?: string }).destination_city || 'Destination';
                        const fare = Number(r.base_passenger_fare ?? (r as unknown as { base_revenue?: number }).base_revenue ?? 0);
                        return (
                          <option key={r.id} value={r.id}>
                            {origin} ✈ {destination} (عائد تذكرة: ${fare.toLocaleString()})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleUpgradeAirport}
                    disabled={actionId === 'upgrade'}
                    className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50 shadow-lg shadow-sky-500/20"
                  >
                    {actionId === 'upgrade'
                      ? 'جارٍ توسعة المدارج...'
                      : `ترقية المطار ($${(hub.next_terminal_upgrade_cost ?? 75000).toLocaleString()})`}
                  </button>
                </div>
              </div>

              {/* Active Fleet Grid */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                  <Plane className="w-4 h-4 text-sky-400" />
                  <span>طائرات أسطولك التجاري في المطار ({activeFleet.length})</span>
                </h4>

                {activeFleet.length === 0 ? (
                  <div className="glass-panel rounded-2xl p-8 text-center border border-slate-800 bg-dark-900/50">
                    <p className="text-xs font-cairo text-slate-400">
                      حظيرة الطائرات فارغة. قم بشراء طائرات من الكتالوج الموضح أدناه.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeFleet.map((plane) => {
                      const planeModel = plane.model || (plane as unknown as { model_name?: string }).model_name || 'Airplane';
                      const capacity = Number(plane.capacity ?? (plane as unknown as { passenger_capacity?: number }).passenger_capacity ?? 50);
                      const isAirborne = Boolean(plane.is_in_flight || (plane as unknown as { status?: string }).status === 'IN_FLIGHT');

                      return (
                        <div
                          key={plane.id}
                          className="glass-panel rounded-2xl p-5 border border-sky-500/30 bg-dark-900/70 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-cairo px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                                {isAirborne ? 'في الأجواء حالياً' : 'على المدرج جاهزة'}
                              </span>
                              <h5 className="text-base font-bold text-slate-100 font-cairo mt-1">
                                {planeModel}
                              </h5>
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                              {capacity} راكب
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-mono text-slate-400 flex justify-between">
                            <span>تكلفة التشغيل:</span>
                            <span className="text-slate-200">${(capacity * 25).toLocaleString()}</span>
                          </div>

                          {isAirborne ? (
                            <button
                              onClick={() => handleLandFlight(plane.id)}
                              disabled={actionId === plane.id}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                            >
                              <Plane className="w-4 h-4" />
                              <span>
                                {actionId === plane.id ? 'جارٍ الهبوط...' : 'هبوط الطائرة وتحصيل عوائد التذاكر'}
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDispatchFlight(plane.id)}
                              disabled={actionId === plane.id}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50"
                            >
                              <Navigation className="w-4 h-4" />
                              <span>{actionId === plane.id ? 'جارٍ الإقلاع...' : 'إقلاع في المسار المحدد'}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Aircraft Procurement Catalog */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <span>كتالوج شراء الطائرات التجارية الكبرى (Boeing & Airbus)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {aircraftCatalog.map((cat) => {
                    const catModel = cat.model || (cat as unknown as { model_name?: string }).model_name || 'AeroJet';
                    const passengerCap = Number(cat.passenger_capacity ?? (cat as unknown as { capacity?: number }).capacity ?? 100);
                    const purchasePrice = Number(cat.purchase_price ?? 0);

                    return (
                      <div
                        key={cat.id}
                        className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-sky-500/40 bg-dark-900/60 flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                              سعة: {passengerCap} راكب
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              عائد: +${(passengerCap * 120).toLocaleString()}
                            </span>
                          </div>
                          <h5 className="text-sm font-bold text-slate-100 font-cairo">{catModel}</h5>
                          <p className="text-xs font-mono text-slate-400 mt-2">
                            طائرة نفاثة عريضة البدن للرحلات الدولية المربحة.
                          </p>
                        </div>

                        <button
                          onClick={() => handleBuyAircraft(cat.id)}
                          disabled={actionId === cat.id}
                          className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-dark-950 font-bold text-xs font-cairo transition-all disabled:opacity-50"
                        >
                          {actionId === cat.id ? 'جارٍ التسجيل والتسليم...' : `شراء للأسطول ($${purchasePrice.toLocaleString()})`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          // Tab 2: Flight Corridors
          renderTactical={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  عقود الرحلات الخاصة وتشارتر كبار الشخصيات (VIP Charters)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  تسيير رحلات مباشرة حصرية لنقل الرؤساء والوفود الدبلوماسية بأرباح خيالية.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'charter_london',
                    route: 'London Heathrow (LHR) Express',
                    details: 'رحلة حصرية لرجال الأعمال والوفود الاستثمارية',
                    payout: '+$85,000 صافي ربح',
                  },
                  {
                    id: 'charter_tokyo',
                    route: 'Tokyo Haneda (HND) Direct',
                    details: 'جسر جوي مباشر للشخصيات المصرفية الكبرى',
                    payout: '+$140,000 صافي ربح',
                  },
                  {
                    id: 'charter_dubai',
                    route: 'Dubai International (DXB) Luxury',
                    details: 'رحلة أجنحة الدرجة الأولى الملكية الحصرية',
                    payout: '+$190,000 صافي ربح',
                  },
                ].map((c) => {
                  const isDone = activeCharters[c.id];
                  return (
                    <div
                      key={c.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-emerald-400">{c.payout}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                            VIP Charter
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-100 font-cairo">{c.route}</h5>
                        <p className="text-xs font-mono text-slate-400 mt-2">{c.details}</p>
                      </div>

                      <button
                        onClick={() => handleToggleCharter(c.id)}
                        disabled={isDone}
                        className={`w-full py-2 rounded-xl text-xs font-bold font-cairo transition-all ${
                          isDone
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-sky-500 hover:bg-sky-400 text-dark-950 shadow-lg shadow-sky-500/20'
                        }`}
                      >
                        {isDone ? 'تمت الرحلة وتحصيل العائد' : 'تأكيد تسيير الرحلة الخاصة'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          // Tab 3: Aviation Crew
          renderStaff={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  طاقم قيادة الطيران والملاحة الجوية (Aviation Crew)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  توظيف كبار الطيارين وضباط المراقبة الجوية لتخفيض استهلاك الوقود وزيادة السلامة.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'crew_captain',
                    name: 'كابتن طيار حازم شكري',
                    role: 'كبير مدربي الطيران التجاري (Chief Pilot)',
                    effect: 'يخفض استهلاك وقود الطائرات بنسبة 20%',
                    cost: 25000,
                  },
                  {
                    id: 'crew_atc',
                    name: 'مها الأحمدي',
                    role: 'مديرة برج المراقبة الجوية (ATC Director)',
                    effect: 'تسريع هبوط وإقلاع الطائرات وإلغاء فترات الانتظار',
                    cost: 35000,
                  },
                  {
                    id: 'crew_cabin',
                    name: 'آرثر بنجامين',
                    role: 'مدير الضيافة والدرجة الأولى الملوكية',
                    effect: 'يرفع إيراد تذاكر الطائرات بنسبة +25%',
                    cost: 45000,
                  },
                ].map((crew) => {
                  const isHired = hiredCrew[crew.id];
                  return (
                    <div
                      key={crew.id}
                      className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-base font-cairo">
                          {crew.name.charAt(0)}
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-slate-100 font-cairo">{crew.name}</h5>
                          <span className="text-[11px] font-mono text-sky-300 block">{crew.role}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-cairo text-slate-300">
                        {crew.effect}
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          {isHired ? 'نشط في المطار' : `$${crew.cost.toLocaleString()}`}
                        </span>
                        <button
                          onClick={() => handleToggleCrew(crew.id)}
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
          // Tab 4: Aeronautical R&D
          renderRd={() => (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-cairo">
                  تكنولوجيا الطيران وتوسعة المطار الذكي (Aeronautical R&D)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  أنظمة الملاحة بالأقمار الصناعية والوقود الحيوي المستدام لتقليل الانبعاثات.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'tech_biometric',
                    title: 'البوابات الذكية البيومترية ومناولة الأمتعة الآلية',
                    desc: 'إنهاء إجراءات الركاب بسرعة فائقة ومضاعفة استيعاب الصالات.',
                    cost: 35000,
                  },
                  {
                    id: 'tech_taxiway',
                    title: 'مدارج الخروج السريع والإضاءة التكيفية (Rapid-Exit Taxiways)',
                    desc: 'إتاحة هبوط طائرتين في نفس الوقت وزيادة الطاقة الاستيعابية 40%.',
                    cost: 65000,
                  },
                  {
                    id: 'tech_saf',
                    title: 'مصفاة الوقود الحيوي المستدام (SAF Aviation Biofuel)',
                    desc: 'خفض تكلفة وقود الطائرات إلى النصف بشكل دائم.',
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
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center mb-3">
                          <Radio className="w-5 h-5" />
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
