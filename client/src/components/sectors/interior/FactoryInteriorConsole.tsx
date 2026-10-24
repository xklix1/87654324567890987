import React, { useState, useEffect } from 'react';
import { GameAudio } from '../../../utils/audio';
import { useFloatingVfx } from '../../../context/FloatingVfxContext';
import {
  Wrench,
  Flame,
  Activity,
  Zap,
  RotateCcw,
  AlertTriangle,
  Cog,
  Gauge,
  Box,
} from 'lucide-react';

interface FactoryInteriorConsoleProps {
  onBalanceUpdate?: (delta: number) => void;
}

export const FactoryInteriorConsole: React.FC<FactoryInteriorConsoleProps> = ({ onBalanceUpdate }) => {
  const { spawnMoneyFloat, spawnTextFloat } = useFloatingVfx();

  // Realistic Machine Operations State
  const [temperature, setTemperature] = useState<number>(64); // °C (Normal: 50-80, Hot: 80-95, Overheat: 95+)
  const [wearTear, setWearTear] = useState<number>(18); // %
  const [rpm, setRpm] = useState<number>(2400); // Assembly RPM
  const [unitsProduced, setUnitsProduced] = useState<number>(142);
  const [isAssembling, setIsAssembling] = useState<boolean>(false);
  const [conveyorOffset, setConveyorOffset] = useState<number>(0);
  const [sparking, setSparking] = useState<boolean>(false);

  // Background conveyor belt movement & gentle thermal dissipation
  useEffect(() => {
    const timer = setInterval(() => {
      setConveyorOffset((prev) => (prev + 4) % 40);
      setTemperature((prev) => (prev > 55 ? prev - 0.2 : 55));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Periodic automatic production cycle
  useEffect(() => {
    const cycle = setInterval(() => {
      if (wearTear < 95 && temperature < 100) {
        setUnitsProduced((p) => p + 1);
        setWearTear((w) => Math.min(100, +(w + 0.3).toFixed(1)));
        setTemperature((t) => Math.min(105, +(t + 0.4).toFixed(1)));
      }
    }, 3500);
    return () => clearInterval(cycle);
  }, [wearTear, temperature]);

  // Action: Turbo Industrial Assembly Cycle
  const handleTurboCycle = (e: React.MouseEvent) => {
    if (wearTear >= 90) {
      GameAudio.playAlarmSound();
      spawnTextFloat('تحذير: الآلات بحاجة لصيانة فورية لتفادي الانهيار!', false, e.clientX, e.clientY);
      return;
    }
    if (temperature >= 95) {
      GameAudio.playAlarmSound();
      spawnTextFloat('خطر: حرارة المحركات مرتفعة جداً!', false, e.clientX, e.clientY);
      return;
    }

    setIsAssembling(true);
    setSparking(true);
    GameAudio.playMachinerySound();

    const payout = Math.floor(180 + Math.random() * 120);
    setUnitsProduced((u) => u + 3);
    setTemperature((t) => Math.min(105, t + 6));
    setWearTear((w) => Math.min(100, +(w + 3.5).toFixed(1)));
    setRpm((r) => Math.min(4200, r + 400));

    spawnMoneyFloat(payout, e.clientX, e.clientY);
    if (onBalanceUpdate) {
      onBalanceUpdate(payout);
    }

    setTimeout(() => {
      setIsAssembling(false);
      setSparking(false);
      setRpm(2400);
    }, 800);
  };

  // Action: Nitrogen Emergency Coolant
  const handleCoolant = (e: React.MouseEvent) => {
    GameAudio.playTurbineBoost();
    setTemperature(48);
    spawnTextFloat('تم تفعيل التبريد بالنيتروجين: -' + Math.round(temperature - 48) + '°C', true, e.clientX, e.clientY);
  };

  // Action: Preventive Hydraulic Maintenance
  const handleMaintenance = (e: React.MouseEvent) => {
    const maintenanceCost = 250;
    GameAudio.playMachinerySound();
    setWearTear(0);
    spawnTextFloat('تمت الصيانة الهيدروليكية الشاملة (كفاءة 100%)', true, e.clientX, e.clientY);
    spawnMoneyFloat(-maintenanceCost, e.clientX, e.clientY + 20);
    if (onBalanceUpdate) {
      onBalanceUpdate(-maintenanceCost);
    }
  };

  const isOverheating = temperature >= 85;
  const isHighWear = wearTear >= 75;

  return (
    <div className="rounded-3xl p-4 sm:p-5 border border-amber-500/30 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 relative overflow-hidden shadow-2xl">
      {/* Ambient Industrial Heat Glow */}
      <div
        className={`absolute top-0 right-1/4 w-96 h-48 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 ${
          isOverheating ? 'bg-rose-500/25 opacity-100' : 'bg-amber-500/10 opacity-70'
        }`}
      />

      {/* Header Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
            <Cog className={`w-4 h-4 ${isAssembling ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-cairo">
                غرفة العمليات وخط التجميع الصناعي
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-cairo font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                خط الإنتاج #04 نشط
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-cairo">
              محاكاة لحظية لميكانيكا الآلات الثقيلة، دورات الاحتراق، وتدفق المواد الخام
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-2">
          {isOverheating && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold animate-pulse">
              <Flame className="w-3.5 h-3.5" /> تحذير حراري!
            </span>
          )}
          {isHighWear && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> بحاجة لصيانة
            </span>
          )}
        </div>
      </div>

      {/* Main Interactive Visual Interior Stage */}
      <div className="my-4 p-4 rounded-2xl bg-dark-950/90 border border-dark-800 relative overflow-hidden">
        {/* Conveyor Belt System with Animated Cargo */}
        <div className="relative h-24 flex items-center justify-center overflow-hidden">
          {/* Conveyor track */}
          <div
            className="absolute inset-x-0 h-10 bg-slate-900 border-y-2 border-slate-700/80 flex items-center"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 15px, #334155 15px, #334155 30px)',
              backgroundPosition: `${conveyorOffset}px 0`,
            }}
          >
            {/* Cargo Units riding the conveyor */}
            <div className="w-full flex items-center justify-around px-4 pointer-events-none">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="w-10 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 border border-amber-400/50 shadow-lg flex items-center justify-center text-amber-100 font-mono text-[10px] font-bold"
                >
                  <Box className="w-4 h-4 text-amber-200" />
                </div>
              ))}
            </div>
          </div>

          {/* Robotic Welder Arm (SVG) */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
            <div className="w-16 h-2 bg-slate-600 rounded-full" />
            <div className="w-3 h-8 bg-slate-500 border border-slate-400" />
            <div className={`w-2 h-4 ${sparking ? 'bg-cyan-300 shadow-[0_0_15px_#22d3ee]' : 'bg-slate-400'}`} />
            {sparking && (
              <div className="w-6 h-6 rounded-full bg-cyan-400/80 blur-sm animate-ping -mt-2" />
            )}
          </div>
        </div>

        {/* Live Gauges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-dark-800/80">
          {/* Gauge 1: Temperature */}
          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="font-cairo flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400" /> حرارة المحرك
              </span>
              <span className="font-mono font-bold text-slate-200">{temperature.toFixed(0)}°C</span>
            </div>
            <div className="w-full bg-dark-950 h-2 rounded-full overflow-hidden p-0.5 border border-dark-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  temperature > 85 ? 'bg-rose-500' : temperature > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (temperature / 110) * 100)}%` }}
              />
            </div>
          </div>

          {/* Gauge 2: Wear & Tear */}
          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="font-cairo flex items-center gap-1">
                <Gauge className="w-3 h-3 text-amber-400" /> نسبة الاهتلاك
              </span>
              <span className="font-mono font-bold text-slate-200">{wearTear.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-dark-950 h-2 rounded-full overflow-hidden p-0.5 border border-dark-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  wearTear > 75 ? 'bg-rose-500' : wearTear > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${wearTear}%` }}
              />
            </div>
          </div>

          {/* Gauge 3: Motor RPM */}
          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="font-cairo flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" /> سرعة الدوران
              </span>
              <span className="font-mono font-bold text-slate-200">{rpm} RPM</span>
            </div>
            <div className="w-full bg-dark-950 h-2 rounded-full overflow-hidden p-0.5 border border-dark-800">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${(rpm / 4500) * 100}%` }}
              />
            </div>
          </div>

          {/* Gauge 4: Total Units Assembled */}
          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="font-cairo flex items-center gap-1">
                <Box className="w-3 h-3 text-emerald-400" /> وحدات مصنعة
              </span>
              <span className="font-mono font-bold text-emerald-400">+{unitsProduced}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">إجمالي شحنات الخط</span>
          </div>
        </div>
      </div>

      {/* Interactive Action Control Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
        <button
          onClick={handleTurboCycle}
          disabled={isAssembling || wearTear >= 95 || temperature >= 98}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-black font-cairo text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Zap className={`w-4 h-4 ${isAssembling ? 'animate-bounce' : ''}`} />
          <span>تشغيل دورة إنتاج فورية (+كاش)</span>
        </button>

        <button
          onClick={handleCoolant}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-cyan-300 border border-cyan-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-cyan-500/10"
        >
          <RotateCcw className="w-4 h-4" />
          <span>تبريد طارئ بالنيتروجين</span>
        </button>

        <button
          onClick={handleMaintenance}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-emerald-300 border border-emerald-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/10"
        >
          <Wrench className="w-4 h-4" />
          <span>صيانة هيدروليكية كاملة ($250)</span>
        </button>
      </div>
    </div>
  );
};
