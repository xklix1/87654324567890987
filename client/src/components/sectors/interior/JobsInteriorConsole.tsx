import React, { useState } from 'react';
import { GameAudio } from '../../../utils/audio';
import { useFloatingVfx } from '../../../context/FloatingVfxContext';
import {
  Briefcase,
  Users,
  Award,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface JobsInteriorConsoleProps {
  onBalanceUpdate?: (delta: number) => void;
}

export const JobsInteriorConsole: React.FC<JobsInteriorConsoleProps> = ({ onBalanceUpdate }) => {
  const { spawnMoneyFloat, spawnTextFloat } = useFloatingVfx();

  const [prestige, setPrestige] = useState<number>(88); // %
  const [boardConfidence, setBoardConfidence] = useState<number>(94); // %
  const [executiveBonusCycle, setExecutiveBonusCycle] = useState<number>(14);

  // Action: Executive Performance Bonus
  const handleExecutiveBonus = (e: React.MouseEvent) => {
    GameAudio.playCoinSound();
    const payout = Math.floor(310 + Math.random() * 210);
    setExecutiveBonusCycle((b) => b + 1);

    spawnMoneyFloat(payout, e.clientX, e.clientY);
    spawnTextFloat('تم صرف مكافأة مجلس الإدارة والأداء الاستثنائي (+كاش)', true, e.clientX, e.clientY - 25);

    if (onBalanceUpdate) {
      onBalanceUpdate(payout);
    }
  };

  // Action: Press Conference
  const handlePressConference = (e: React.MouseEvent) => {
    GameAudio.playTurbineBoost();
    setPrestige(100);
    setBoardConfidence(100);
    spawnTextFloat('مؤتمر صحفي ناجح: ارتفعت السمعة الاستثمارية للشركة إلى 100%', true, e.clientX, e.clientY);
  };

  // Action: Security & Espionage Defense
  const handleCyberDefense = (e: React.MouseEvent) => {
    const cost = 160;
    GameAudio.playMachinerySound();
    spawnTextFloat('تم تفعيل جدار الحماية ضد التجسس التجاري والمصرفي', true, e.clientX, e.clientY);
    spawnMoneyFloat(-cost, e.clientX, e.clientY + 20);

    if (onBalanceUpdate) {
      onBalanceUpdate(-cost);
    }
  };

  return (
    <div className="rounded-3xl p-4 sm:p-5 border border-pink-500/30 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 relative overflow-hidden shadow-2xl">
      {/* Ambient Executive Pink Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-48 rounded-full blur-3xl pointer-events-none bg-pink-500/15" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center font-bold">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-cairo">
                جناح الإدارة العامة ومجلس الإدارة
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                مجلس الإدارة المؤسسي
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              محاكاة قرارات الجمعية العمومية، إدارة السمعة المؤسسية، ومكافآت كبار المسؤولين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-900 border border-pink-500/30 text-pink-300 text-xs font-mono">
            <Award className="w-3.5 h-3.5" /> مكانة الشركات العالمية الكبرى
          </span>
        </div>
      </div>

      {/* Boardroom Schematic Stage */}
      <div className="my-4 p-4 rounded-2xl bg-dark-950/90 border border-dark-800 relative overflow-hidden flex flex-col sm:flex-row items-center gap-5">
        <div className="w-40 h-24 rounded-2xl bg-gradient-to-r from-dark-900 via-pink-950/20 to-dark-900 border border-pink-500/30 p-3 flex flex-col items-center justify-center shrink-0 relative">
          <div className="w-24 h-10 rounded-full border border-pink-500/40 bg-pink-500/10 flex items-center justify-center">
            <span className="text-[10px] font-mono font-bold text-pink-300">مقعد القيادة التنفيذية</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            {[1, 2, 3, 4].map((seat) => (
              <div key={seat} className="w-2 h-2 rounded-full bg-pink-400/80 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">السمعة المؤسسية</span>
            <span className="text-base font-black font-mono text-pink-300">{prestige}% فئة أولى</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">ثقة مجلس الإدارة</span>
            <span className="text-base font-black font-mono text-emerald-400">{boardConfidence}% تأييد</span>
          </div>

          <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
            <span className="text-[10px] text-slate-400 font-cairo block">دورات المكافأة المنفذة</span>
            <span className="text-base font-black font-mono text-slate-100">+{executiveBonusCycle} دورات</span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
        <button
          onClick={handleExecutiveBonus}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 text-dark-950 font-black font-cairo text-xs transition-all shadow-lg shadow-pink-500/20 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>صرف مكافأة الإدارة التنفيذية (+كاش)</span>
        </button>

        <button
          onClick={handlePressConference}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-pink-300 border border-pink-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-pink-500/10"
        >
          <Users className="w-4 h-4" />
          <span>عقد مؤتمر صحفي واستثماري</span>
        </button>

        <button
          onClick={handleCyberDefense}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-emerald-300 border border-emerald-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/10"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>حماية الأمن السيبراني للمقر ($160)</span>
        </button>
      </div>
    </div>
  );
};
