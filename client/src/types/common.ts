export type ComponentState = 'loading' | 'error' | 'empty' | 'success';

export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export type PipelineStepId = 'network_health' | 'version_check' | 'auth_verification' | 'state_sync';

export type PipelineStepStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface PipelineStep {
  id: PipelineStepId;
  labelKey: string;
  order: number;
  status: PipelineStepStatus;
  detail?: string;
}

export interface ApiStandardError {
  code: string;
  message: string;
  details?: unknown;
}
