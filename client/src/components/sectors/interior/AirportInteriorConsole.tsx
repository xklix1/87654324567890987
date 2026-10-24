import React, { useState, useEffect } from 'react';
import { GameAudio } from '../../../utils/audio';
import { useFloatingVfx } from '../../../context/FloatingVfxContext';
import {
  Plane,
  Radar,
  Fuel,
  Wind,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface AirportInteriorConsoleProps {
  onBalanceUpdate?: (delta: number) => void;
}

export const AirportInteriorConsole: React.FC<AirportInteriorConsoleProps> = ({ onBalanceUpdate }) => {
  const { spawnMoneyFloat, spawnTextFloat } = useFloatingVfx();

  const [fuelLevel, setFuelLevel] = useState<number>(84); // %
  const [radarAngle, setRadarAngle] = useState<number>(0);
  const [flightsHandled, setFlightsHandled] = useState<number>(38);
  const activeFlights = [
    { id: '1', callsign: 'VIP-770', altitude: '28,000 ft', eta: '04 Min', x: 35, y: 40 },
    { id: '2', callsign: 'GLX-204', altitude: '14,000 ft', eta: '11 Min', x: 70, y: 25 },
    { id: '3', callsign: 'CARGO-9', altitude: '34,000 ft', eta: '22 Min', x: 60, y: 75 },
  ];

  // Sweeping Radar rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setRadarAngle((prev) => (prev + 3) % 360);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  // Action: Dispatch VIP Flight
  const handleDispatchVip = (e: React.MouseEvent) => {
    if (fuelLevel < 15) {
      GameAudio.playAlarmSound();
      spawnTextFloat('تحذير: وقود الطائرات منخفض جداً! قم بإعادة التزويد', false, e.clientX, e.clientY);
      return;
    }

    GameAudio.playRadarPing();
    const payout = Math.floor(320 + Math.random() * 200);
    setFuelLevel((f) => Math.max(0, f - 12));
    setFlightsHandled((f) => f + 1);

    spawnMoneyFloat(payout, e.clientX, e.clientY);
    spawnTextFloat('تم إقلاع رحلة VIP بنجاح (المدرج 09L)', true, e.clientX, e.clientY - 25);

    if (onBalanceUpdate) {
      onBalanceUpdate(payout);
    }
  };

  // Action: Refuel Jet-A1 Reserves
  const handleRefuel = (e: React.MouseEvent) => {
    const cost = 200;
    GameAudio.playTurbineBoost();
    setFuelLevel(100);
    spawnTextFloat('تمت تعبئة صهاريج وقود الطائرات بالكامل', true, e.clientX, e.clientY);
    spawnMoneyFloat(-cost, e.clientX, e.clientY + 20);

    if (onBalanceUpdate) {
      onBalanceUpdate(-cost);
    }
  };

  // Action: Sweep Air Traffic Radar
  const handleSweepRadar = (e: React.MouseEvent) => {
    GameAudio.playRadarPing();
    spawnTextFloat('مسح راداري نشط: الأجواء خالية ومهيأة للإقلاع', true, e.clientX, e.clientY);
  };

  return (
    <div className="rounded-3xl p-4 sm:p-5 border border-sky-500/30 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 relative overflow-hidden shadow-2xl">
      {/* Ambient Airport Aviation Blue Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-48 rounded-full blur-3xl pointer-events-none bg-sky-500/15" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-cairo">
                برج المراقبة الجوية ورادار المطار
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-cairo font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                المدرج 09L نشط
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-cairo">
              محاكاة الملاحة الرادارية الحية، إدارة مدارج الإقلاع، وحساب احتياطات وقود الطيران
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-900 border border-sky-500/30 text-sky-300 text-xs font-cairo">
            <Wind className="w-3.5 h-3.5" /> 14 عقدة شمال غرب
          </span>
        </div>
      </div>

      {/* Radar Sweep & Aviation Screen */}
      <div className="my-4 p-4 rounded-2xl bg-dark-950/90 border border-dark-800 relative overflow-hidden flex flex-col md:flex-row items-center gap-5">
        {/* Circular Radar Screen */}
        <div className="relative w-44 h-44 rounded-full border-2 border-emerald-500/40 bg-emerald-950/20 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
          {/* Radar Circles */}
          <div className="absolute inset-3 rounded-full border border-emerald-500/20" />
          <div className="absolute inset-8 rounded-full border border-emerald-500/20" />
          <div className="absolute inset-14 rounded-full border border-emerald-500/30" />
          {/* Crosshairs */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-emerald-500/30" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-emerald-500/30" />

          {/* Sweeping Beam */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `conic-gradient(from ${radarAngle}deg, rgba(16, 185, 129, 0.4) 0deg, rgba(16, 185, 129, 0) 50deg)`,
            }}
          />

          {/* Radar Aircraft Blips */}
          {activeFlights.map((f) => (
            <div
              key={f.id}
              className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"
              style={{ left: `${f.x}%`, top: `${f.y}%` }}
            />
          ))}

          {/* Center Station */}
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 z-10" />
        </div>

        {/* Live Flight Schedule Manifest */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex items-center justify-between text-xs font-cairo text-slate-400 pb-1 border-b border-dark-800">
            <span>رحلات المجال الجوي اللحظية</span>
            <span className="text-sky-400 font-bold font-cairo">بث راداري مباشر</span>
          </div>

          <div className="space-y-1.5">
            {activeFlights.map((flight) => (
              <div
                key={flight.id}
                className="flex items-center justify-between p-2 rounded-xl bg-dark-900 border border-slate-800 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <Plane className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-bold text-slate-200">{flight.callsign}</span>
                  <span className="text-[10px] text-slate-500">{flight.altitude}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-cairo">
                    الوصول: {flight.eta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
          <span className="text-[10px] text-slate-400 font-cairo block">مخزون وقود الطائرات</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-black font-mono text-sky-300">{fuelLevel}%</span>
            <span className="text-[10px] text-slate-500 font-cairo">وقود كيروسين</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
          <span className="text-[10px] text-slate-400 font-cairo block">رحلات منجزة</span>
          <span className="text-base font-black font-mono text-emerald-400">+{flightsHandled}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
          <span className="text-[10px] text-slate-400 font-cairo block">حالة الطقس الملاحي</span>
          <span className="text-xs font-bold font-cairo text-emerald-300 flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> رؤية ممتازة CAT-I
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800">
          <span className="text-[10px] text-slate-400 font-cairo block">المدرج الرئيسي</span>
          <span className="text-xs font-bold font-cairo text-slate-200 block mt-1">09L / 27R نشط</span>
        </div>
      </div>

      {/* Control Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
        <button
          onClick={handleDispatchVip}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-dark-950 font-black font-cairo text-xs transition-all shadow-lg shadow-sky-500/20 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>إطلاق رحلة VIP فورية (+كاش)</span>
        </button>

        <button
          onClick={handleRefuel}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-sky-300 border border-sky-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-sky-500/10"
        >
          <Fuel className="w-4 h-4" />
          <span>تزويد الوقود ($200)</span>
        </button>

        <button
          onClick={handleSweepRadar}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-dark-900 hover:bg-dark-850 text-emerald-300 border border-emerald-500/40 font-bold font-cairo text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/10"
        >
          <Radar className="w-4 h-4" />
          <span>فحص راداري للأجواء</span>
        </button>
      </div>
    </div>
  );
};
