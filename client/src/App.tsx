import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Header } from './components/common/Header';
import { SplashScreen } from './components/splash/SplashScreen';
import { AuthCard } from './components/auth/AuthCard';
import { StateInspectorBar } from './components/dashboard/StateInspectorBar';
import { ComponentState } from './types/common';
import { SyncResponseData } from './types/sync';
import { UserProfile } from './types/user';

import { GameMainScreen } from './components/game/GameMainScreen';
import { FloatingVfxProvider } from './context/FloatingVfxContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Network Resilience & Hardening Overlays
import { DisconnectionOverlay } from './components/network/DisconnectionOverlay';
import { HighLatencyBadge } from './components/network/HighLatencyBadge';
import { ForegroundSyncOverlay } from './components/network/ForegroundSyncOverlay';
import { AppLifecycleService } from './services/app-lifecycle.service';
import { SocketService } from './services/socket.service';

type AppPhase = 'splash' | 'auth' | 'dashboard';

const AppContent: React.FC = () => {
  const { isAuthenticated, token, setUser, logout } = useAuth();
  const { showToast } = useToast();
  const [currentPhase, setCurrentPhase] = useState<AppPhase>('splash');
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [forcedState, setForcedState] = useState<ComponentState | undefined>(undefined);
  const [initialSyncData, setInitialSyncData] = useState<SyncResponseData | null>(null);

  // Initialize Android background lifecycle and session eviction listener
  useEffect(() => {
    AppLifecycleService.initialize(
      () => token,
      (data: SyncResponseData, profile: UserProfile) => {
        setInitialSyncData(data);
        setUser(profile);
      },
      () => {
        showToast('error', 'تم إنهاء الجلسة', 'تم تسجيل خروجك لأن هذا الحساب قام بالدخول من جهاز آخر.');
        logout();
        setCurrentPhase('auth');
      }
    );

    const unsubSessionRevoked = SocketService.onSessionRevoked((_reason) => {
      showToast('error', 'انتهت صلاحية الجلسة', 'تم إنهاء الجلسة النشطة: تم تسجيل الدخول من جهاز جديد.');
      logout();
      setCurrentPhase('auth');
    });

    return () => {
      unsubSessionRevoked();
    };
  }, [token, setUser, logout, showToast]);

  const handleInitializationComplete = (data?: SyncResponseData | null): void => {
    if (data) {
      setInitialSyncData(data);
    }
    if (isAuthenticated) {
      setCurrentPhase('dashboard');
    } else {
      setCurrentPhase('auth');
    }
  };

  const handleRequireAuth = (): void => {
    setCurrentPhase('auth');
  };

  const handleAuthSuccess = (): void => {
    setCurrentPhase('dashboard');
  };

  const handleRerunPipeline = (): void => {
    setForcedState(undefined);
    setCurrentPhase('splash');
  };

  const handleSelectState = (state: ComponentState): void => {
    setForcedState(state);
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col font-cairo">
      {/* Network Resilience & High Latency Global Indicators */}
      <HighLatencyBadge />
      <ForegroundSyncOverlay />
      <DisconnectionOverlay />

      {/* Universal Top Header for Splash/Auth */}
      {currentPhase !== 'dashboard' && (
        <Header
          onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
          isInspectorOpen={isInspectorOpen}
        />
      )}

      {/* 4-State Diagnostic Inspector Bar */}
      <StateInspectorBar
        isOpen={isInspectorOpen}
        currentState={forcedState ?? 'success'}
        onSelectState={handleSelectState}
        onRerunPipeline={handleRerunPipeline}
      />

      {/* Main View Transition Router */}
      <main className="flex-1 flex flex-col">
        {currentPhase === 'splash' && (
          <SplashScreen
            onInitializationComplete={handleInitializationComplete}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {currentPhase === 'auth' && (
          <div className="py-12 flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <AuthCard onSuccess={handleAuthSuccess} />
          </div>
        )}

        {currentPhase === 'dashboard' && (
          <GameMainScreen
            initialSyncData={initialSyncData}
            forcedState={forcedState}
            onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
            isInspectorOpen={isInspectorOpen}
          />
        )}
      </main>
    </div>
  );
};


export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <FloatingVfxProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </FloatingVfxProvider>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
