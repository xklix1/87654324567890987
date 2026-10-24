import React, { useState } from 'react';
import { GameAudio } from '../../utils/audio';
import {
  Activity,
  Layers,
  Users,
  Cpu,
  TrendingUp,
  Zap,
  Award,
} from 'lucide-react';

export type SectorTabId = 'overview' | 'tactical' | 'staff' | 'rd';

export interface SectorMetric {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtext?: string;
  icon?: React.ReactNode;
}

export interface SectorStaffMember {
  id: string;
  name: string;
  role: string;
  avatarSeed?: string;
  level: number;
  salaryPerHour: number;
  bonusEffect: string;
  hired: boolean;
  hireCost: number;
}

export interface SectorTechUpgrade {
  id: string;
  title: string;
  tier: number;
  cost: number;
  effect: string;
  researched: boolean;
  category: 'efficiency' | 'automation' | 'capacity' | 'prestige';
}

interface SectorCockpitLayoutProps {
  sectorId: string;
  themeColor: string; // e.g. '#eab308' (Factory) or '#10b981' (Stocks)
  titleAr: string;
  titleEn?: string;
  statusBadge: string;
  level: number;
  tier: number;
  metrics: SectorMetric[];
  activeTab?: SectorTabId;
  onTabChange?: (tab: SectorTabId) => void;
  // Optional Live Interactive Interior Console
  interiorConsole?: React.ReactNode;
  // Tab Contents
  renderOverview: () => React.ReactNode;
  renderTactical?: () => React.ReactNode;
  renderStaff?: () => React.ReactNode;
  renderRd?: () => React.ReactNode;
}

export const SectorCockpitLayout: React.FC<SectorCockpitLayoutProps> = ({
  themeColor,
  titleAr,
  titleEn: _titleEn,
  statusBadge,
  level,
  tier,
  metrics,
  activeTab: externalTab,
  onTabChange,
  interiorConsole,
  renderOverview,
  renderTactical,
  renderStaff,
  renderRd,
}) => {
  const [internalTab, setInternalTab] = useState<SectorTabId>('overview');
  const currentTab = externalTab ?? internalTab;

  const handleTabClick = (tab: SectorTabId) => {
    GameAudio.playTapSound();
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const tabs: { id: SectorTabId; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    {
      id: 'overview',
      labelAr: 'العمليات والإنتاج',
      labelEn: 'Live Operations',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'tactical',
      labelAr: 'العقود والتسعير',
      labelEn: 'Tactical Contracts',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'staff',
      labelAr: 'إدارة الكوادر والأتمتة',
      labelEn: 'Staff & Automation',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'rd',
      labelAr: 'الأبحاث والابتكار والترقيات',
      labelEn: 'Tech Tree & R&D',
      icon: <Cpu className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Cockpit Executive Telemetry Header */}
      <div
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 border transition-all duration-300"
        style={{
          borderColor: `${themeColor}40`,
          background: `linear-gradient(135deg, ${themeColor}12 0%, rgba(15, 23, 42, 0.85) 100%)`,
        }}
      >
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-25"
          style={{ backgroundColor: themeColor }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-cairo font-bold tracking-wider uppercase border"
                style={{
                  backgroundColor: `${themeColor}20`,
                  borderColor: `${themeColor}60`,
                  color: themeColor,
                }}
              >
                {statusBadge}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-cairo text-slate-400 bg-slate-800/80 border border-slate-700/60 font-semibold">
                المستوى {level} • الفئة {tier}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-cairo tracking-wide">
              {titleAr}
            </h2>
            <p className="text-xs font-cairo text-slate-400">غرفة العمليات والقيادة الاستثمارية المتطورة</p>
          </div>

          {/* Quick Efficiency Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-dark-950/70 border border-slate-800">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: `${themeColor}25`, color: themeColor }}
              >
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-cairo block">حالة المنظومة</span>
                <span className="text-xs font-bold text-emerald-400 font-cairo">100% نشط ومتصل</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Four Live KPI Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {metrics.map((m, idx) => (
            <div
              key={idx}
              className="glass-panel rounded-2xl p-3.5 border border-slate-800/80 bg-dark-950/50 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="text-[11px] font-medium font-cairo">{m.label}</span>
                {m.icon || <TrendingUp className="w-3.5 h-3.5 opacity-60" />}
              </div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-base sm:text-lg font-black font-mono text-slate-100">
                  {m.value}
                </span>
                {m.change && (
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      m.isPositive !== false ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {m.change}
                  </span>
                )}
              </div>
              {m.subtext && (
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block truncate">
                  {m.subtext}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Live Interactive Building Interior Console */}
      {interiorConsole && (
        <div className="animate-in fade-in duration-300">
          {interiorConsole}
        </div>
      )}

      {/* 3. Modern Interactive Tab Switcher with Edge Gradients & Wheel Scrolling */}
      <div className="relative group">
        {/* Subtle Fade Masks on both sides indicating overflow */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-dark-950 via-dark-950/60 to-transparent z-10 rounded-l-2xl" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-dark-950 via-dark-950/60 to-transparent z-10 rounded-r-2xl" />

        <div
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="flex items-center gap-2 p-1.5 rounded-2xl bg-dark-950/80 border border-slate-800/90 overflow-x-auto scrollbar-none scroll-smooth select-none"
        >
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold font-cairo whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'text-dark-950 shadow-lg scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: themeColor,
                        boxShadow: `0 0 16px ${themeColor}50`,
                      }
                    : {}
                }
              >
                {tab.icon}
                <span>{tab.labelAr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Body Content */}
      <div className="min-h-[380px] animate-in fade-in duration-200">
        {currentTab === 'overview' && renderOverview()}
        {currentTab === 'tactical' && (renderTactical ? renderTactical() : <DefaultEmptyState title="العقود التكتيكية" />)}
        {currentTab === 'staff' && (renderStaff ? renderStaff() : <DefaultEmptyState title="إدارة الكوادر" />)}
        {currentTab === 'rd' && (renderRd ? renderRd() : <DefaultEmptyState title="الأبحاث والتطوير" />)}
      </div>
    </div>
  );
};

const DefaultEmptyState: React.FC<{ title: string }> = ({ title }) => (
  <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800 flex flex-col items-center justify-center space-y-3">
    <Award className="w-12 h-12 text-slate-600 animate-pulse" />
    <h3 className="text-base font-bold text-slate-300 font-cairo">{title}</h3>
    <p className="text-xs text-slate-500 font-mono max-w-sm">
      جارٍ مزامنة أنظمة الأتمتة والترقيات التكتيكية مع الخوادم المركزية...
    </p>
  </div>
);
