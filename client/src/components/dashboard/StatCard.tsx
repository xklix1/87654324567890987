import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'emerald' | 'gold' | 'cyan' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'neutral',
}) => {
  const borderStyles = {
    emerald: 'border-emerald-500/30 hover:border-emerald-500/50 shadow-emerald-glow',
    gold: 'border-amber-500/30 hover:border-amber-500/50 shadow-gold-glow',
    cyan: 'border-cyan-500/30 hover:border-cyan-500/50 shadow-cyan-glow',
    neutral: 'border-dark-800 hover:border-dark-700',
  }[variant];

  const textStyles = {
    emerald: 'text-emerald-400',
    gold: 'text-amber-400',
    cyan: 'text-cyan-400',
    neutral: 'text-slate-100',
  }[variant];

  return (
    <div
      className={`glass-panel p-5 rounded-2xl border transition-all duration-200 ${borderStyles}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-400 tracking-wider">
          {title}
        </span>
        <div className="p-2 rounded-xl bg-dark-950/70 border border-dark-800 text-slate-300">
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-black font-mono tracking-tight ${textStyles}`}>
        {value}
      </div>
      {subtitle && (
        <p className="text-[11px] font-medium text-slate-400 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};
