import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { SyncResponseData } from '../../types/sync';
import { ComponentState } from '../../types/common';
import { Transaction, P2PTransferReceipt } from '../../types/user';
import { SyncService } from '../../services/auth-and-sync.service';
import { SocketService } from '../../services/socket.service';
import { StatCard } from './StatCard';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { OfflineEarningsModal } from './OfflineEarningsModal';
import { TransferModal } from './TransferModal';
import { GeneralBudgetModal } from '../budget/GeneralBudgetModal';
import { EconomyControlBar } from '../sectors/EconomyControlBar';

// Sector and Social Views
import { JobsView } from '../sectors/JobsView';
import { StocksView } from '../sectors/StocksView';
import { RealEstateView } from '../sectors/RealEstateView';
import { DealershipView } from '../sectors/DealershipView';
import { AirportView } from '../sectors/AirportView';
import { FactoryView } from '../sectors/FactoryView';
import { FarmView } from '../sectors/FarmView';
import { LogisticsView } from '../sectors/LogisticsView';
import { CryptoView } from '../sectors/CryptoView';
import { LeaderboardView } from '../social/LeaderboardView';
import { ProfileView } from '../social/ProfileView';
import { ChatPanel } from '../social/ChatPanel';
import { AchievementsView } from '../progression/AchievementsView';

import {
  Wallet,
  Briefcase,
  TrendingUp,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Send,
  Lock,
  Scale,
  LayoutDashboard,
  Building2,
  Car,
  Plane,
  Factory,
  Sprout,
  Anchor,
  Cpu,
  Trophy,
  MessageSquare,
  Award,
  User,
} from 'lucide-react';

export type DashboardTab =
  | 'overview'
  | 'jobs'
  | 'stocks'
  | 'real_estate'
  | 'dealership'
  | 'airport'
  | 'factory'
  | 'farm'
  | 'logistics'
  | 'crypto'
  | 'leaderboard'
  | 'chat'
  | 'profile'
  | 'achievements';

