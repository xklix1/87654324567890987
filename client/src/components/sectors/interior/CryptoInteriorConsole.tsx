import React, { useState, useEffect } from 'react';
import { GameAudio } from '../../../utils/audio';
import { useFloatingVfx } from '../../../context/FloatingVfxContext';
import {
  Flame,
  Zap,
  Fan,
  Server,
  Sparkles,
} from 'lucide-react';

interface CryptoInteriorConsoleProps {
  onBalanceUpdate?: (delta: number) => void;
}

export const CryptoInteriorConsole: React.FC<CryptoInteriorConsoleProps> = ({ onBalanceUpdate }) => {
  const { spawnMoneyFloat, spawnTextFloat } = useFloatingVfx();

  const [hashrate, setHashrate] = useState<number>(148.5); // TH/s
  const [temperature, setTemperature] = useState<number>(68); // °C (Max safe: 88°C)
  const [fanSpeed, setFanSpeed] = useState<number>(75); // %
  const [wattage, setWattage] = useState<number>(3200); // W
  const [minedSatoshis, setMinedSatoshis] = useState<number>(8420);
  const [isOverclocked, setIsOverclocked] = useState<boolean>(false);

  // Background mining ticker & thermal balance
  useEffect(() => {
    const timer = setInterval(() => {
      setMinedSatoshis((s) => s + (isOverclocked ? 45 : 18));
      // Thermal stabilization
      setTemperature((t) => {
        const target = isOverclocked ? 92 : 68;
        return t < target ? t + 0.5 : t > target ? t - 0.4 : t;
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [isOverclocked]);

  // Action: Overclock Mining Rig
  const handleToggleOverclock = (e: React.MouseEvent) => {
    if (!isOverclocked) {
      GameAudio.playTurbineBoost();
      setIsOverclocked(true);
      setHashrate(295.8);
      setFanSpeed(100);
      setWattage(5400);
      spawnTextFloat('تم تفعيل كسر سرعة التعدين: +100% قوة تعدينية!', true, e.clientX, e.clientY);
    } else {
      GameAudio.playTapSound();
      setIsOverclocked(false);
      setHashrate(148.5);
      setFanSpeed(75);
      setWattage(3200);
      spawnTextFloat('تمت العودة للوضع القياسي الاقتصادي', true, e.clientX, e.clientY);
    }
  };

  // Action: Clean Dust & Blast Fans
  const handleCleanFilters = (e: React.MouseEvent) => {
    GameAudio.playTurbineBoost();
    setTemperature(44);
    spawnTextFloat('تم تنظيف الفلاتر وتبريد مصفوفة ASIC: 44°C', true, e.clientX, e.clientY);
  };

  // Action: Solve Instant Mining Block
  const handleSolveBlock = (e: React.MouseEvent) => {
    if (temperature >= 96) {
      GameAudio.playAlarmSound();
      spawnTextFloat('خطر: حرارة المعالجات مرتفعة جداً!', false, e.clientX, e.clientY);
      return;
    }

    GameAudio.playCoinSound();
    const payout = Math.floor(220 + Math.random() * 150);
    setMinedSatoshis((s) => s + 250);
    setTemperature((t) => Math.min(100, t + 4));

    spawnMoneyFloat(payout, e.clientX, e.clientY);
    if (onBalanceUpdate) {
      onBalanceUpdate(payout);
    }
  };

  const isCriticalHeat = temperature >= 88;

  return (
    <div className="rounded-3xl p-4 sm:p-5 border border-purple-500/30 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 relative overflow-hidden shadow-2xl">
      {/* Ambient Server Rack Glow */}
      <div
        className={`absolute top-0 right-1/4 w-96 h-48 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 ${
          isCriticalHeat ? 'bg-rose-500/25' : 'bg-purple-500/15'
        }`}
      />

      {/* Header Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-cairo">
                غرفة خوادم التعدين المشفرة
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                عنقود البلوكشين الفائق
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              محاكاة استهلاك الطاقة، تجزئة الكتل (Hashrate)، ومراقبة درجات حرارة وحدات المعالجة
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-2">
          {isCriticalHeat && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold animate-pulse">
              <Flame className="w-3.5 h-3.5" /> سخونة مفرطة!
            </span>
          )}
          {isOverclocked && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
              <Zap className="w-3.5 h-3.5" /> كسر سرعة نشط
            </span>
          )}
        </div>
      </div>

      {/* Server Rack Visual Console */}
      <div className="my-4 p-4 rounded-2xl bg-dark-950/90 border border-dark-800 relative overflow-hidden">
        {/* Animated Server Blades Array */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
          {[1, 2, 3, 4].map((blade) => (
            <div
              key={blade}
              className="p-3 rounded-xl bg-dark-900 border border-purple-500/20 relative overflow-hidden flex flex-col justify-between h-24"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400">وحدة رف #{blade}</span>
                {/* Flashing LED */}
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>

              {/* Fan Animation */}
              <div className="flex items-center justify-center my-1">
                <Fan
                  className={`w-8 h-8 text-purple-400/80 transition-all ${
                    isOverclocked ? 'animate-spin' : 'animate-spin'
                  }`}
                  style={{ animationDuration: isOverclocked ? '0.4s' : '1.2s' }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-purple-300">
                <span>{(hashrate / 4).toFixed(1)} TH/s</span>
                <span className={isCriticalHeat ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                  {temperature}°C
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Telemetry Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-dark-800/80">
          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">إجمالي قدرة التجزئة</span>
            <span className="text-base font-black font-mono text-purple-300">{hashrate} TH/s</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">حرارة المعالجات</span>
            <span
              className={`text-base font-black font-mono ${
                isCriticalHeat ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {temperature}°C
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">استهلاك ومراوح الـ ASIC</span>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-black font-mono text-cyan-300">{wattage} W</span>
              <span className="text-[10px] font-mono text-purple-300">{fanSpeed}% سرعة</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">ساتوشي مستخرج</span>
            <span className="text-base font-black font-mono text-emerald-400">+{minedSatoshis}</span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
        <button
          onClick={handleSolveBlock}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-dark-950 font-black font-cairo text-xs transition-all shadow-lg shadow-purple-500/20 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>تعدين بلوك مكافأة فوري (+كاش)</span>
        </button>

        <button
          onClick={handleToggleOverclock}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold font-cairo text-xs transition-all active:scale-95 border ${
            isOverclocked
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
              : 'bg-dark-900 hover:bg-dark-850 text-slate-300 border-slate-700'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>{isOverclocked ? 'إلغاء كسر السرعة' : 'تفعيل كسر السرعة القصوى'}</span>
        </button>

        <button
          onClick={handleCleanFilters}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-cyan-300 border border-cyan-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-cyan-500/10"
        >
          <Fan className="w-4 h-4" />
          <span>تنظيف وتبريد الفلاتر</span>
        </button>
      </div>
    </div>
  );
};
