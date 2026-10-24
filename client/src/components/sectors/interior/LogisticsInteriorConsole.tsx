import React, { useState, useEffect } from 'react';
import { GameAudio } from '../../../utils/audio';
import { useFloatingVfx } from '../../../context/FloatingVfxContext';
import {
  Ship,
  Anchor,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface LogisticsInteriorConsoleProps {
  onBalanceUpdate?: (delta: number) => void;
}

export const LogisticsInteriorConsole: React.FC<LogisticsInteriorConsoleProps> = ({ onBalanceUpdate }) => {
  const { spawnMoneyFloat, spawnTextFloat } = useFloatingVfx();

  const [containersOffloaded, setContainersOffloaded] = useState<number>(1240);
  const [craneX, setCraneX] = useState<number>(30); // % horizontal
  const [craneHoisting, setCraneHoisting] = useState<boolean>(false);
  const [vesselCapacity, setVesselCapacity] = useState<number>(85); // %
  const [customsCleared, setCustomsCleared] = useState<number>(98); // %

  // Crane motion animation
  useEffect(() => {
    const timer = setInterval(() => {
      setCraneX((prev) => (prev >= 75 ? 25 : prev + 5));
    }, 400);
    return () => clearInterval(timer);
  }, []);

  // Action: Fast-Track Offload
  const handleOffload = (e: React.MouseEvent) => {
    setCraneHoisting(true);
    GameAudio.playMachinerySound();

    const payout = Math.floor(260 + Math.random() * 180);
    setContainersOffloaded((c) => c + 4);
    setVesselCapacity((v) => Math.max(10, v - 5));

    spawnMoneyFloat(payout, e.clientX, e.clientY);
    spawnTextFloat('تم تفريغ 4 حاويات TEU وشحنها للأسطول البري', true, e.clientX, e.clientY - 25);

    if (onBalanceUpdate) {
      onBalanceUpdate(payout);
    }

    setTimeout(() => {
      setCraneHoisting(false);
    }, 600);
  };

  // Action: Fast-Pass Customs
  const handleCustomsPass = (e: React.MouseEvent) => {
    GameAudio.playTurbineBoost();
    setCustomsCleared(100);
    spawnTextFloat('تم اعتماد الفحص الجمركي الذكي 100% بنجاح', true, e.clientX, e.clientY);
  };

  // Action: Maritime Insurance
  const handleInsurance = (e: React.MouseEvent) => {
    const cost = 150;
    GameAudio.playCoinSound();
    spawnTextFloat('تم تأمين كافة شحنات الميناء ضد أخطار الملاحة', true, e.clientX, e.clientY);
    spawnMoneyFloat(-cost, e.clientX, e.clientY + 20);

    if (onBalanceUpdate) {
      onBalanceUpdate(-cost);
    }
  };

  return (
    <div className="rounded-3xl p-4 sm:p-5 border border-cyan-500/30 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 relative overflow-hidden shadow-2xl">
      {/* Ambient Maritime Cyan Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-48 rounded-full blur-3xl pointer-events-none bg-cyan-500/15" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-cairo">
                غرفة التحكم اللوجستي ومحطة الحاويات
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-cairo font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                رافعة الرصيف #02 نشطة
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-cairo">
              محاكاة لحظية لرافعات الرصيف العملاقة، غاطس السفن، وتخليص البيانات الجمركية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-900 border border-cyan-500/30 text-cyan-300 text-xs font-cairo">
            <Ship className="w-3.5 h-3.5" /> السفينة راسية بالرصيف
          </span>
        </div>
      </div>

      {/* Visual Crane & Dock Simulation */}
      <div className="my-4 p-4 rounded-2xl bg-dark-950/90 border border-dark-800 relative overflow-hidden">
        {/* Animated Gantry Crane System */}
        <div className="h-28 relative border-b-2 border-slate-700 overflow-hidden flex flex-col justify-end">
          {/* Crane Rail */}
          <div className="absolute top-2 inset-x-0 h-2 bg-slate-700 border-b border-slate-500" />

          {/* Moving Crane Trolley */}
          <div
            className="absolute top-0 flex flex-col items-center transition-all duration-300"
            style={{ left: `${craneX}%` }}
          >
            <div className="w-8 h-4 rounded bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
            <div className={`w-0.5 ${craneHoisting ? 'h-6' : 'h-12'} bg-slate-300 transition-all`} />
            <div className="w-8 h-5 rounded-sm bg-gradient-to-r from-cyan-600 to-cyan-800 border border-cyan-400 flex items-center justify-center text-[8px] font-mono text-cyan-100 font-bold">
              حاوية
            </div>
          </div>

          {/* Stacks of containers on the quay */}
          <div className="flex items-end gap-2 px-4 pb-1">
            <div className="flex flex-col gap-0.5">
              <div className="w-10 h-4 bg-amber-600 rounded-sm border border-amber-400" />
              <div className="w-10 h-4 bg-sky-600 rounded-sm border border-sky-400" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="w-10 h-4 bg-emerald-600 rounded-sm border border-emerald-400" />
              <div className="w-10 h-4 bg-rose-600 rounded-sm border border-rose-400" />
              <div className="w-10 h-4 bg-purple-600 rounded-sm border border-purple-400" />
            </div>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">حاويات مفرغة</span>
            <span className="text-base font-black font-mono text-cyan-300">+{containersOffloaded} حاوية</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">حمولة السفينة الحالية</span>
            <span className="text-base font-black font-mono text-slate-100">{vesselCapacity}% غاطس</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">التخليص الجمركي</span>
            <span className="text-base font-black font-mono text-emerald-400">{customsCleared}% معتمد</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">حالة الطقس البحري</span>
            <span className="text-xs font-bold font-cairo text-emerald-300 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 1.1م أمواج هادئة
            </span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
        <button
          onClick={handleOffload}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-dark-950 font-black font-cairo text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>تفريغ شحنة مستعجلة (+كاش)</span>
        </button>

        <button
          onClick={handleCustomsPass}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-cyan-300 border border-cyan-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-cyan-500/10"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>تخليص جمركي ذكي سريع</span>
        </button>

        <button
          onClick={handleInsurance}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-emerald-300 border border-emerald-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/10"
        >
          <Anchor className="w-4 h-4" />
          <span>تأمين الشحن البحري ($150)</span>
        </button>
      </div>
    </div>
  );
};
