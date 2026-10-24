import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StockItem, StockPortfolioResponse } from '../../types/sectors';
import { ComponentState } from '../../types/common';
import { SectorsService } from '../../services/sectors.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { SectorCockpitLayout, SectorMetric, SectorTabId } from './SectorCockpitLayout';
import { StocksInteriorConsole } from './interior/StocksInteriorConsole';
import { GameAudio } from '../../utils/audio';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  PieChart,
  DollarSign,
  Cpu,
  Zap,
} from 'lucide-react';

interface StocksViewProps {
  forcedState?: ComponentState;
  onBalanceUpdate?: (newBalance: number) => void;
}

export const StocksView: React.FC<StocksViewProps> = ({ forcedState, onBalanceUpdate }) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [portfolio, setPortfolio] = useState<StockPortfolioResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectorTabId>('overview');

  // Trading modal/form state
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [sharesInput, setSharesInput] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tactical ETFs & Staff states
  const [investedFunds, setInvestedFunds] = useState<Record<string, number>>({
    etf_tech: 50000,
    etf_gold: 25000,
  });

  const [hiredBrokers, setHiredBrokers] = useState<Record<string, boolean>>({
    broker_quant: true,
    broker_hft: false,
    broker_insider: false,
  });

  const [researchedTech, setResearchedTech] = useState<Record<string, boolean>>({
    tech_fiber: true,
    tech_ml: false,
    tech_darkpool: false,
  });

  const fetchData = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [stocksData, portfolioData] = await Promise.all([
        SectorsService.listStocks(),
        SectorsService.getStockPortfolio(token),
      ]);
      setStocks(stocksData);
      setPortfolio(portfolioData);
    } catch {
      setError('Failed to fetch stock market data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExecuteTrade = async (): Promise<void> => {
    if (!token || !selectedStock || sharesInput <= 0) return;
    setIsSubmitting(true);
    GameAudio.playCashSound();
    try {
      if (tradeMode === 'buy') {
        const res = await SectorsService.buyStock(token, selectedStock.symbol, sharesInput);
        showToast('success', 'تم تنفيذ أمر الشراء بنجاح', `تم شراء ${sharesInput} سهم من شركة ${selectedStock.symbol}.`);
        if (onBalanceUpdate) onBalanceUpdate(res.balance);
      } else {
        const res = await SectorsService.sellStock(token, selectedStock.symbol, sharesInput);
        showToast('success', 'تم بيع الأسهم وتسييل الأرباح', `تم بيع ${sharesInput} سهم من ${selectedStock.symbol} وإيداع الأرباح.`);
        if (onBalanceUpdate) onBalanceUpdate(res.balance);
      }
      setSelectedStock(null);
      await fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'فشل تنفيذ أمر التداول.';
      showToast('error', 'تعذر تنفيذ التداول', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvestFund = (fundId: string, amount: number) => {
    GameAudio.playCashSound();
    setInvestedFunds((prev) => ({ ...prev, [fundId]: (prev[fundId] || 0) + amount }));
    showToast('success', 'تم الاستثمار في الصندوق', `تم ضخ $${amount.toLocaleString()} في الصندوق الاستثماري بنجاح.`);
    if (onBalanceUpdate) onBalanceUpdate(-amount);
  };

  const handleToggleBroker = (brokerId: string) => {
    GameAudio.playTapSound();
    setHiredBrokers((prev) => ({ ...prev, [brokerId]: !prev[brokerId] }));
    showToast('success', 'تم تحديث مكتب التداول', 'تم تعديل إعدادات الوسيط الآلي بنجاح.');
  };

  const handleResearchTech = (techId: string) => {
    GameAudio.playTapSound();
    setResearchedTech((prev) => ({ ...prev, [techId]: true }));
    showToast('success', 'تم تفعيل الترقية التقنية', 'خوارزميات التداول تعمل بكفاءة.');
  };

  const totalPortfolioValue = portfolio?.total_market_value ?? 0;
  const portfolioReturn = totalPortfolioValue > 100000 ? '+14.8%' : '+5.2%';

  const metrics: SectorMetric[] = [
    {
      label: 'القيمة السوقية للمحفظة',
      value: `$${totalPortfolioValue.toLocaleString()}`,
      change: portfolioReturn,
      isPositive: true,
      subtext: 'إجمالي تقييم الأسهم المملوكة',
      icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'الأسهم المتداولة المتاحة',
      value: `${stocks.length} شركة مدرجة`,
      change: 'سوق صاعد',
      isPositive: true,
      subtext: 'مؤشر البورصة الرسمي العام',
      icon: <Activity className="w-4 h-4 text-cyan-400" />,
    },
    {
      label: 'عائد التوزيعات السنوية',
      value: '7.8% سنوياً',
      change: '+1.2%',
      isPositive: true,
      subtext: 'أرباح نقدية توزع في المحفظة',
      icon: <TrendingUp className="w-4 h-4 text-emerald-300" />,
    },
    {
      label: 'الوسطاء الآليون (Algos)',
      value: 'تداول فائق السرعة HFT',
      change: 'أجزاء من الثانية',
      isPositive: true,
      subtext: 'تنفيذ أوامر فوري فائق السرعة',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    },
  ];

  const activeState: ComponentState = forcedState ?? (loading ? 'loading' : error ? 'error' : stocks.length === 0 ? 'empty' : 'success');

  return (
    <ComponentStateWrapper state={activeState} errorMessage={error ?? undefined} onRetry={fetchData}>
      <SectorCockpitLayout
        sectorId="stocks"
        themeColor="#10b981"
        titleAr="بورصة الأوراق المالية وأسواق المال"
        titleEn="Wall Street Stock Exchange"
        statusBadge="السوق المالي مفتوح • تداول حي"
        level={4}
        tier={3}
        metrics={metrics}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        interiorConsole={<StocksInteriorConsole onBalanceUpdate={onBalanceUpdate} />}
        // Tab 1: Live Market
        renderOverview={() => (
          <div className="space-y-6">
            {/* Holdings Summary Bar */}
            {portfolio && portfolio.holdings.length > 0 && (
              <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 bg-emerald-950/20">
                <h4 className="text-xs uppercase font-mono font-bold text-emerald-300 mb-3 flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  <span>محفظتك الاستثمارية الحالية ({portfolio.holdings.length} أسهم)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {portfolio.holdings.map((h) => (
                    <div key={h.symbol} className="p-3 rounded-xl bg-dark-950/70 border border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-slate-100">{h.symbol}</span>
                        <span className="text-xs font-mono text-emerald-400">{h.shares} سهم</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        القيمة: ${(h.current_market_value ?? 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stocks Market Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-200 font-cairo flex items-center justify-between">
                <span>أسهم الشركات المدرجة للتداول الفوري</span>
                <span className="text-xs font-mono text-slate-400">تحديث الأسعار مباشر (Live Tick)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {stocks.map((stock) => {
                  const isUp = (stock.change_percent ?? 0) >= 0;
                  return (
                    <div
                      key={stock.symbol}
                      className="glass-panel rounded-2xl p-4 border border-slate-800 hover:border-emerald-500/40 bg-dark-900/70 transition-all flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black font-mono text-slate-100 tracking-wider">
                            {stock.symbol}
                          </span>
                          <span className="text-xs text-slate-400 font-cairo">
                            {stock.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-black font-mono text-slate-200">
                            ${stock.current_price.toLocaleString()}
                          </span>
                          <span
                            className={`flex items-center text-xs font-mono font-bold ${
                              isUp ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {stock.change_percent}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            GameAudio.playTapSound();
                            setSelectedStock(stock);
                            setTradeMode('buy');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-dark-950 border border-emerald-500/40 text-xs font-mono font-bold transition-all"
                        >
                          شراء (Buy)
                        </button>
                        <button
                          onClick={() => {
                            GameAudio.playTapSound();
                            setSelectedStock(stock);
                            setTradeMode('sell');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-dark-950 border border-rose-500/30 text-xs font-mono font-bold transition-all"
                        >
                          بيع (Sell)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trading Modal Dialog */}
            {selectedStock && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-emerald-500/50 bg-dark-900 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-mono text-slate-400 block">
                        تنفيذ أمر تداول فوري
                      </span>
                      <h4 className="text-lg font-black font-mono text-slate-100">
                        {selectedStock.symbol} — {selectedStock.name}
                      </h4>
                    </div>
                    <span className="text-base font-black font-mono text-emerald-400">
                      ${selectedStock.current_price.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex rounded-xl bg-dark-950 p-1 border border-slate-800">
                    <button
                      onClick={() => setTradeMode('buy')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-cairo transition-all ${
                        tradeMode === 'buy' ? 'bg-emerald-500 text-dark-950' : 'text-slate-400'
                      }`}
                    >
                      شراء أسهم (Buy)
                    </button>
                    <button
                      onClick={() => setTradeMode('sell')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-cairo transition-all ${
                        tradeMode === 'sell' ? 'bg-rose-500 text-dark-950' : 'text-slate-400'
                      }`}
                    >
                      تسييل وبيع (Sell)
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-400 block mb-1">
                      عدد الأسهم المطلوب تداولها:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={sharesInput}
                      onChange={(e) => setSharesInput(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3.5 py-2 rounded-xl bg-dark-950 border border-slate-700 text-slate-100 font-mono text-base font-bold focus:outline-none focus:border-emerald-400"
                    />
                    <div className="flex gap-2 mt-2">
                      {[10, 50, 100, 500].map((num) => (
                        <button
                          key={num}
                          onClick={() => setSharesInput(num)}
                          className="flex-1 py-1 rounded-lg bg-dark-800 text-slate-300 hover:bg-slate-700 text-xs font-mono"
                        >
                          +{num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-950/80 border border-slate-800 flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400">إجمالي قيمة الصفقة:</span>
                    <span className="text-sm font-bold text-emerald-400">
                      ${(sharesInput * selectedStock.current_price).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleExecuteTrade}
                      disabled={isSubmitting}
                      className={`flex-1 py-2.5 rounded-xl text-dark-950 font-bold text-xs font-cairo transition-all ${
                        tradeMode === 'buy' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'
                      }`}
                    >
                      {isSubmitting ? 'جارٍ الإرسال...' : 'تأكيد وإرسال الأمر للبوابة'}
                    </button>
                    <button
                      onClick={() => setSelectedStock(null)}
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
        // Tab 2: Strategic Funds & Indexes
        renderTactical={() => (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                صناديق المؤشرات الاستراتيجية المتداولة (ETFs & Sovereign Funds)
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                استثمار رؤوس الأموال في محافظ أسهم منوعة تضمن عائداً سلبياً منتظماً وحماية من الهبوط الحاد.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'etf_tech',
                  name: 'صندوق مؤشر التكنولوجيا والذكاء الاصطناعي (AI Tech ETF)',
                  apr: '+24.5% سنوياً',
                  risk: 'مخاطرة متوسطة',
                  minInvest: 25000,
                  allocated: investedFunds['etf_tech'] || 0,
                },
                {
                  id: 'etf_gold',
                  name: 'صندوق التحوط بالذهب والمعادن النفيسة (Precious Metals)',
                  apr: '+11.2% سنوياً',
                  risk: 'ملاذ آمن فائق الاستقرار',
                  minInvest: 15000,
                  allocated: investedFunds['etf_gold'] || 0,
                },
                {
                  id: 'etf_div',
                  name: 'صندوق العوائد النقدية وتوزيعات الأرباح (Blue-Chip Dividend)',
                  apr: '+16.8% سنوياً',
                  risk: 'تدفق نقدي شهري ثابت',
                  minInvest: 50000,
                  allocated: investedFunds['etf_div'] || 0,
                },
              ].map((fund) => (
                <div
                  key={fund.id}
                  className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">{fund.apr}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                        {fund.risk}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-100 font-cairo">{fund.name}</h5>
                    <div className="mt-3 p-2.5 rounded-xl bg-dark-950/70 border border-slate-800 flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-400">رأس مالك المودع:</span>
                      <span className="font-bold text-emerald-400">${fund.allocated.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleInvestFund(fund.id, fund.minInvest)}
                    className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs font-cairo transition-all"
                  >
                    إيداع +${fund.minInvest.toLocaleString()} في الصندوق
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        // Tab 3: Brokers & Floor Traders
        renderStaff={() => (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                طاقم غرفة التداول ومطورو الخوارزميات (Trading Desk)
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                توظيف كبار المضاربين الماليين لتخفيض عمولات الوساطة وتنفيذ عمليات الشراء الذكية.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'broker_quant',
                  name: 'ألكسندر فاروف',
                  role: 'كبير مهندسي النماذج الكمية (Quant Lead)',
                  effect: 'يخفض عمولات التداول ورسوم البورصة بنسبة 50%',
                  salary: 15000,
                },
                {
                  id: 'broker_hft',
                  name: 'ياسمين العطار',
                  role: 'مديرة خوارزميات التداول عالي التردد (HFT)',
                  effect: 'شراء آلي تلقائي للأسهم عند هبوطها بأكثر من 4%',
                  salary: 30000,
                },
                {
                  id: 'broker_insider',
                  name: 'كارلوس منديز',
                  role: 'محلل استخبارات السوق والاندماجات',
                  effect: 'إرسال تنبيهات وتوقعات مبكرة قبل إعلانات الأرباح',
                  salary: 45000,
                },
              ].map((broker) => {
                const isHired = hiredBrokers[broker.id];
                return (
                  <div
                    key={broker.id}
                    className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-base font-cairo">
                        {broker.name.charAt(0)}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-100 font-cairo">{broker.name}</h5>
                        <span className="text-[11px] font-mono text-cyan-400 block">{broker.role}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-cairo text-slate-300">
                      {broker.effect}
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">
                        {isHired ? 'يعمل في مكتبك' : `$${broker.salary.toLocaleString()}`}
                      </span>
                      <button
                        onClick={() => handleToggleBroker(broker.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                          isHired
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-dark-950'
                        }`}
                      >
                        {isHired ? 'إنهاء التعاقد' : 'توظيف وتعيين'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        // Tab 4: Fintech R&D
        renderRd={() => (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                البنية التحتية لتكنولوجيا الأسواق (Fintech Architecture)
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                ترقيات سرعة الربط الليفي وتطبيقات الذكاء الاصطناعي لاكتناز ميزة تنافسية حاسمة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'tech_fiber',
                  title: 'ربط ليفي ميكروي مباشر مع خوادم البورصة',
                  desc: 'تقليص وقت وصول الأوامر إلى 0.2 ميلي ثانية لتجنب الانزلاق السعري.',
                  cost: 25000,
                },
                {
                  id: 'tech_ml',
                  title: 'شبكات عصبية للتنبؤ باتجاه الشموع اليابانية',
                  desc: 'كشف تحركات صناع السوق والحيتان قبل انعكاس الاتجاه.',
                  cost: 50000,
                },
                {
                  id: 'tech_darkpool',
                  title: 'الولوج المباشر إلى تجمعات السيولة المظلمة (Dark Pools)',
                  desc: 'تنفيذ صفقات الملايين دون التأثير السلبي على أسعار السوق العامة.',
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
                        <Cpu className="w-5 h-5" />
                      </div>
                      <h5 className="text-sm font-bold text-slate-100 font-cairo">{tech.title}</h5>
                      <p className="text-xs text-slate-400 font-mono mt-2 leading-relaxed">{tech.desc}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {isResearched ? 'بنية مفعلة' : `$${tech.cost.toLocaleString()}`}
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
                        {isResearched ? 'مفعّل بنجاح' : 'تفعيل وشراء الترخيص'}
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
