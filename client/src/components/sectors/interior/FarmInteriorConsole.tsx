import React, { useState, useEffect } from 'react';
import { GameAudio } from '../../../utils/audio';
import { useFloatingVfx } from '../../../context/FloatingVfxContext';
import {
  Wheat,
  Droplets,
  Sun,
  CloudRain,
  Sprout,
  Sparkles,
} from 'lucide-react';

interface FarmInteriorConsoleProps {
  onBalanceUpdate?: (delta: number) => void;
}

export const FarmInteriorConsole: React.FC<FarmInteriorConsoleProps> = ({ onBalanceUpdate }) => {
  const { spawnMoneyFloat, spawnTextFloat } = useFloatingVfx();

  const [moisture, setMoisture] = useState<number>(68); // %
  const [soilNutrients, setSoilNutrients] = useState<number>(82); // %
  const [harvestYield, setHarvestYield] = useState<number>(310); // Tons
  const [isIrrigating, setIsIrrigating] = useState<boolean>(false);

  // Periodic soil drying
  useEffect(() => {
    const timer = setInterval(() => {
      setMoisture((m) => (m > 30 ? +(m - 0.5).toFixed(1) : 30));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Action: Automated Sprinkler Irrigation
  const handleIrrigate = (e: React.MouseEvent) => {
    setIsIrrigating(true);
    GameAudio.playTurbineBoost();
    setMoisture(95);
    spawnTextFloat('تم تفعيل شبكة الري الذاتي بالتنقيط (رطوبة 95%)', true, e.clientX, e.clientY);

    setTimeout(() => {
      setIsIrrigating(false);
    }, 1200);
  };

  // Action: Harvest Cash Crop
  const handleHarvest = (e: React.MouseEvent) => {
    if (moisture < 40) {
      GameAudio.playAlarmSound();
      spawnTextFloat('تحذير: المحاصيل جافة! قم بالري أولاً لمضاعفة المحصول', false, e.clientX, e.clientY);
    }

    GameAudio.playCoinSound();
    const payout = Math.floor(210 + Math.random() * 140);
    setHarvestYield((h) => h + 12);

    spawnMoneyFloat(payout, e.clientX, e.clientY);
    spawnTextFloat('تم حصاد المحاصيل وتوريدها للأسواق (+كاش)', true, e.clientX, e.clientY - 25);

    if (onBalanceUpdate) {
      onBalanceUpdate(payout);
    }
  };

  // Action: Organic Fertilizer Injection
  const handleFertilize = (e: React.MouseEvent) => {
    const cost = 120;
    GameAudio.playMachinerySound();
    setSoilNutrients(100);
    spawnTextFloat('تم حقن التربة بالأسمدة العضوية (خصوبة 100%)', true, e.clientX, e.clientY);
    spawnMoneyFloat(-cost, e.clientX, e.clientY + 20);

    if (onBalanceUpdate) {
      onBalanceUpdate(-cost);
    }
  };

  return (
    <div className="rounded-3xl p-4 sm:p-5 border border-emerald-500/30 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 relative overflow-hidden shadow-2xl">
      {/* Ambient Farm Green Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-48 rounded-full blur-3xl pointer-events-none bg-emerald-500/15" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
            <Wheat className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-cairo">
                غرفة التحكم الزراعي والبيوت المحمية
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-cairo font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                بروتوكول الحصاد نشط
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-cairo">
              محاكاة مستويات رطوبة التربة، محطات الأرصاد الزراعية، ودورات الحصاد النقدي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-900 border border-emerald-500/30 text-emerald-300 text-xs font-cairo">
            <Sun className="w-3.5 h-3.5 text-amber-400" /> أشعة مثالية 28°م
          </span>
        </div>
      </div>

      {/* Visual Crop Stage */}
      <div className="my-4 p-4 rounded-2xl bg-dark-950/90 border border-dark-800 relative overflow-hidden">
        <div className="h-24 rounded-xl bg-gradient-to-r from-emerald-950/40 via-dark-900 to-emerald-950/40 border border-emerald-500/20 flex items-center justify-around px-4 relative overflow-hidden">
          {/* Animated Sprinkler Water Effect */}
          {isIrrigating && (
            <div className="absolute inset-0 bg-cyan-400/10 pointer-events-none flex items-center justify-around animate-pulse">
              <div className="w-full h-full bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px]" />
            </div>
          )}

          {[1, 2, 3, 4, 5, 6].map((plot) => (
            <div key={plot} className="flex flex-col items-center">
              <Sprout className={`w-8 h-8 ${isIrrigating ? 'text-emerald-300 scale-110' : 'text-emerald-500'} transition-all`} />
              <span className="text-[9px] font-cairo text-emerald-400/80 mt-1">حقل #{plot}</span>
            </div>
          ))}
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">رطوبة التربة الحالية</span>
            <span className={`text-base font-black font-mono ${moisture < 40 ? 'text-rose-400' : 'text-cyan-300'}`}>
              {moisture}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">خصوبة الأسمدة العضوية</span>
            <span className="text-base font-black font-mono text-emerald-300">{soilNutrients}%</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">إجمالي أطنان الحصاد</span>
            <span className="text-base font-black font-mono text-slate-100">+{harvestYield} طن</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">توقعات الأمطار</span>
            <span className="text-xs font-bold font-cairo text-emerald-300 flex items-center gap-1 mt-1">
              <CloudRain className="w-3.5 h-3.5 text-cyan-400" /> زخات مطر خفيفة
            </span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
        <button
          onClick={handleHarvest}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-dark-950 font-black font-cairo text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>حصاد وتوريد فوري (+كاش)</span>
        </button>

        <button
          onClick={handleIrrigate}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-cyan-300 border border-cyan-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-cyan-500/10"
        >
          <Droplets className="w-4 h-4" />
          <span>تشغيل شبكة الري الذاتي</span>
        </button>

        <button
          onClick={handleFertilize}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-emerald-300 border border-emerald-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/10"
        >
          <Sprout className="w-4 h-4" />
          <span>حقن التربة بالأسمدة ($120)</span>
        </button>
      </div>
    </div>
  );
};
