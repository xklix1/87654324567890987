import { Router } from 'express';
import { SectorsController } from './sectors.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { financialTransactionLimiter } from '../../middleware/rate-limit.middleware';
import { requireFeatureFlag } from '../../middleware/feature-flags.middleware';
import { enforceIdempotency } from '../../middleware/idempotency.middleware';
import { enforceAntiReplay } from '../../middleware/anti-replay.middleware';

export const sectorsRouter = Router();

// ==========================================
// 1. Stock Market (Protected by Kill-Switch)
// ==========================================
sectorsRouter.get('/stocks', requireFeatureFlag('STOCK_MARKET_ENABLED'), SectorsController.listStocks);
sectorsRouter.get(
  '/stocks/portfolio',
  requireFeatureFlag('STOCK_MARKET_ENABLED'),
  authenticate,
  SectorsController.getStockPortfolio
);
sectorsRouter.post(
  '/stocks/buy',
  requireFeatureFlag('STOCK_MARKET_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.buyStock
);
sectorsRouter.post(
  '/stocks/sell',
  requireFeatureFlag('STOCK_MARKET_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.sellStock
);

// ==========================================
// 2. Real Estate & Small Businesses
// ==========================================
sectorsRouter.get(
  '/real-estate/catalog',
  requireFeatureFlag('REAL_ESTATE_ENABLED'),
  SectorsController.listPropertiesCatalog
);
sectorsRouter.get(
  '/real-estate/properties',
  requireFeatureFlag('REAL_ESTATE_ENABLED'),
  authenticate,
  SectorsController.getUserProperties
);
sectorsRouter.post(
  '/real-estate/buy',
  requireFeatureFlag('REAL_ESTATE_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.buyProperty
);
sectorsRouter.post(
  '/real-estate/upgrade',
  requireFeatureFlag('REAL_ESTATE_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.upgradeProperty
);

// ==========================================
// 3. Car Dealerships
// ==========================================
sectorsRouter.get(
  '/dealership/contracts',
  requireFeatureFlag('DEALERSHIP_ENABLED'),
  SectorsController.listVehicleContracts
);
sectorsRouter.get(
  '/dealership/profile',
  requireFeatureFlag('DEALERSHIP_ENABLED'),
  authenticate,
  SectorsController.getDealershipProfile
);
sectorsRouter.post(
  '/dealership/order',
  requireFeatureFlag('DEALERSHIP_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.orderVehicle
);
sectorsRouter.post(
  '/dealership/sell',
  requireFeatureFlag('DEALERSHIP_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.sellVehicle
);
sectorsRouter.post(
  '/dealership/upgrade',
  requireFeatureFlag('DEALERSHIP_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.upgradeDealership
);

// ==========================================
// 4. Airport Tycoon
// ==========================================
sectorsRouter.get(
  '/airport/routes',
  requireFeatureFlag('AIRPORT_ENABLED'),
  SectorsController.listAirportRoutes
);
sectorsRouter.get(
  '/airport/aircraft-catalog',
  requireFeatureFlag('AIRPORT_ENABLED'),
  SectorsController.listAircraftCatalog
);
sectorsRouter.get(
  '/airport/hub',
  requireFeatureFlag('AIRPORT_ENABLED'),
  authenticate,
  SectorsController.getAirportHub
);
sectorsRouter.post(
  '/airport/buy-aircraft',
  requireFeatureFlag('AIRPORT_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.buyAircraft
);
sectorsRouter.post(
  '/airport/dispatch',
  requireFeatureFlag('AIRPORT_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.dispatchFlight
);
sectorsRouter.post(
  '/airport/land',
  requireFeatureFlag('AIRPORT_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.landFlight
);
sectorsRouter.post(
  '/airport/upgrade',
  requireFeatureFlag('AIRPORT_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.upgradeAirport
);

// ==========================================
// 5. Production Factories
// ==========================================
sectorsRouter.get(
  '/factory/overview',
  requireFeatureFlag('FACTORIES_ENABLED'),
  authenticate,
  SectorsController.getFactoryOverview
);
sectorsRouter.post(
  '/factory/materials/buy',
  requireFeatureFlag('FACTORIES_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.buyMaterials
);
sectorsRouter.post(
  '/factory/lines/create',
  requireFeatureFlag('FACTORIES_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.createProductionLine
);
sectorsRouter.post(
  '/factory/lines/produce',
  requireFeatureFlag('FACTORIES_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.runProductionCycle
);
sectorsRouter.post(
  '/factory/upgrade',
  requireFeatureFlag('FACTORIES_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.upgradeFactory
);

// ==========================================
// 6. Agricultural Farms
// ==========================================
sectorsRouter.get(
  '/farm/catalog',
  requireFeatureFlag('FARMS_ENABLED'),
  SectorsController.listFarmCatalog
);
sectorsRouter.get(
  '/farm/overview',
  requireFeatureFlag('FARMS_ENABLED'),
  authenticate,
  SectorsController.getFarmOverview
);
sectorsRouter.post(
  '/farm/plant',
  requireFeatureFlag('FARMS_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.plantFarmBatch
);
sectorsRouter.post(
  '/farm/harvest',
  requireFeatureFlag('FARMS_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.harvestFarmBatch
);
sectorsRouter.post(
  '/farm/upgrade',
  requireFeatureFlag('FARMS_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.upgradeFarm
);

// ==========================================
// 7. Import/Export & Logistics Company
// ==========================================
sectorsRouter.get(
  '/import-export/contracts',
  requireFeatureFlag('LOGISTICS_ENABLED'),
  SectorsController.listTradeContracts
);
sectorsRouter.get(
  '/import-export/overview',
  requireFeatureFlag('LOGISTICS_ENABLED'),
  authenticate,
  SectorsController.getImportExportOverview
);
sectorsRouter.post(
  '/import-export/dispatch',
  requireFeatureFlag('LOGISTICS_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.dispatchTradeVoyage
);
sectorsRouter.post(
  '/import-export/collect',
  requireFeatureFlag('LOGISTICS_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.collectTradeVoyage
);
sectorsRouter.post(
  '/import-export/upgrade',
  requireFeatureFlag('LOGISTICS_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.upgradeImportExport
);

// Logistics Aliases
sectorsRouter.get(
  '/logistics/contracts',
  requireFeatureFlag('LOGISTICS_ENABLED'),
  SectorsController.listTradeContracts
);
sectorsRouter.get(
  '/logistics/overview',
  requireFeatureFlag('LOGISTICS_ENABLED'),
  authenticate,
  SectorsController.getImportExportOverview
);
sectorsRouter.post(
  '/logistics/dispatch',
  requireFeatureFlag('LOGISTICS_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.dispatchTradeVoyage
);
sectorsRouter.post(
  '/logistics/collect',
  requireFeatureFlag('LOGISTICS_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.collectTradeVoyage
);
sectorsRouter.post(
  '/logistics/upgrade',
  requireFeatureFlag('LOGISTICS_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.upgradeImportExport
);

// ==========================================
// 8. Cryptocurrency Mining
// ==========================================
sectorsRouter.get(
  '/crypto/coins',
  requireFeatureFlag('CRYPTO_ENABLED'),
  SectorsController.listCryptoCoins
);
sectorsRouter.get(
  '/crypto/rigs-catalog',
  requireFeatureFlag('CRYPTO_ENABLED'),
  SectorsController.listCryptoRigCatalog
);
sectorsRouter.get(
  '/crypto/overview',
  requireFeatureFlag('CRYPTO_ENABLED'),
  authenticate,
  SectorsController.getCryptoOverview
);
sectorsRouter.post(
  '/crypto/select-coin',
  requireFeatureFlag('CRYPTO_ENABLED'),
  authenticate,
  SectorsController.selectCryptoCoin
);
sectorsRouter.post(
  '/crypto/buy-rig',
  requireFeatureFlag('CRYPTO_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.buyMiningRig
);
sectorsRouter.post(
  '/crypto/claim',
  requireFeatureFlag('CRYPTO_ENABLED'),
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.claimMinedCrypto
);

// ==========================================
// Economic Sinks & Engine
// ==========================================
export const economyRouter = Router();
economyRouter.get('/sinks', authenticate, SectorsController.getEconomicSinks);
economyRouter.post('/tick', authenticate, SectorsController.tickProgression);
economyRouter.get('/budget/statement', authenticate, SectorsController.getBudgetStatement);
economyRouter.post('/budget/policy/toggle', authenticate, SectorsController.toggleBudgetPolicy);
economyRouter.post('/budget/emergency/withdraw', authenticate, SectorsController.withdrawEmergencyReserve);
economyRouter.post(
  '/faucet',
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  SectorsController.grantDevelopmentFunds
);
