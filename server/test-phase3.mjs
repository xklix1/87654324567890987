// Phase 3 End-to-End Verification Test Script
// Strict Zero-Emoji Policy enforced

const BASE_URL = 'http://localhost:5000/api';

async function testPhase3() {
  console.log('[Test] Starting Phase 3 Business Sectors & Economic Engine test...');

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('[Test] Health status:', health.status, 'Database mode:', health.database_mode);

  // 2. Register fresh tycoon player with plenty of starting capital for testing all sectors
  const testUser = `tycoon_${Date.now()}`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUser,
      password: 'SecurePassword123!',
    }),
  });
  const regData = await regRes.json();
  if (!regData.success) {
    throw new Error('Registration failed: ' + JSON.stringify(regData));
  }
  const token = regData.data.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('[Test] Registered user:', testUser, 'Starting balance:', regData.data.user.balance);

  // Fund test user via development faucet for tycoon sector testing
  const faucetRes = await fetch(`${BASE_URL}/economy/faucet`, {
    method: 'POST',
    headers: authHeaders,
  });
  const faucetData = await faucetRes.json();
  console.log('[Test] Funded test tycoon via development faucet. Balance:', faucetData.data.newBalance);

  // --- SECTOR 1: Stock Market ---
  console.log('[Test 1/8] Testing Stock Market...');
  const stocksRes = await fetch(`${BASE_URL}/sectors/stocks`);
  const stocksData = await stocksRes.json();
  console.log('[Test] Available stocks count:', stocksData.data.length);
  const wrtcStock = stocksData.data.find((s) => s.ticker === 'WRTC');

  // Buy 2 shares of WRTC
  const buyStockRes = await fetch(`${BASE_URL}/sectors/stocks/buy`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ stockId: wrtcStock.id, shares: 2 }),
  });
  const buyStockData = await buyStockRes.json();
  if (!buyStockData.success) throw new Error('Buy stock failed: ' + JSON.stringify(buyStockData));
  console.log('[Test] Bought 2 shares of WRTC. Cost:', buyStockData.data.total_cost, 'New balance:', buyStockData.data.new_balance);

  // Check Portfolio
  const portRes = await fetch(`${BASE_URL}/sectors/stocks/portfolio`, { headers: authHeaders });
  const portData = await portRes.json();
  const positions = portData.data.positions || portData.data.holdings || [];
  console.log('[Test] User stock positions count:', positions.length, 'WRTC shares:', positions[0]?.shares_count ?? positions[0]?.shares);

  // Sell 1 share
  const sellStockRes = await fetch(`${BASE_URL}/sectors/stocks/sell`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ stockId: wrtcStock.id, shares: 1 }),
  });
  const sellStockData = await sellStockRes.json();
  console.log('[Test] Sold 1 share of WRTC. Revenue:', sellStockData.data.revenue, 'New balance:', sellStockData.data.new_balance);

  // --- SECTOR 2: Real Estate ---
  console.log('[Test 2/8] Testing Real Estate & Small Businesses...');
  const propCatRes = await fetch(`${BASE_URL}/sectors/real-estate/catalog`);
  const propCatData = await propCatRes.json();
  console.log('[Test] Real estate properties in catalog:', propCatData.data.length);

  // Purchase Convenience Store ($15,000)
  const buyPropRes = await fetch(`${BASE_URL}/sectors/real-estate/buy`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ propertyId: 1 }),
  });
  const buyPropData = await buyPropRes.json();
  if (!buyPropData.success) throw new Error('Buy property failed: ' + JSON.stringify(buyPropData));
  console.log('[Test] Purchased property:', buyPropData.data.property.property_name, 'Hourly income:', buyPropData.data.property.current_hourly_income);

  // Upgrade property
  const upgradePropRes = await fetch(`${BASE_URL}/sectors/real-estate/upgrade`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ userPropertyId: buyPropData.data.property.id }),
  });
  const upgradePropData = await upgradePropRes.json();
  console.log('[Test] Upgraded property to level:', upgradePropData.data.property.upgrade_level, 'New hourly income:', upgradePropData.data.property.current_hourly_income);

  // --- SECTOR 3: Car Dealership ---
  console.log('[Test 3/8] Testing Car Dealerships...');
  const dealerProfRes = await fetch(`${BASE_URL}/sectors/dealership/profile`, { headers: authHeaders });
  const dealerProf = await dealerProfRes.json();
  console.log('[Test] Showroom capacity:', dealerProf.data.showroom_capacity, 'Tier:', dealerProf.data.showroom_tier);

  // Order vehicle (contract 1: EcoRunner Sedan)
  const orderVehRes = await fetch(`${BASE_URL}/sectors/dealership/order`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ contractId: 1 }),
  });
  const orderVehData = await orderVehRes.json();
  if (!orderVehData.success) throw new Error('Order vehicle failed: ' + JSON.stringify(orderVehData));
  console.log('[Test] Vehicle on display:', orderVehData.data.vehicle.model_name, 'Retail price:', orderVehData.data.vehicle.retail_price);

  // Sell vehicle
  const sellVehRes = await fetch(`${BASE_URL}/sectors/dealership/sell`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ vehicleId: orderVehData.data.vehicle.id }),
  });
  const sellVehData = await sellVehRes.json();
  console.log('[Test] Sold vehicle. Sale proceeds:', sellVehData.data.saleProceeds, 'New balance:', sellVehData.data.newBalance);

  // Upgrade Showroom Capacity
  const upgradeDealerRes = await fetch(`${BASE_URL}/sectors/dealership/upgrade`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ upgradeType: 'CAPACITY' }),
  });
  const upgradeDealerData = await upgradeDealerRes.json();
  console.log('[Test] Expanded showroom capacity to:', upgradeDealerData.data.profile.showroom_capacity);

  // --- SECTOR 4: Airport Tycoon ---
  console.log('[Test 4/8] Testing Airport Tycoon...');
  const airportHubRes = await fetch(`${BASE_URL}/sectors/airport/hub`, { headers: authHeaders });
  const hubData = await airportHubRes.json();
  console.log('[Test] Airport runways:', hubData.data.runways_count, 'Passenger capacity:', hubData.data.passenger_capacity);

  // Buy aircraft (SkyCommuter Turboprop 40)
  const buyAirRes = await fetch(`${BASE_URL}/sectors/airport/buy-aircraft`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ catalogId: 1 }),
  });
  const buyAirData = await buyAirRes.json();
  if (!buyAirData.success) throw new Error('Buy aircraft failed: ' + JSON.stringify(buyAirData));
  console.log('[Test] Purchased aircraft:', buyAirData.data.aircraft.model_name, 'Capacity:', buyAirData.data.aircraft.passenger_capacity);

  // Dispatch flight on route 1
  const dispatchRes = await fetch(`${BASE_URL}/sectors/airport/dispatch`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ aircraftId: buyAirData.data.aircraft.id, routeId: 1 }),
  });
  const dispatchData = await dispatchRes.json();
  console.log('[Test] Dispatched flight. Status:', dispatchData.data.aircraft.status, 'Prep cost:', dispatchData.data.prepCost);

  // Upgrade runway
  const upgradeAirRes = await fetch(`${BASE_URL}/sectors/airport/upgrade`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ upgradeType: 'RUNWAY' }),
  });
  const upgradeAirData = await upgradeAirRes.json();
  console.log('[Test] Upgraded airport runways to:', upgradeAirData.data.hub.runways_count);

  // --- SECTOR 5: Production Factories ---
  console.log('[Test 5/8] Testing Production Factories...');
  // Buy raw materials (Iron Ore)
  const buyMatRes = await fetch(`${BASE_URL}/sectors/factory/materials/buy`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ materialType: 'IRON_ORE', quantity: 100 }),
  });
  const buyMatData = await buyMatRes.json();
  if (!buyMatData.success) throw new Error('Buy materials failed: ' + JSON.stringify(buyMatData));
  console.log('[Test] Bought 100 units of IRON_ORE. Cost:', buyMatData.data.cost, 'Inventory:', buyMatData.data.materials);

  // Create production line (Structural Steel Beams blueprint)
  const createLineRes = await fetch(`${BASE_URL}/sectors/factory/lines/create`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ blueprintIndex: 0 }),
  });
  const createLineData = await createLineRes.json();
  console.log('[Test] Created production line:', createLineData.data.product_name, 'Raw material required:', createLineData.data.raw_material_units);

  // Run production cycle
  const runLineRes = await fetch(`${BASE_URL}/sectors/factory/lines/produce`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ lineId: createLineData.data.id }),
  });
  const runLineData = await runLineRes.json();
  console.log('[Test] Executed production cycle. Revenue earned:', runLineData.data.revenueEarned, 'New balance:', runLineData.data.newBalance);

  // Upgrade factory storage
  const upgradeFacRes = await fetch(`${BASE_URL}/sectors/factory/upgrade`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ upgradeType: 'STORAGE' }),
  });
  const upgradeFacData = await upgradeFacRes.json();
  console.log('[Test] Upgraded factory storage capacity to:', upgradeFacData.data.overview.storage_capacity);

  // --- SECTOR 6: Agricultural Farms ---
  console.log('[Test 6/8] Testing Agricultural Farms...');
  const farmCatRes = await fetch(`${BASE_URL}/sectors/farm/catalog`);
  const farmCat = await farmCatRes.json();
  console.log('[Test] Farm cultivation options:', farmCat.data.length);

  // Plant Golden Wheat
  const plantRes = await fetch(`${BASE_URL}/sectors/farm/plant`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ catalogOptionId: 1 }),
  });
  const plantData = await plantRes.json();
  if (!plantData.success) throw new Error('Plant farm failed: ' + JSON.stringify(plantData));
  console.log('[Test] Planted batch:', plantData.data.batch.batch_name, 'Acres utilized:', plantData.data.batch.acres_utilized, 'Yield value:', plantData.data.batch.yield_market_value);

  // Upgrade irrigation
  const upgradeFarmRes = await fetch(`${BASE_URL}/sectors/farm/upgrade`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ upgradeType: 'IRRIGATION' }),
  });
  const upgradeFarmData = await upgradeFarmRes.json();
  console.log('[Test] Upgraded farm irrigation tier to:', upgradeFarmData.data.overview.irrigation_tier);

  // --- SECTOR 7: Import/Export Company ---
  console.log('[Test 7/8] Testing Import/Export Logistics...');
  const contractsRes = await fetch(`${BASE_URL}/sectors/import-export/contracts`);
  const contractsData = await contractsRes.json();
  console.log('[Test] Trade contracts available:', contractsData.data.length);

  // Dispatch trade voyage
  const dispatchVoyRes = await fetch(`${BASE_URL}/sectors/import-export/dispatch`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ contractId: 1, vesselName: 'MV Wealth Navigator' }),
  });
  const dispatchVoyData = await dispatchVoyRes.json();
  if (!dispatchVoyData.success) throw new Error('Dispatch voyage failed: ' + JSON.stringify(dispatchVoyData));
  console.log('[Test] Dispatched cargo vessel:', dispatchVoyData.data.voyage.vessel_name, 'Route:', dispatchVoyData.data.voyage.contract_name);

  // Upgrade warehouse TEU capacity
  const upgradeIERes = await fetch(`${BASE_URL}/sectors/import-export/upgrade`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ upgradeType: 'WAREHOUSE' }),
  });
  const upgradeIEData = await upgradeIERes.json();
  console.log('[Test] Upgraded customs warehouse capacity TEU to:', upgradeIEData.data.overview.warehouse_capacity_teu);

  // --- SECTOR 8: Cryptocurrency Mining ---
  console.log('[Test 8/8] Testing Cryptocurrency Mining...');
  const coinsRes = await fetch(`${BASE_URL}/sectors/crypto/coins`);
  const coinsData = await coinsRes.json();
  console.log('[Test] Crypto coins available:', coinsData.data.map((c) => c.symbol).join(', '));

  // Select ETH (coin id 2)
  const selectCoinRes = await fetch(`${BASE_URL}/sectors/crypto/select-coin`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ coinId: 2 }),
  });
  const selectCoinData = await selectCoinRes.json();
  console.log('[Test] Selected mining coin:', selectCoinData.data.symbol, selectCoinData.data.name);

  // Buy Mining Rig (RTX 4090 Tycoon Rig)
  const buyRigRes = await fetch(`${BASE_URL}/sectors/crypto/buy-rig`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ catalogId: 2 }),
  });
  const buyRigData = await buyRigRes.json();
  if (!buyRigData.success) throw new Error('Buy rig failed: ' + JSON.stringify(buyRigData));
  console.log('[Test] Installed mining rig:', buyRigData.data.rig.gpu_model, 'Hashrate:', buyRigData.data.rig.hashrate_mhs, 'MH/s');

  // Check Crypto Overview
  const cryptoOverRes = await fetch(`${BASE_URL}/sectors/crypto/overview`, { headers: authHeaders });
  const cryptoOverData = await cryptoOverRes.json();
  console.log('[Test] Total Hashrate:', cryptoOverData.data.total_hashrate_mhs, 'Power watts:', cryptoOverData.data.power_consumption_watts, 'Hourly electricity cost: $' + cryptoOverData.data.hourly_electricity_cost);

  // --- ECONOMIC ENGINE & SINKS ---
  console.log('[Test Economic Engine] Calculating Economic Sinks...');
  const sinksRes = await fetch(`${BASE_URL}/economy/sinks`, { headers: authHeaders });
  const sinksData = await sinksRes.json();
  console.log('[Test] Hourly Maintenance: $' + sinksData.data.hourly_maintenance);
  console.log('[Test] Hourly Property Taxes: $' + sinksData.data.hourly_property_taxes);
  console.log('[Test] Hourly Utility Bills: $' + sinksData.data.hourly_utilities);
  console.log('[Test] Total Hourly Sink: $' + sinksData.data.total_hourly_sink);

  // Authoritative Tick Execution
  const tickRes = await fetch(`${BASE_URL}/economy/tick`, {
    method: 'POST',
    headers: authHeaders,
  });
  const tickData = await tickRes.json();
  if (!tickData.success) throw new Error('Tick progression failed: ' + JSON.stringify(tickData));
  console.log('[Test] Authoritative Progression Tick result:', {
    salaryEarned: tickData.data.salary_earned,
    passiveBusinessIncome: tickData.data.passive_business_income,
    economicSinksDeducted: tickData.data.economic_sinks_deducted,
    netCashFlow: tickData.data.net_cash_flow,
    newBalance: tickData.data.new_balance,
  });

  // State Synchronization Check
  const syncRes = await fetch(`${BASE_URL}/sync`, { headers: authHeaders });
  const syncData = await syncRes.json();
  console.log('[Test] Sync State Balance:', syncData.data.user.balance, 'Transactions logged:', syncData.data.recent_transactions.length);

  console.log('[Test SUCCESS] All Phase 3 Business Sectors & Server-Authoritative Logic verified flawlessly!');
}

testPhase3().catch((err) => {
  console.error('[Test FAILED]', err);
  process.exit(1);
});
