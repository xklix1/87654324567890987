export type BudgetPolicyKey = 'ECO_MODE' | 'TAX_ADVISOR' | 'EMERGENCY_BUFFER';

export interface BudgetPolicySettings {
  eco_mode: boolean;
  tax_advisor: boolean;
  emergency_buffer: boolean;
}

export interface BudgetSectorBreakdown {
  sector_id: string;
  name: string;
  inflow_hourly: number;
  maintenance_hourly: number;
  tax_hourly: number;
  utilities_hourly: number;
  total_outflow_hourly: number;
  net_hourly: number;
  operating_margin: number;
}

export interface BudgetStatement {
  user_id: string;
  total_hourly_inflow: number;
  total_hourly_outflow: number;
  net_hourly_flow: number;
  net_operating_margin: number;
  is_in_freeze: boolean;
  tax_bracket_percentage: number;
  policies: BudgetPolicySettings;
  sectors: BudgetSectorBreakdown[];
  emergency_reserve_balance: number;
  last_calculated_at: string;
}