interface MainDashboardProps {
  initialSyncData: SyncResponseData | null;
  forcedState?: ComponentState;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({ initialSyncData, forcedState }) => {
  const { user, token, setUser } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [targetProfileUserId, setTargetProfileUserId] = useState<string | null>(null);

  const [syncData, setSyncData] = useState<SyncResponseData | null>(initialSyncData);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showAccrualModal, setShowAccrualModal] = useState<boolean>(
    (initialSyncData?.offline_progression?.accrued_amount ?? 0) > 0
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState<boolean>(false);

  // Initialize Socket.io connection when token is active
  useEffect(() => {
    if (token) {
      SocketService.connect(token);
    }
    return () => {
      // Keep socket alive during navigation within dashboard
    };
  }, [token]);

  const handleSync = async (): Promise<void> => {
    if (!token) return;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const updated = await SyncService.syncState(token);
      setSyncData(updated);
      setUser(updated.user);

      if (updated.offline_progression.accrued_amount > 0) {
        setShowAccrualModal(true);
      }
    } catch (err: unknown) {
      setSyncError('Failed to synchronize with server.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBalanceUpdate = (newBalance: number): void => {
    if (user) {
      const updated = { ...user, balance: newBalance };
      setUser(updated);
      if (syncData) {
        setSyncData({ ...syncData, user: updated });
      }
    }
  };

  const handleTransferSuccess = (receipt: P2PTransferReceipt): void => {
    if (user) {
      const updatedUser = {
        ...user,
        balance: receipt.sender_new_balance,
      };
      setUser(updatedUser);
      if (syncData) {
        const newTx: Transaction = {
          id: receipt.transaction_id,
          sender_id: receipt.sender_id,
          receiver_id: receipt.receiver_id,
          amount: -receipt.amount,
          fee: receipt.fee,
          status: 'COMPLETED',
          type: 'PEER_TRANSFER',
          created_at: receipt.created_at,
        };
        setSyncData({
          ...syncData,
          user: updatedUser,
          recent_transactions: [newTx, ...syncData.recent_transactions],
        });
      }
    }
  };

  const balance = syncData?.user?.balance ?? user?.balance ?? 1000.0;
  const job = syncData?.job ?? {
    id: 1,
    title: 'Intern Financial Clerk',
    hourly_salary: 25.0,
    required_level: 1,
    created_at: new Date().toISOString(),
  };
  const transactions: Transaction[] = syncData?.recent_transactions ?? [];

  // Determine active component state for ledger (override with forcedState if inspector active)
  let ledgerState: ComponentState = 'success';
  if (forcedState) {
    ledgerState = forcedState;
  } else if (isSyncing) {
    ledgerState = 'loading';
  } else if (syncError) {
    ledgerState = 'error';
  } else if (transactions.length === 0) {
    ledgerState = 'empty';
  }

  // Navigation Items
  const navItems = [
    { id: 'overview' as DashboardTab, label: t('nav_overview'), icon: LayoutDashboard },
    { id: 'jobs' as DashboardTab, label: t('nav_jobs'), icon: Briefcase },
    { id: 'stocks' as DashboardTab, label: t('nav_stocks'), icon: TrendingUp },
    { id: 'real_estate' as DashboardTab, label: t('nav_real_estate'), icon: Building2 },
    { id: 'dealership' as DashboardTab, label: t('nav_dealership'), icon: Car },
    { id: 'airport' as DashboardTab, label: t('nav_airport'), icon: Plane },
    { id: 'factory' as DashboardTab, label: t('nav_factory'), icon: Factory },
    { id: 'farm' as DashboardTab, label: t('nav_farm'), icon: Sprout },
    { id: 'logistics' as DashboardTab, label: t('nav_logistics'), icon: Anchor },
    { id: 'crypto' as DashboardTab, label: t('nav_crypto'), icon: Cpu },
    { id: 'leaderboard' as DashboardTab, label: t('nav_leaderboard'), icon: Trophy },
    { id: 'chat' as DashboardTab, label: t('nav_chat'), icon: MessageSquare },
    { id: 'profile' as DashboardTab, label: t('nav_profile'), icon: User },
    { id: 'achievements' as DashboardTab, label: t('nav_achievements'), icon: Award },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Offline Earnings Celebration Modal */}
      {showAccrualModal && syncData?.offline_progression && (
        <OfflineEarningsModal
          accrual={syncData.offline_progression}
          onClose={() => setShowAccrualModal(false)}
        />
      )}

      {/* Phase 2: Anti-Fraud P2P Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        currentBalance={balance}
        onTransferSuccess={handleTransferSuccess}
      />

      {/* General Budget & Fiscal Statement Modal */}
      <GeneralBudgetModal
        isOpen={isBudgetOpen}
        onClose={() => setIsBudgetOpen(false)}
        onBalanceUpdated={(newBal) => {
          if (syncData) {
            setSyncData({
              ...syncData,
              user: {
                ...syncData.user,
                balance: newBal,
              },
            });
          }
        }}
      />

      {/* Hero Financial Banner */}
      <div className="relative glass-panel rounded-3xl border border-dark-800 p-6 md:p-8 overflow-hidden bg-gradient-to-br from-dark-900/90 via-dark-850/80 to-dark-900/90">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                PORTFOLIO ACTIVE
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {t('dash_synced_just_now')}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-100 tracking-tight font-cairo">
              {user?.username ?? 'Tycoon Investor'}
            </h2>
            <p className="text-xs text-slate-400 max-w-md">
              Race to wealth capital ledger. Server-authoritative economy across 8 business sectors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* General Budget Action Button */}
            <button
              id="dash-open-budget-btn"
              onClick={() => setIsBudgetOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Scale className="w-4 h-4" />
              <span>الموازنة العامة للدولة</span>
            </button>

            {/* P2P Transfer Action Button */}
            <button
              id="dash-open-transfer-btn"
              onClick={() => setIsTransferOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-dark-950 font-bold text-xs shadow-emerald-glow transition-all active:scale-[0.98] cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{t('dash_transfer_btn')}</span>
            </button>

            {/* State Sync Action Button */}
            <button
              id="dash-sync-state-btn"
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-700 font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? t('status_running') : t('dash_sync_btn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Universal Economic Control Bar */}
      <EconomyControlBar onBalanceUpdate={handleBalanceUpdate} />

      {/* Multi-Sector Navigation Bar with Edge Gradients */}
      <div className="relative group">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-dark-950 via-dark-950/60 to-transparent z-10 rounded-l-2xl" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-dark-950 via-dark-950/60 to-transparent z-10 rounded-r-2xl" />

        <div
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="overflow-x-auto pb-1 scrollbar-none scroll-smooth select-none"
        >
          <div className="flex items-center gap-2 min-w-max p-1 bg-dark-900/80 border border-dark-800 rounded-2xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id !== 'profile') {
                      setTargetProfileUserId(null);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-cairo font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-dark-950 shadow-emerald-glow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area based on Active Tab */}
      <div className="min-h-[420px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Financial Metrics Grid (8px grid scale) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title={t('dash_total_balance')}
                value={`$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                subtitle="Liquid trading reserves"
                icon={<Wallet className="w-5 h-5 text-emerald-400" />}
                variant="emerald"
              />

              <StatCard
                title={t('dash_active_job')}
                value={job.title}
                subtitle={`Tier level requirement: ${job.required_level}`}
                icon={<Briefcase className="w-5 h-5 text-amber-400" />}
                variant="gold"
              />

              <StatCard
                title={t('dash_hourly_salary')}
                value={`$${job.hourly_salary.toFixed(2)}/h`}
                subtitle="Continuous offline accrual rate"
                icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
                variant="cyan"
              />

              <StatCard
                title={t('dash_daily_limit')}
                value="$10,000.00"
                subtitle="Anti-Fraud 24h P2P Cap"
                icon={<Lock className="w-5 h-5 text-emerald-400" />}
                variant="neutral"
              />
            </div>

            {/* Financial Ledger Section with 4-State Coverage */}
            <div className="glass-panel rounded-2xl border border-dark-800 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-slate-100 font-cairo">
                    {t('dash_recent_transactions')}
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {transactions.length} Records
                </span>
              </div>

              <ComponentStateWrapper
                state={ledgerState}
                errorMessage={syncError ?? undefined}
                onRetry={handleSync}
              >
                <div className="divide-y divide-dark-800">
                  {transactions.map((tx) => {
                    const isIncome = tx.amount > 0;
                    return (
                      <div
                        key={tx.id}
                        className="py-3.5 flex items-center justify-between gap-4 hover:bg-dark-850/50 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200">
                                {tx.type}
                              </span>
                              {tx.status && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {tx.status}
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-500">
                                #{tx.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500">
                              <span>{new Date(tx.created_at).toLocaleString()}</span>
                              {tx.fee !== undefined && tx.fee > 0 && (
                                <span className="text-cyan-400">
                                  (Fee: -${tx.fee.toFixed(2)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-sm font-black font-mono ${
                              isIncome ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {isIncome ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ComponentStateWrapper>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <JobsView forcedState={forcedState} currentJobId={job.id} />
        )}

        {activeTab === 'stocks' && (
          <StocksView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
        )}

        {activeTab === 'real_estate' && (
          <RealEstateView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
        )}

        {activeTab === 'dealership' && (
          <DealershipView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
        )}

        {activeTab === 'airport' && (
          <AirportView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
        )}

        {activeTab === 'factory' && (
          <FactoryView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
        )}

        {activeTab === 'farm' && (
          <FarmView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
        )}

        {activeTab === 'logistics' && (
          <LogisticsView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
        )}

        {activeTab === 'crypto' && (
          <CryptoView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            forcedState={forcedState}
            onSelectUser={(userId) => {
              setTargetProfileUserId(userId);
              setActiveTab('profile');
            }}
          />
        )}

        {activeTab === 'chat' && (
          <ChatPanel forcedState={forcedState} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            forcedState={forcedState}
            targetUserId={targetProfileUserId ?? undefined}
            onClose={() => {
              setTargetProfileUserId(null);
              setActiveTab('overview');
            }}
          />
        )}

        {activeTab === 'achievements' && (
          <AchievementsView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
        )}
      </div>
    </div>
  );
};
