import React, { useState, useEffect } from 'react';
import { GameAudio } from '../../../utils/audio';
import { useFloatingVfx } from '../../../context/FloatingVfxContext';
import {
  Car,
  Flame,
  Award,
  Sparkles,
} from 'lucide-react';

interface DealershipInteriorConsoleProps {
  onBalanceUpdate?: (delta: number) => void;
}

export const DealershipInteriorConsole: React.FC<DealershipInteriorConsoleProps> = ({ onBalanceUpdate }) => {
  const { spawnMoneyFloat, spawnTextFloat } = useFloatingVfx();

  const [turntableAngle, setTurntableAngle] = useState<number>(0);
  const [horsepower, setHorsepower] = useState<number>(840); // BHP
  const [boostPsi, setBoostPsi] = useState<number>(18.5); // PSI
  const [vipInterest, setVipInterest] = useState<number>(94); // %
  const [carsSold, setCarsSold] = useState<number>(27);

  // Turntable rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setTurntableAngle((prev) => (prev + 2) % 360);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Action: VIP Test Drive
  const handleTestDrive = (e: React.MouseEvent) => {
    GameAudio.playMachinerySound();
    const commission = Math.floor(350 + Math.random() * 250);
    setCarsSold((s) => s + 1);
    setHorsepower((h) => (h === 840 ? 910 : 840));

    spawnMoneyFloat(commission, e.clientX, e.clientY);
    spawnTextFloat('تم توقيع عقد بيع سيارة خارقة مع عميل VIP (+عمولة)', true, e.clientX, e.clientY - 25);

    if (onBalanceUpdate) {
      onBalanceUpdate(commission);
    }
  };

  // Action: Dyno Tune & Polish
  const handleDynoTune = (e: React.MouseEvent) => {
    GameAudio.playTurbineBoost();
    setBoostPsi(24.2);
    setVipInterest(100);
    spawnTextFloat('تم تعديل المحرك وتلميع الهيكل بأعلى معايير الـ Dyno', true, e.clientX, e.clientY);
  };

  // Action: Exotic Car Auction Bid
  const handleAuction = (e: React.MouseEvent) => {
    const cost = 300;
    GameAudio.playCoinSound();
    spawnTextFloat('تم الفوز بمزايدة حصرية لسيارة نادرة الإصدار', true, e.clientX, e.clientY);
    spawnMoneyFloat(-cost, e.clientX, e.clientY + 20);

    if (onBalanceUpdate) {
      onBalanceUpdate(-cost);
    }
  };

  return (
    <div className="rounded-3xl p-4 sm:p-5 border border-amber-500/30 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 relative overflow-hidden shadow-2xl">
      {/* Ambient Luxury Gold Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-48 rounded-full blur-3xl pointer-events-none bg-amber-500/15" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-cairo">
                صالة عرض السيارات الفاخرة والداينو
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-cairo font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                خدمة كبار الشخصيات نشطة
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-cairo">
              محاكاة منصة العرض الدوارة، اختبارات أحصنة المحرك (Dyno)، ومبيعات النخبة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-900 border border-amber-500/30 text-amber-300 text-xs font-cairo">
            <Award className="w-3.5 h-3.5" /> سيارات خارقة فئة أ
          </span>
        </div>
      </div>

      {/* Rotating Luxury Turntable Stage */}
      <div className="my-4 p-4 rounded-2xl bg-dark-950/90 border border-dark-800 relative overflow-hidden flex flex-col items-center justify-center">
        {/* Spotlight Beam */}
        <div className="absolute top-0 w-32 h-20 bg-amber-400/10 blur-xl pointer-events-none" />

        {/* 3D Turntable Platform */}
        <div className="relative w-48 h-20 rounded-[100%] border-2 border-amber-500/50 bg-gradient-to-b from-dark-900 to-dark-950 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          {/* Turntable ring notches */}
          <div
            className="absolute inset-1 rounded-[100%] border border-dashed border-amber-500/30 pointer-events-none"
            style={{ transform: `rotate(${turntableAngle}deg)` }}
          />

          {/* Supercar Icon / Silhouette */}
          <div className="relative -mt-4 flex flex-col items-center">
            <Car className="w-14 h-14 text-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.6)]" />
            <span className="text-[10px] font-cairo font-bold text-amber-200 bg-dark-950/80 px-2 py-0.5 rounded border border-amber-500/30">
              فيراري SF90 سترادالي
            </span>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 w-full pt-3 border-t border-dark-800">
          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">قوة المحرك (Dyno)</span>
            <span className="text-base font-black font-mono text-amber-300">{horsepower} حصان</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">ضغط التيربو المزدوج</span>
            <span className="text-base font-black font-mono text-slate-100">{boostPsi} رطل/بوصة²</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">إقبال كبار المشترين VIP</span>
            <span className="text-base font-black font-mono text-emerald-400">{vipInterest}% مرتفع</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">مبيعات الصالة</span>
            <span className="text-base font-black font-mono text-slate-100">+{carsSold} سيارة</span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
        <button
          onClick={handleTestDrive}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-black font-cairo text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>جولة تجريبية VIP (+عمولة بيع)</span>
        </button>

        <button
          onClick={handleDynoTune}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-amber-300 border border-amber-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-amber-500/10"
        >
          <Flame className="w-4 h-4" />
          <span>ضبط محرك الداينو والتلميع</span>
        </button>

        <button
          onClick={handleAuction}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-emerald-300 border border-emerald-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/10"
        >
          <Award className="w-4 h-4" />
          <span>مزايدة حصرية لسيارة نادرة ($300)</span>
        </button>
      </div>
    </div>
  );
};
