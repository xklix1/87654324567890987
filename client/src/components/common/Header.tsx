import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { CLIENT_VERSION } from '../../config/version';
import { Globe, Shield, LogOut, Sliders, TrendingUp } from 'lucide-react';

interface HeaderProps {
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleInspector, isInspectorOpen }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-dark-800 bg-dark-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-dark-950 font-black shadow-emerald-glow border border-emerald-400/40">
            <TrendingUp className="w-5 h-5 text-dark-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-100 font-cairo">
                {t('app_title')}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                v{CLIENT_VERSION}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {t('app_subtitle')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 4-State Inspector Toggle */}
          {onToggleInspector && (
            <button
              id="btn-state-inspector"
              onClick={onToggleInspector}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isInspectorOpen
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-cyan-glow'
                  : 'bg-dark-850 hover:bg-dark-800 text-slate-400 border-dark-700'
              }`}
              title={t('state_inspector_title')}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t('state_inspector_title')}</span>
            </button>
          )}

          {/* Language Switcher (RTL / LTR) */}
          <button
            id="btn-language-toggle"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-dark-850 hover:bg-dark-800 text-slate-300 border border-dark-700 hover:border-slate-500 transition-all"
            title="Toggle Language / تبديل اللغة"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'ar' ? 'English (LTR)' : 'العربية (RTL)'}</span>
          </button>

          {/* Authenticated User Status or Logout */}
          {isAuthenticated && user && (
            <div className="flex items-center gap-2 pl-2 border-slate-700">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-200">{user.username}</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                id="btn-logout"
                onClick={logout}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all"
                title={t('dash_logout_btn')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* System Online Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <Shield className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">{t('system_connected')}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
