import React, { useState, useEffect } from 'react';
import { GameAudio } from '../../../utils/audio';
import { useFloatingVfx } from '../../../context/FloatingVfxContext';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Shield,
  ArrowUpRight,
} from 'lucide-react';

interface StocksInteriorConsoleProps {
  onBalanceUpdate?: (delta: number) => void;
}

export const StocksInteriorConsole: React.FC<StocksInteriorConsoleProps> = ({ onBalanceUpdate }) => {
  const { spawnMoneyFloat, spawnTextFloat } = useFloatingVfx();

  const [marketIndex, setMarketIndex] = useState<number>(14250.8);
  const [indexChange, setIndexChange] = useState<number>(1.84);
  const [volatility, setVolatility] = useState<number>(16.2); // VIX
  const [hftLatency, setHftLatency] = useState<number>(1.2); // ms
  const [orderCount, setOrderCount] = useState<number>(1280);

  // Candlesticks dynamic simulation data
  const [candles, setCandles] = useState<{ open: number; close: number; high: number; low: number }[]>([
    { open: 40, close: 65, high: 75, low: 35 },
    { open: 65, close: 55, high: 70, low: 50 },
    { open: 55, close: 85, high: 90, low: 50 },
    { open: 85, close: 78, high: 88, low: 72 },
    { open: 78, close: 95, high: 100, low: 75 },
    { open: 95, close: 90, high: 98, low: 85 },
    { open: 90, close: 110, high: 115, low: 88 },
  ]);

  // Live market oscillations
  useEffect(() => {
    const timer = setInterval(() => {
      const delta = (Math.random() - 0.45) * 12;
      setMarketIndex((prev) => +(prev + delta).toFixed(2));
      setIndexChange((prev) => +(prev + delta * 0.02).toFixed(2));
      setOrderCount((c) => c + Math.floor(Math.random() * 8));
      setHftLatency(+(1.0 + Math.random() * 0.4).toFixed(1));

      // Append subtle candle variation
      setCandles((prev) => {
        const last = prev[prev.length - 1];
        const newClose = Math.max(30, Math.min(115, last.close + (Math.random() - 0.48) * 8));
        const updated = [...prev.slice(1), { open: last.close, close: newClose, high: Math.max(last.close, newClose) + 5, low: Math.min(last.close, newClose) - 5 }];
        return updated;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Action: Execute HFT Algorithmic Trade
  const handleHftTrade = (e: React.MouseEvent) => {
    GameAudio.playCoinSound();
    const profit = Math.floor(280 + Math.random() * 220);
    setOrderCount((c) => c + 15);
    setMarketIndex((m) => +(m + 8.5).toFixed(2));

    spawnMoneyFloat(profit, e.clientX, e.clientY);
    spawnTextFloat('تم تنفيذ صفقة HFT خوارزمية رابحة (+14% ألفا)', true, e.clientX, e.clientY - 25);

    if (onBalanceUpdate) {
      onBalanceUpdate(profit);
    }
  };

  // Action: Hedge Risk Exposure
  const handleHedge = (e: React.MouseEvent) => {
    GameAudio.playTurbineBoost();
    setVolatility(12.1);
    spawnTextFloat('تم تفعيل صفقات التحوط وتخفيض مؤشر المخاطر VIX', true, e.clientX, e.clientY);
  };

  // Action: Claim Fast Dividend Yield
  const handleDividend = (e: React.MouseEvent) => {
    GameAudio.playCoinSound();
    const dividend = 175;
    spawnMoneyFloat(dividend, e.clientX, e.clientY);
    spawnTextFloat('تم تحصيل عائد توزيعات أرباح الشركات الاستثمارية', true, e.clientX, e.clientY - 20);

    if (onBalanceUpdate) {
      onBalanceUpdate(dividend);
    }
  };

  const isBullish = indexChange >= 0;

  return (
    <div className="rounded-3xl p-4 sm:p-5 border border-emerald-500/30 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 relative overflow-hidden shadow-2xl">
      {/* Ambient Green Financial Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-48 rounded-full blur-3xl pointer-events-none bg-emerald-500/15" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-cairo">
                صالة التداول وخوارزميات البورصة العالمية
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                بث مباشر للأسواق العالمية
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              محاكاة حية لمؤشرات السيولة، دفاتر الأوامر، وتداولات الصناديق السيادية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
              isBullish
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            {isBullish ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isBullish ? '+' : ''}
            {indexChange}%
          </span>
        </div>
      </div>

      {/* Main Candlestick Stage & Order Book */}
      <div className="my-4 p-4 rounded-2xl bg-dark-950/90 border border-dark-800 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 font-bold text-slate-200">
            مؤشر السوق العام (المؤشر المركب): {marketIndex.toLocaleString()}
          </span>
          <span className="text-emerald-400">زمن الاستجابة: {hftLatency} ملي ثانية</span>
        </div>

        {/* Candlesticks Visualization */}
        <div className="h-28 flex items-end justify-between px-3 pt-3 pb-1 border-b border-dark-800 bg-gradient-to-t from-dark-900/60 to-transparent">
          {candles.map((candle, idx) => {
            const isGreen = candle.close >= candle.open;
            const bodyHeight = Math.max(6, Math.abs(candle.close - candle.open));
            const bottom = Math.min(candle.open, candle.close);
            return (
              <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end relative">
                {/* Candle Wick */}
                <div
                  className={`w-0.5 absolute ${isGreen ? 'bg-emerald-400' : 'bg-rose-400'}`}
                  style={{
                    height: `${candle.high - candle.low}px`,
                    bottom: `${candle.low}px`,
                  }}
                />
                {/* Candle Body */}
                <div
                  className={`w-4 sm:w-6 rounded-sm relative z-10 shadow-md ${
                    isGreen
                      ? 'bg-emerald-500 border border-emerald-400/80 shadow-emerald-500/20'
                      : 'bg-rose-500 border border-rose-400/80 shadow-rose-500/20'
                  }`}
                  style={{
                    height: `${bodyHeight}px`,
                    marginBottom: `${bottom}px`,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">مؤشر التقلب والمخاطر</span>
            <span className="text-base font-black font-mono text-amber-300">{volatility} نقطة</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">أوامر منفذة اليوم</span>
            <span className="text-base font-black font-mono text-slate-100">+{orderCount}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">عمولة التداول</span>
            <span className="text-base font-black font-mono text-emerald-400">0.05% رسوم مخفضة</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">حالة القاطع الآلي</span>
            <span className="text-xs font-bold font-mono text-emerald-300 block mt-1">القاطع آمن وطبيعي</span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
        <button
          onClick={handleHftTrade}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-dark-950 font-black font-cairo text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>تنفيذ صفقة تداول خوارزمية (+كاش)</span>
        </button>

        <button
          onClick={handleDividend}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-emerald-300 border border-emerald-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/10"
        >
          <DollarSign className="w-4 h-4" />
          <span>تحصيل توزيعات الأرباح (+$175)</span>
        </button>

        <button
          onClick={handleHedge}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-sky-300 border border-sky-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-sky-500/10"
        >
          <Shield className="w-4 h-4" />
          <span>تحوط وتأمين المحفظة</span>
        </button>
      </div>
    </div>
  );
};
