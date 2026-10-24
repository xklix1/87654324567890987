import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFloatingVfx } from '../../context/FloatingVfxContext';
import { SyncResponseData } from '../../types/sync';
import { ComponentState } from '../../types/common';
import { P2PTransferReceipt } from '../../types/user';
import { SectorsService } from '../../services/sectors.service';
import { ProgressionService } from '../../services/progression.service';
import { SocketService } from '../../services/socket.service';
import { GameAudio } from '../../utils/audio';

import { CityCanvas, SectorBuildingId } from './CityCanvas';
import { GameTopHud } from './GameTopHud';
import { GameBottomDock, GameOverlaySheet } from './GameBottomDock';
import { GameSheetModal } from './GameSheetModal';

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
import { EconomyControlBar } from '../sectors/EconomyControlBar';
import { LeaderboardView } from '../social/LeaderboardView';
import { ProfileView } from '../social/ProfileView';
import { ChatPanel } from '../social/ChatPanel';
import { AchievementsView } from '../progression/AchievementsView';
import { TransferModal } from '../dashboard/TransferModal';
import { OfflineEarningsModal } from '../dashboard/OfflineEarningsModal';
import { GeneralBudgetModal } from '../budget/GeneralBudgetModal';

import {
  TrendingUp,
  Building2,
  Car,
  Plane,
  Factory,
  Sprout,
  Anchor,
  Cpu,
  Trophy,
  Award,
  MessageSquare,
  Briefcase,
  FastForward,
} from 'lucide-react';

interface GameMainScreenProps {
  initialSyncData: SyncResponseData | null;
  forcedState?: ComponentState;
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
}

