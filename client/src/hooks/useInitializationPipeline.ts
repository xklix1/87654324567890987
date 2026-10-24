import { useState, useCallback, useEffect } from 'react';
import { ComponentState, PipelineStep, PipelineStepId, ApiStandardError } from '../types/common';
import { SyncResponseData, VersionResponseData } from '../types/sync';
import { HealthService, VersionService } from '../services/system.service';
import { AuthService, SyncService } from '../services/auth-and-sync.service';
import { CLIENT_VERSION, isVersionSupported } from '../config/version';
import { useAuth } from '../context/AuthContext';

const initialSteps: PipelineStep[] = [
  { id: 'network_health', labelKey: 'step_network_health', order: 1, status: 'idle' },
  { id: 'version_check', labelKey: 'step_version_check', order: 2, status: 'idle' },
  { id: 'auth_verification', labelKey: 'step_auth_verification', order: 3, status: 'idle' },
  { id: 'state_sync', labelKey: 'step_state_sync', order: 4, status: 'idle' },
];

export interface PipelineSimulationOptions {
  forceNetworkError?: boolean;
  forceOutdatedVersion?: boolean;
}

export function useInitializationPipeline(options: PipelineSimulationOptions = {}) {
  const { token, setUser, setToken } = useAuth();

  const [steps, setSteps] = useState<PipelineStep[]>(initialSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(5);
  const [pipelineState, setPipelineState] = useState<ComponentState>('loading');
  const [errorDetail, setErrorDetail] = useState<ApiStandardError | null>(null);
  const [forceUpdateRequired, setForceUpdateRequired] = useState<boolean>(false);
  const [versionData, setVersionData] = useState<VersionResponseData | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(false);
  const [syncData, setSyncData] = useState<SyncResponseData | null>(null);

  const updateStepStatus = (id: PipelineStepId, status: PipelineStep['status'], detail?: string): void => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, status, detail } : step))
    );
  };

  const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  const runPipeline = useCallback(async () => {
    setPipelineState('loading');
    setErrorDetail(null);
    setForceUpdateRequired(false);
    setNeedsAuth(false);
    setProgressPercent(10);
    setCurrentStepIndex(0);

    // Reset steps
    setSteps(initialSteps.map((s) => ({ ...s, status: 'idle', detail: undefined })));

    try {
      // --- Step 1: Network Health Check ---
      updateStepStatus('network_health', 'running');
      setCurrentStepIndex(0);
      setProgressPercent(15);
      await delay(400);

      if (options.forceNetworkError) {
        throw {
          code: 'SIMULATED_NETWORK_FAILURE',
          message: 'Connection dropped: Simulated network failure requested for diagnostics.',
        } as ApiStandardError;
      }

      const health = await HealthService.checkHealth();
      updateStepStatus('network_health', 'completed', `Status: ${health.status} (${health.database_mode})`);
      setProgressPercent(30);
      await delay(250);

      // --- Step 2: Version Gatekeeping Check ---
      updateStepStatus('version_check', 'running');
      setCurrentStepIndex(1);
      setProgressPercent(40);
      await delay(400);

      const version = await VersionService.getVersion();
      setVersionData(version);

      const clientVerToTest = options.forceOutdatedVersion ? '0.8.0' : CLIENT_VERSION;
      const isSupported = isVersionSupported(clientVerToTest, version.minimum_supported_version);

      if (!isSupported) {
        updateStepStatus(
          'version_check',
          'failed',
          `Client v${clientVerToTest} is below required minimum v${version.minimum_supported_version}`
        );
        setForceUpdateRequired(true);
        setPipelineState('error');
        return;
      }

      updateStepStatus(
        'version_check',
        'completed',
        `Client v${CLIENT_VERSION} meets required minimum v${version.minimum_supported_version}`
      );
      setProgressPercent(55);
      await delay(250);

      // --- Step 3: Authentication & Session Verification ---
      updateStepStatus('auth_verification', 'running');
      setCurrentStepIndex(2);
      setProgressPercent(65);
      await delay(400);

      const activeToken = token ?? AuthService.getStoredToken();

      if (!activeToken) {
        // No session token: route to login/register smoothly
        updateStepStatus('auth_verification', 'completed', 'No stored token. Routing to investor authentication.');
        setProgressPercent(80);
        setNeedsAuth(true);
        setPipelineState('success');
        return;
      }

      let verifiedUser;
      try {
        verifiedUser = await AuthService.verifySession(activeToken);
        setUser(verifiedUser);
        updateStepStatus('auth_verification', 'completed', `Authenticated as: ${verifiedUser.username}`);
      } catch (authErr: unknown) {
        // Stored token is invalid or expired: clear and route to login
        AuthService.clearStoredToken();
        setToken(null);
        setUser(null);
        updateStepStatus('auth_verification', 'completed', 'Session expired. Please log in again.');
        setProgressPercent(80);
        setNeedsAuth(true);
        setPipelineState('success');
        return;
      }

      setProgressPercent(80);
      await delay(250);

      // --- Step 4: State Synchronization ---
      updateStepStatus('state_sync', 'running');
      setCurrentStepIndex(3);
      setProgressPercent(90);
      await delay(400);

      const synchronizedData = await SyncService.syncState(activeToken);
      setSyncData(synchronizedData);
      setUser(synchronizedData.user);

      const offlineHours = synchronizedData.offline_progression.capped_hours;
      const accrued = synchronizedData.offline_progression.accrued_amount;

      updateStepStatus(
        'state_sync',
        'completed',
        `Synced. Offline accrual: +$${accrued.toFixed(2)} (${offlineHours}h)`
      );
      setProgressPercent(100);
      await delay(300);

      setPipelineState('success');
    } catch (err: unknown) {
      const standardErr: ApiStandardError =
        err && typeof err === 'object' && 'code' in err && 'message' in err
          ? (err as ApiStandardError)
          : {
              code: 'PIPELINE_ERROR',
              message: err instanceof Error ? err.message : 'Unknown initialization failure occurred.',
            };

      setErrorDetail(standardErr);
      setPipelineState('error');

      // Mark current step as failed
      const activeStep = steps[currentStepIndex];
      if (activeStep) {
        updateStepStatus(activeStep.id, 'failed', standardErr.message);
      }
    }
  }, [token, options.forceNetworkError, options.forceOutdatedVersion, currentStepIndex, setUser, setToken]);

  useEffect(() => {
    runPipeline();
  }, [options.forceNetworkError, options.forceOutdatedVersion]);

  return {
    steps,
    currentStepIndex,
    progressPercent,
    pipelineState,
    errorDetail,
    forceUpdateRequired,
    versionData,
    needsAuth,
    syncData,
    retry: runPipeline,
    setNeedsAuth,
    setSyncData,
    setPipelineState,
  };
}
