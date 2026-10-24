import { z } from 'zod';

// Stock Market
export const stockTradeSchema = z.object({
  stockId: z.number({ required_error: 'Stock ID is required' }).int().positive(),
  shares: z.number({ required_error: 'Shares count is required' }).int().positive('Shares must be at least 1'),
});

// Real Estate
export const propertyPurchaseSchema = z
  .object({
    propertyId: z.coerce.number().int().positive().optional(),
    property_id: z.coerce.number().int().positive().optional(),
  })
  .transform((data) => ({
    propertyId: data.propertyId ?? data.property_id ?? 0,
  }))
  .refine((data) => data.propertyId > 0, {
    message: 'Property ID is required and must be positive',
  });

export const propertyUpgradeSchema = z
  .object({
    userPropertyId: z.coerce.number().int().positive().optional(),
    property_id: z.coerce.number().int().positive().optional(),
  })
  .transform((data) => ({
    userPropertyId: data.userPropertyId ?? data.property_id ?? 0,
  }))
  .refine((data) => data.userPropertyId > 0, {
    message: 'User property ID is required and must be positive',
  });

// Dealership
export const orderVehicleSchema = z
  .object({
    contractId: z.coerce.number().int().positive().optional(),
    contract_id: z.coerce.number().int().positive().optional(),
  })
  .transform((data) => ({
    contractId: data.contractId ?? data.contract_id ?? 0,
  }))
  .refine((data) => data.contractId > 0, {
    message: 'Contract ID is required and must be positive',
  });

export const sellVehicleSchema = z
  .object({
    vehicleId: z.coerce.number().int().positive().optional(),
    car_id: z.coerce.number().int().positive().optional(),
  })
  .transform((data) => ({
    vehicleId: data.vehicleId ?? data.car_id ?? 0,
  }))
  .refine((data) => data.vehicleId > 0, {
    message: 'Vehicle ID is required and must be positive',
  });

export const dealershipUpgradeSchema = z.object({
  upgradeType: z.enum(['CAPACITY', 'SERVICE', 'TIER']).default('TIER'),
});

// Airport
export const buyAircraftSchema = z
  .object({
    catalogId: z.coerce.number().int().positive().optional(),
    aircraft_catalog_id: z.coerce.number().int().positive().optional(),
  })
  .transform((data) => ({
    catalogId: data.catalogId ?? data.aircraft_catalog_id ?? 0,
  }))
  .refine((data) => data.catalogId > 0, {
    message: 'Aircraft catalog ID is required and must be positive',
  });

export const dispatchFlightSchema = z
  .object({
    aircraftId: z.coerce.number().int().positive().optional(),
    user_aircraft_id: z.coerce.number().int().positive().optional(),
    routeId: z.coerce.number().int().positive().optional(),
    route_id: z.coerce.number().int().positive().optional(),
  })
  .transform((data) => ({
    aircraftId: data.aircraftId ?? data.user_aircraft_id ?? 0,
    routeId: data.routeId ?? data.route_id ?? 0,
  }))
  .refine((data) => data.aircraftId > 0 && data.routeId > 0, {
    message: 'Aircraft ID and Route ID are required and must be positive',
  });

export const landFlightSchema = z
  .object({
    aircraftId: z.coerce.number().int().positive().optional(),
    user_aircraft_id: z.coerce.number().int().positive().optional(),
  })
  .transform((data) => ({
    aircraftId: data.aircraftId ?? data.user_aircraft_id ?? 0,
  }))
  .refine((data) => data.aircraftId > 0, {
    message: 'Aircraft ID is required and must be positive',
  });

export const airportUpgradeSchema = z.object({
  upgradeType: z.enum(['RUNWAY', 'LOUNGE', 'DUTY_FREE', 'PASSENGER_CAPACITY']).default('RUNWAY'),
});

// Factory
export const buyMaterialSchema = z.object({
  materialType: z.string({ required_error: 'Material type is required' }).min(1),
  quantity: z.number({ required_error: 'Quantity is required' }).int().positive('Quantity must be greater than 0'),
});

export const createProductionLineSchema = z.object({
  blueprintIndex: z.number({ required_error: 'Blueprint index is required' }).int().min(0),
});

export const produceLineSchema = z.object({
  lineId: z.number({ required_error: 'Line ID is required' }).int().positive(),
});

export const factoryUpgradeSchema = z.object({
  upgradeType: z.enum(['AUTOMATION', 'STORAGE'], {
    required_error: 'Upgrade type must be AUTOMATION or STORAGE',
  }),
});

// Farm
export const plantFarmSchema = z.object({
  catalogOptionId: z.number({ required_error: 'Catalog option ID is required' }).int().positive(),
});

export const harvestFarmSchema = z.object({
  batchId: z.number({ required_error: 'Batch ID is required' }).int().positive(),
});

export const farmUpgradeSchema = z.object({
  upgradeType: z.enum(['EXPAND_LAND', 'IRRIGATION', 'GREENHOUSE', 'MACHINERY'], {
    required_error: 'Upgrade type must be EXPAND_LAND, IRRIGATION, GREENHOUSE, or MACHINERY',
  }),
});

// Import/Export
export const dispatchVoyageSchema = z
  .object({
    contractId: z.coerce.number().int().positive().optional(),
    contract_id: z.coerce.number().int().positive().optional(),
    vesselName: z.string().min(2).max(100).optional(),
  })
  .transform((data) => ({
    contractId: data.contractId ?? data.contract_id ?? 0,
    vesselName: data.vesselName || 'Titan Carrier',
  }))
  .refine((data) => data.contractId > 0, {
    message: 'Contract ID is required and must be positive',
  });

export const collectVoyageSchema = z
  .object({
    voyageId: z.coerce.number().int().positive().optional(),
    voyage_id: z.coerce.number().int().positive().optional(),
  })
  .transform((data) => ({
    voyageId: data.voyageId ?? data.voyage_id ?? 0,
  }))
  .refine((data) => data.voyageId > 0, {
    message: 'Voyage ID is required and must be positive',
  });

export const importExportUpgradeSchema = z.object({
  upgradeType: z.enum(['WAREHOUSE', 'LOGISTICS']).default('WAREHOUSE'),
});

// Crypto
export const selectCoinSchema = z.object({
  coinId: z.number().int().positive().optional(),
  coin_symbol: z.string().optional(),
});

export const buyRigSchema = z.object({
  catalogId: z.number().int().positive().optional(),
  rig_catalog_id: z.string().or(z.number()).optional(),
});