export const GameMainScreen: React.FC<GameMainScreenProps> = ({
  initialSyncData,
  forcedState,
  onToggleInspector,
  isInspectorOpen,
}) => {
  const { user, token, setUser } = useAuth();
  const { t } = useLanguage();
  const { spawnMoneyFloat, spawnTextFloat } = useFloatingVfx();

  const [syncData, setSyncData] = useState<SyncResponseData | null>(initialSyncData);
  const [activeSector, setActiveSector] = useState<SectorBuildingId | null>(null);
  const [activeSheet, setActiveSheet] = useState<GameOverlaySheet>('map');
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState<boolean>(false);
  const [showAccrualModal, setShowAccrualModal] = useState<boolean>(
    (initialSyncData?.offline_progression?.accrued_amount ?? 0) > 0
  );
  const [profileTargetUserId, setProfileTargetUserId] = useState<string | null>(null);

  // Progression & Economy stats
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);
  const [prestigeTitle, setPrestigeTitle] = useState<string>('Tycoon Investor');
  const [unclaimedAchievementsCount, setUnclaimedAchievementsCount] = useState<number>(0);
  const [hourlyNetFlow, setHourlyNetFlow] = useState<number>(25.0);

  // Initialize Socket.io and fetch progression stats
  useEffect(() => {
    if (!token) return;
    SocketService.connect(token);

    const loadProgression = async () => {
      try {
        const [sum, sinks, achs] = await Promise.all([
          ProgressionService.getProgressionSummary(token),
          SectorsService.getEconomicSinks(token),
          ProgressionService.getAchievements(token),
        ]);
        setLevel(sum.level);
        setXp(sum.xp);
        setPrestigeTitle(sum.prestige_title);
        setHourlyNetFlow(sinks.net_hourly_flow);

        const unclaimed = achs.filter((a) => a.unlocked && !a.claimed).length;
        setUnclaimedAchievementsCount(unclaimed);
      } catch {
        // Fallback to initial values
      }
    };
    loadProgression();
  }, [token]);

  const handleBalanceUpdate = useCallback(
    (newBalance: number) => {
      if (user) {
        const delta = newBalance - user.balance;
        if (delta !== 0) {
          spawnMoneyFloat(delta);
        }
        const updated = { ...user, balance: newBalance };
        setUser(updated);
        if (syncData) {
          setSyncData({ ...syncData, user: updated });
        }
      }
    },
    [user, setUser, syncData, spawnMoneyFloat]
  );

  const handleOpenFaucet = async () => {
    if (!token) return;
    try {
      const res = await SectorsService.requestFaucet(token);
      handleBalanceUpdate(res.balance);
      spawnTextFloat('GRANT +$50,000', true);
      GameAudio.playUpgradeSound();
    } catch {
      // Ignore
    }
  };

  const handleTransferSuccess = (receipt: P2PTransferReceipt): void => {
    if (user) {
      handleBalanceUpdate(receipt.sender_new_balance);
      setIsTransferOpen(false);
    }
  };

  const balance = syncData?.user?.balance ?? user?.balance ?? 1000.0;

  // Handle Sector Click from Canvas
  const handleSelectBuilding = (buildingId: SectorBuildingId) => {
    setActiveSector(buildingId);
  };

  // Handle Bottom Dock Selection
  const handleSelectDock = (sheet: GameOverlaySheet) => {
    setActiveSheet(sheet);
    if (sheet === 'transfer') {
      setIsTransferOpen(true);
      setActiveSheet('map');
    }
  };

  // Sector titles & icons helper
  const getSectorMeta = (id: SectorBuildingId) => {
    switch (id) {
      case 'stocks':
        return { title: t('nav_stocks'), icon: <TrendingUp className="w-5 h-5 text-emerald-400" /> };
      case 'real_estate':
        return { title: t('nav_real_estate'), icon: <Building2 className="w-5 h-5 text-cyan-400" /> };
      case 'dealership':
        return { title: t('nav_dealership'), icon: <Car className="w-5 h-5 text-amber-400" /> };
      case 'airport':
        return { title: t('nav_airport'), icon: <Plane className="w-5 h-5 text-cyan-400" /> };
      case 'factory':
        return { title: t('nav_factory'), icon: <Factory className="w-5 h-5 text-cyan-400" /> };
      case 'farm':
        return { title: t('nav_farm'), icon: <Sprout className="w-5 h-5 text-emerald-400" /> };
      case 'logistics':
        return { title: t('nav_logistics'), icon: <Anchor className="w-5 h-5 text-cyan-400" /> };
      case 'crypto':
        return { title: t('nav_crypto'), icon: <Cpu className="w-5 h-5 text-amber-400" /> };
      case 'jobs':
        return { title: t('nav_jobs'), icon: <Briefcase className="w-5 h-5 text-pink-400" /> };
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-dark-950 flex flex-col font-cairo">
      {/* 1. Game Top HUD */}
      <GameTopHud
        balance={balance}
        hourlyYield={hourlyNetFlow}
        level={level}
        xp={xp}
        title={prestigeTitle}
        onOpenFaucet={handleOpenFaucet}
        onOpenBudget={() => setIsBudgetOpen(true)}
        onToggleInspector={onToggleInspector}
        isInspectorOpen={isInspectorOpen}
      />

      {/* 2. Main Isometric City Canvas Engine */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <CityCanvas onSelectSector={handleSelectBuilding} hourlyYield={hourlyNetFlow} />
      </main>

      {/* 3. Mobile Game Floating Action Dock */}
      <GameBottomDock
        activeSheet={activeSheet}
        onSelectSheet={handleSelectDock}
        unclaimedAchievementsCount={unclaimedAchievementsCount}
      />

      {/* 4. Interactive Sector Bottom Sheet Modals (Triggered by Canvas Buildings) */}
      {activeSector && (
        <GameSheetModal
          isOpen={true}
          onClose={() => setActiveSector(null)}
          title={getSectorMeta(activeSector).title}
          icon={getSectorMeta(activeSector).icon}
        >
          {activeSector === 'stocks' && (
            <StocksView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
          )}
          {activeSector === 'real_estate' && (
            <RealEstateView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
          )}
          {activeSector === 'dealership' && (
            <DealershipView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
          )}
          {activeSector === 'airport' && (
            <AirportView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
          )}
          {activeSector === 'factory' && (
            <FactoryView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
          )}
          {activeSector === 'farm' && (
            <FarmView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
          )}
          {activeSector === 'logistics' && (
            <LogisticsView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
          )}
          {activeSector === 'crypto' && (
            <CryptoView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
          )}
          {activeSector === 'jobs' && (
            <JobsView
              forcedState={forcedState}
              currentJobId={user?.current_job_id ?? 1}
              onBalanceUpdate={handleBalanceUpdate}
              onOpenBudget={() => setIsBudgetOpen(true)}
            />
          )}
        </GameSheetModal>
      )}

      {/* 5. Game Dock Sheet Modals (Leaderboard, Achievements, Chat, Economy, Profile) */}
      {activeSheet === 'leaderboard' && (
        <GameSheetModal
          isOpen={true}
          onClose={() => setActiveSheet('map')}
          title={t('nav_leaderboard')}
          icon={<Trophy className="w-5 h-5 text-amber-400" />}
        >
          <LeaderboardView
            forcedState={forcedState}
            onSelectUser={(targetId) => {
              setProfileTargetUserId(targetId);
              setActiveSheet('map');
            }}
          />
        </GameSheetModal>
      )}

      {activeSheet === 'achievements' && (
        <GameSheetModal
          isOpen={true}
          onClose={() => setActiveSheet('map')}
          title={t('nav_achievements')}
          icon={<Award className="w-5 h-5 text-amber-400" />}
        >
          <AchievementsView forcedState={forcedState} onBalanceUpdate={handleBalanceUpdate} />
        </GameSheetModal>
      )}

      {activeSheet === 'chat' && (
        <GameSheetModal
          isOpen={true}
          onClose={() => setActiveSheet('map')}
          title={t('nav_chat')}
          icon={<MessageSquare className="w-5 h-5 text-cyan-400" />}
        >
          <ChatPanel forcedState={forcedState} />
        </GameSheetModal>
      )}

      {activeSheet === 'economy' && (
        <GameSheetModal
          isOpen={true}
          onClose={() => setActiveSheet('map')}
          title="محرك التدفق المالي والاقتصادي"
          icon={<FastForward className="w-5 h-5 text-cyan-400" />}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              تحكم بتدفق دورة الاقتصاد الساعية، الرسوم والضرائب، وتكاليف الصيانة الدورية.
            </p>
            <EconomyControlBar onBalanceUpdate={handleBalanceUpdate} />
          </div>
        </GameSheetModal>
      )}

      {profileTargetUserId && (
        <GameSheetModal
          isOpen={true}
          onClose={() => setProfileTargetUserId(null)}
          title={t('nav_profile')}
        >
          <ProfileView
            forcedState={forcedState}
            targetUserId={profileTargetUserId}
            onClose={() => setProfileTargetUserId(null)}
          />
        </GameSheetModal>
      )}

      {/* 6. P2P Encrypted Money Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        currentBalance={balance}
        onTransferSuccess={handleTransferSuccess}
      />

      {/* 7. Offline Earnings Accrual Modal */}
      {showAccrualModal && syncData?.offline_progression && (
        <OfflineEarningsModal
          accrual={syncData.offline_progression}
          onClose={() => setShowAccrualModal(false)}
        />
      )}

      {/* 8. General Budget & Fiscal Statement Modal */}
      <GeneralBudgetModal
        isOpen={isBudgetOpen}
        onClose={() => setIsBudgetOpen(false)}
        onBalanceUpdated={handleBalanceUpdate}
      />
    </div>
  );
};
