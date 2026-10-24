import React, { useState, useEffect } from 'react';
import { GameAudio } from '../../../utils/audio';
import { useFloatingVfx } from '../../../context/FloatingVfxContext';
import {
  Building2,
  Key,
  Sparkles,
  Layers,
  Zap,
} from 'lucide-react';

interface RealEstateInteriorConsoleProps {
  onBalanceUpdate?: (delta: number) => void;
}

export const RealEstateInteriorConsole: React.FC<RealEstateInteriorConsoleProps> = ({ onBalanceUpdate }) => {
  const { spawnMoneyFloat, spawnTextFloat } = useFloatingVfx();

  const [occupancy, setOccupancy] = useState<number>(96); // %
  const [elevatorFloor, setElevatorFloor] = useState<number>(24);
  const [tenantHappiness, setTenantHappiness] = useState<number>(92); // %
  const [rentCollectedTotal, setRentCollectedTotal] = useState<number>(45000);

  // Moving elevator animation
  useEffect(() => {
    const timer = setInterval(() => {
      setElevatorFloor((prev) => (prev >= 45 ? 1 : prev + 3));
    }, 700);
    return () => clearInterval(timer);
  }, []);

  // Action: Collect Fast Rent
  const handleCollectRent = (e: React.MouseEvent) => {
    GameAudio.playCoinSound();
    const payout = Math.floor(290 + Math.random() * 190);
    setRentCollectedTotal((r) => r + payout);

    spawnMoneyFloat(payout, e.clientX, e.clientY);
    spawnTextFloat('تم تحصيل عوائد إيجارات الأبراج السكنية والتجارية (+كاش)', true, e.clientX, e.clientY - 25);

    if (onBalanceUpdate) {
      onBalanceUpdate(payout);
    }
  };

  // Action: Renovate Penthouse Suites
  const handleRenovate = (e: React.MouseEvent) => {
    const cost = 220;
    GameAudio.playMachinerySound();
    setTenantHappiness(100);
    setOccupancy(100);

    spawnTextFloat('تم تجديد أجنحة البنتهاوس بالكامل (إشغال ورضا 100%)', true, e.clientX, e.clientY);
    spawnMoneyFloat(-cost, e.clientX, e.clientY + 20);

    if (onBalanceUpdate) {
      onBalanceUpdate(-cost);
    }
  };

  // Action: Smart Energy HVAC Optimization
  const handleHvacUpgrade = (e: React.MouseEvent) => {
    GameAudio.playTurbineBoost();
    spawnTextFloat('تمت أتمتة شبكة التكييف الذكية (توفير 15% من فاتورة الطاقة)', true, e.clientX, e.clientY);
  };

  return (
    <div className="rounded-3xl p-4 sm:p-5 border border-cyan-500/30 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 relative overflow-hidden shadow-2xl">
      {/* Ambient Real Estate Blue Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-48 rounded-full blur-3xl pointer-events-none bg-cyan-500/15" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-cairo">
                غرفة إدارة الأبراج والمحافظ العقارية
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-cairo font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                برج البنتهاوس 45 طابق
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-cairo">
              محاكاة حركة المصاعد الذكية، إشغال الوحدات السكنية، ومؤشرات العائد الإيجاري
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-900 border border-cyan-500/30 text-cyan-300 text-xs font-cairo">
            <Key className="w-3.5 h-3.5" /> 96% نسبة الإشغال
          </span>
        </div>
      </div>

      {/* Skyscraper Blueprint Simulation Stage */}
      <div className="my-4 p-4 rounded-2xl bg-dark-950/90 border border-dark-800 relative overflow-hidden flex flex-col sm:flex-row items-center gap-5">
        {/* Skyscraper Elevation Schematic */}
        <div className="w-28 h-32 rounded-xl bg-gradient-to-t from-dark-900 to-dark-950 border border-cyan-500/40 p-2 flex flex-col justify-between shrink-0 relative overflow-hidden">
          {/* Lighted Windows Grid */}
          <div className="grid grid-cols-4 gap-1 opacity-70">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-2 rounded-xs bg-cyan-400/50 shadow-[0_0_4px_#22d3ee]" />
            ))}
          </div>

          {/* Elevator Shaft & Indicator */}
          <div className="absolute right-2 inset-y-2 w-3 rounded bg-dark-900 border border-cyan-500/30 flex flex-col justify-end">
            <div
              className="w-full h-3 rounded bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-all duration-300"
              style={{ marginBottom: `${(elevatorFloor / 45) * 80}%` }}
            />
          </div>

          <span className="text-[9px] font-cairo text-cyan-300 font-bold bg-dark-950/80 px-1 py-0.5 rounded border border-cyan-500/20 text-center">
            طابق #{elevatorFloor}
          </span>
        </div>

        {/* Telemetry Stats */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">نسبة الإشغال الإجمالية</span>
            <span className="text-base font-black font-mono text-cyan-300">{occupancy}% مكتمل</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">مؤشر رضا المستأجرين</span>
            <span className="text-base font-black font-mono text-emerald-400">{tenantHappiness}% ممتاز</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">إجمالي الإيجارات المحصلة</span>
            <span className="text-base font-black font-mono text-slate-100">${rentCollectedTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
        <button
          onClick={handleCollectRent}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-dark-950 font-black font-cairo text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>تحصيل عوائد الإيجار الفورية (+كاش)</span>
        </button>

        <button
          onClick={handleRenovate}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-cyan-300 border border-cyan-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-cyan-500/10"
        >
          <Layers className="w-4 h-4" />
          <span>تجديد وتحديث الأجنحة ($220)</span>
        </button>

        <button
          onClick={handleHvacUpgrade}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-emerald-300 border border-emerald-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/10"
        >
          <Zap className="w-4 h-4" />
          <span>أتمتة الطاقة الذكية للبرج</span>
        </button>
      </div>
    </div>
  );
};
