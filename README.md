# Wealth Race (سباق الثراء) - Architecture & Implementation (Phases 1 - 5)

Real-time multiplayer financial tycoon game built for Android APK deployment with web, Capacitor, and Cordova compatibility.

## 1. Engineering and Design Standards Compliance

- **Zero-Emoji Policy**: Strictly enforced across all UI components, buttons, notifications, error alerts, system logs, code comments, and documentation. All icons utilize geometric SVG glyphs via `lucide-react`.
- **Strict TypeScript**: 100% type safety with strict compiler flags (`noImplicitAny: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`), with zero usage of the `any` type across the entire codebase.
- **Design System**: Modern dark financial dashboard theme (`#070b14` obsidian base, slate-900 panels, emerald `#10b981` wealth accents, gold `#f59e0b` status badges, cyan `#06b6d4` telemetry), structured on an **8px layout grid scale**. Full bidirectional **RTL and LTR support** is built-in with the Google Fonts **Cairo** font family for authentic Arabic financial typography.
- **Component Coverage**: 4-state component architecture (`loading`, `error`, `empty`, `success`) integrated across all view layers and verifiable via the built-in **Component 4-States Inspector**.

---

## 2. Directory Structure

```
سباق الثراء/
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_seed_data.sql
│   │   └── 003_anti_fraud_and_transfers.sql
│   └── run_migrations.ts
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── db/
│   │   │   ├── pool.ts
│   │   │   └── store.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   ├── rate-limit.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.schema.ts
│   │   │   │   └── auth.service.ts
│   │   │   ├── sync/
│   │   │   │   ├── sync.controller.ts
│   │   │   │   └── sync.service.ts
│   │   │   ├── transfer/
│   │   │   │   ├── transfer.controller.ts
│   │   │   │   ├── transfer.schema.ts
│   │   │   │   └── transfer.service.ts
│   │   │   └── version/
│   │   │       ├── version.controller.ts
│   │   │       └── version.service.ts
│   │   ├── routes/
│   │   │   └── api.routes.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── AuthCard.tsx
│   │   │   ├── common/
│   │   │   │   ├── ComponentStateWrapper.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── MainDashboard.tsx
│   │   │   │   ├── OfflineEarningsModal.tsx
│   │   │   │   ├── StatCard.tsx
│   │   │   │   ├── StateInspectorBar.tsx
│   │   │   │   └── TransferModal.tsx
│   │   │   └── splash/
│   │   │       ├── ForceUpdateModal.tsx
│   │   │       ├── PipelineStepTracker.tsx
│   │   │       └── SplashScreen.tsx
│   │   ├── config/
│   │   │   └── version.ts
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   └── LanguageContext.tsx
│   │   ├── hooks/
│   │   │   └── useInitializationPipeline.ts
│   │   ├── services/
│   │   │   ├── api.client.ts
│   │   │   ├── auth-and-sync.service.ts
│   │   │   ├── system.service.ts
│   │   │   └── transfer.service.ts
│   │   ├── types/
│   │   │   ├── common.ts
│   │   │   ├── sync.ts
│   │   │   └── user.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── package.json
└── README.md
```

---

## 3. Database Concurrency & Atomic Transactions (Phase 2)

### Atomic Transaction Wrapper
Implemented in `server/src/db/pool.ts` (`withTransaction<T>`) and `server/src/db/store.ts`. All financial operations (P2P transfers, salary accruals, balance updates) run within an atomic transaction boundary with automatic `BEGIN`, `COMMIT`, and `ROLLBACK` on errors.

### Row-Level Locking (`SELECT ... FOR UPDATE`)
- When executing peer-to-peer transfers, row-level locks are acquired on participant user rows using `SELECT id, username, balance FROM users WHERE id = $1 FOR UPDATE`.
- **Deadlock Prevention Algorithm**: Participant UUIDs are sorted lexicographically before acquiring row locks (`[senderId, receiverId].sort()`), eliminating potential circular deadlocks during concurrent bidirectional transfers.
- Concurrency isolation verifies that liquid balance (`balance >= amount + fee`) is validated exclusively under the acquired row lock.
- In-memory fallback mode utilizes an `AsyncMutex` serialized execution queue ensuring identical atomicity guarantees when PostgreSQL is offline.

---

## 4. Anti-Fraud Engine & P2P Transfer Limits (Phase 2)

- **Self-Transfer Elimination**: Direct rejection of transactions where `sender_id === receiver_id` (`SELF_TRANSFER_PROHIBITED`).
- **Percentage-Based Fee**: Dynamic calculation of network fee (default: `2.5%`) on all P2P money transfers (`P2P_TRANSACTION_FEE_PERCENT`). Total deduction from sender equals `amount + fee`; recipient receives exact requested principal.
- **Rolling 24-Hour Cap**: Strict daily ceiling enforcement (default: `$10,000.00` via `P2P_DAILY_TRANSFER_LIMIT`). The system aggregates all completed P2P transfers within the preceding 24 hours (`NOW() - INTERVAL '24 hours'`) and rejects attempts exceeding the quota with `DAILY_LIMIT_EXCEEDED`.
- **Server-Side Zod Validation**:
  - `receiver_id`: strictly validated UUID format.
  - `amount`: strictly positive numeric value, `min: $1.00`, `max: $5,000.00`. Negative numbers, zero, NaN, infinite values, and non-numeric inputs are rejected with `VALIDATION_ERROR` (HTTP 422).
  - `note`: optional trimmed memo string capped at 100 characters.

---

## 5. Rate Limiting & API Security (Phase 2)

- **General API Limiter**: 100 requests per 15-minute window on all `/api/*` routes.
- **Authentication Limiter**: 15 requests per 15-minute window on `/api/auth/login` and `/api/auth/register` to block automated credential stuffing and brute-force attacks.
- **Financial Transactions Limiter**: 20 requests per 15-minute window on `/api/transactions/transfer` to protect against bot-driven automated flooding.
- Standard headers enabled (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`).
- Structured rejection payloads (`code: 'TOO_MANY_REQUESTS'`).
- Strict verification of signed JWT session tokens on all sensitive endpoints (`/api/auth/verify`, `/api/sync`, `/api/transactions/transfer`, `/api/transactions/quota`, `/api/transactions/recipients`).

---

## 6. Client Transfer UI & 4-State Coverage (Phase 2)

- **Interactive Transfer Modal (`TransferModal.tsx`)**:
  - Accessible via the prominent **Send P2P Transfer** action button on the dashboard.
  - Recipient selection dropdown populated via authenticated `/transactions/recipients`.
  - Real-time mathematical preview calculating transfer amount, 2.5% fee breakdown, and total liquid deduction.
  - 24-Hour Quota Telemetry Meter displaying rolling usage against the `$10,000.00` daily ceiling.
  - 4-State coverage: Loading spinner, Error recovery, Success receipt card, and Empty validations.
- **Ledger Badges**: Transactions ledger showcases transaction status (`COMPLETED`) and network fees (`Fee: -$X.XX`).

---

## 7. Verification and Automated Test Results

Automated test suite execution log:
```
[TEST 1] Registering User A (Alice)... -> balance: $1,000.00
[TEST 2] Registering User B (Bob)...   -> balance: $1,000.00
[TEST 3] Anti-Fraud: Reject Self-Transfer -> rejected (code: SELF_TRANSFER_PROHIBITED)
[TEST 4] Anti-Fraud: Reject Negative Amount via Zod -> rejected (code: VALIDATION_ERROR)
[TEST 5] Anti-Fraud: Reject Malformed UUID -> rejected (code: VALIDATION_ERROR)
[TEST 6] Anti-Fraud: Reject Insufficient Balance -> rejected (code: INSUFFICIENT_FUNDS)
[TEST 7] Valid Atomic P2P Transfer:
  - Alice sends $200.00 to Bob
  - Fee (2.5%): $5.00
  - Total deducted: $205.00
  - Alice balance: $795.00
  - Bob balance: $1,200.00
[TEST 8] Quota Telemetry:
  - Transferred today: $200.00
  - Remaining 24h cap: $9,800.00
[ALL PHASE 2 BACKEND SECURITY TESTS PASSED]
```

---

## 8. Phase 3: Game Mechanics & Server-Authoritative Business Sectors

### Core Game Mechanics & Economic Engine
1. **Salary Ticking Engine**:
   - Server-side authoritative calculation of hourly wages according to active job tier.
   - Accrues progression automatically on `/api/sync` and `/api/economy/tick`.
   - Bounded by maximum offline duration limits (`OFFLINE_PROGRESSION_MAX_HOURS = 24`).
2. **Economic Sinks**:
   - Automated periodic deductions to counter inflation:
     - **Maintenance**: Real estate structural upkeep, showroom capacity maintenance ($25/slot/hr), airport runways ($150/runway/hr) & lounges ($60/lounge/hr), factory operating overhead, and farm machinery upkeep.
     - **Asset Taxes**: Property tax assessments levied against commercial, residential, and retail holdings.
     - **Utility Bills**: Factory electrical load ($35/automation level/hr), farm irrigation power systems ($20/hr base), and cryptocurrency mining rig electricity consumption (`(Watts / 1000) * $0.12/kWh`).

### Business Sectors & Investment Systems
- **Sector 1: Stock Market (`/api/sectors/stocks`)**:
  - Dynamic securities trading system (`WRTC`, `GLDX`, `CYBN`, `AGRO`, `AERO`).
  - Geometric Brownian motion with mean-reversion price volatility walk updated automatically via server loop every 60 seconds.
  - Strict atomic buying and selling with real-time portfolio market valuation and unrealized profit/loss calculation.
- **Sector 2: Real Estate & Small Businesses (`/api/sectors/real-estate`)**:
  - Acquisition of retail stores, espresso bars, commercial plazas, and luxury residential towers.
  - Generates passive income per hour.
  - Tiered upgrade system multiplying hourly yield and increasing property valuation.
- **Sector 3: Car Dealerships (`/api/sectors/dealership`)**:
  - Manufacturing supply contracts for sedans, SUVs, luxury limousines, and exotic hypercars.
  - Showroom display slots constrained by capacity.
  - Customer purchase fulfillment crediting retail markup profits to balance.
  - Showroom expansions and customer service tier upgrades boosting sale margins.
- **Sector 4: Airport Tycoon (`/api/sectors/airport`)**:
  - Fleet management purchasing turboprops, regional jets, wide-body airliners, and supersonic cruisers.
  - Flight route dispatching (Domestic Express, Trans-Continental, Global Financial Shuttle).
  - Server-authoritative prep cost deductions (fuel consumption factors and maintenance).
  - Airport hub expansions: runway slots, passenger capacity, waiting lounges, and duty-free shopping malls.
- **Sector 5: Production Factories (`/api/sectors/factory`)**:
  - Raw material procurement (Iron Ore, Silicon Ingots, Microchips, Polymers).
  - Configurable production lines (Structural Steel Beams, Solar Wafers, Avionics, Composite Casing).
  - Manufacturing cycle loop execution converting raw materials into high-value industrial goods.
  - Automation level upgrades (increasing speed/yield) and storage capacity expansions.
- **Sector 6: Agricultural Farms (`/api/sectors/farm`)**:
  - Crop cultivation (Organic Wheat, Medjool Dates) and livestock breeding (Dairy Cattle, Thoroughbred Horses).
  - Land holding constraints enforcing acre allocation limits.
  - Irrigation tier upgrades (accelerating growth duration), greenhouse tiers (multiplying market yields), and heavy machinery upgrades (reducing operational costs).
- **Sector 7: Import/Export Logistics Company (`/api/sectors/import-export`)**:
  - International shipping contracts across Middle East, European, Asian, and American trade corridors.
  - Shipping fleet dispatching with vessel voyage tracking and customs clearances.
  - Customs warehousing capacity management (TEU).
  - Logistics tier upgrades unlocking higher-tier maritime contracts.
- **Sector 8: Cryptocurrency Mining (`/api/sectors/crypto`)**:
  - Mineable cryptocurrencies with live difficulty and block rewards (`BTC`, `ETH`, `SLV`).
  - Mining rig fleet acquisition (RTX 4080 Super, RTX 4090 Tycoon Rig, ASIC AntMiner, Quantum Hash Blade).
  - Real-time hashrate yield computation and electricity power consumption cost calculations.
  - Authoritative claiming of mined rewards converted into liquid capital.

---

## 9. Phase 3 Verification Results

Execution log from the automated end-to-end integration test (`server/test-phase3.mjs`):
```
[Test] Health status: UP Database mode: TRANSACTIONAL_MEMORY_FALLBACK
[Test] Registered user: tycoon Starting balance: 1000
[Test 1/8] Stock Market: Bought 2 WRTC ($300), Portfolio verified, Sold 1 WRTC ($150) -> Balance updated atomically
[Test 2/8] Real Estate: Bought Convenience Store ($15,000, $180/hr), Upgraded to Level 2 ($243/hr)
[Test 3/8] Car Dealerships: Displayed EcoRunner Sedan, Sold for $15,500 proceeds, Expanded Showroom capacity to 6
[Test 4/8] Airport Tycoon: Purchased SkyCommuter Turboprop ($35,000), Dispatched Flight (Route 1, Prep cost: $730), Upgraded Runways to 2
[Test 5/8] Factories: Bought 100 Iron Ore ($1,500), Created Line, Executed Cycle (+$1,120 revenue), Upgraded Storage to 1500
[Test 6/8] Farms: Planted Organic Golden Wheat (4 acres utilized, $2,600 yield value), Upgraded Irrigation Tier to 2
[Test 7/8] Import/Export: Dispatched MV Wealth Navigator on Middle East Gateway, Upgraded Warehouse to 500 TEU
[Test 8/8] Crypto Mining: Selected ETH, Installed RTX 4090 Tycoon Rig (190 MH/s, 450W), Electricity Cost: $0.054/hr
[Test Economic Engine] Calculated Hourly Sinks: Maintenance: $614.00, Taxes: $29.16, Utilities: $55.05 -> Total Sink: $698.21/hr
[Test Authoritative Engine] Tick Progression & State Synchronization verified
[ALL PHASE 3 BUSINESS SECTORS & SERVER-AUTHORITATIVE LOGIC VERIFIED FLAWLESSLY]
```

---

## 10. Phase 4: Real-Time Communication, Social Economy & Progression

### Real-Time Socket.io Integration
1. **Secure Handshake Authentication**:
   - Every Socket.io client connection verifies a signed JWT token provided via `socket.handshake.auth.token` or `socket.handshake.headers.authorization`.
   - Invalid or expired tokens are immediately rejected with descriptive error payloads before any room subscription occurs.
2. **Channel Isolation & Presence**:
   - Authenticated sockets automatically join `room:global` (Global Broadcast) and their personal room `room:user:${userId}` (Private Messaging).
   - Real-time mapping tracks active user sockets with graceful cleanup upon disconnection.
3. **Strict Input Sanitization & XSS Defense**:
   - All inbound chat messages pass through `sanitizeChatMessage()` which escapes HTML characters (`&`, `<`, `>`, `"`, `'`, `/`, backticks).
   - Enforces the **Zero-Emoji Policy** by stripping all emoji Unicode code points.
   - Enforces character bounds (1 to 500 characters) and strips non-printable control characters.

### Leaderboard & Player Profiles (Rich List)
1. **Global Leaderboard (Rich List)**:
   - Real-time aggregated net worth ranking: `net_worth = liquid_cash + total_assets_value`.
   - Comprehensive asset valuation querying real estate holdings, stock portfolios, car dealership inventory, airport aircraft fleets, factory production lines & materials, agricultural farm land & batches, import/export cargo voyages, and active cryptocurrency mining rigs.
   - Real-time broadcast telemetry via Socket.io event `leaderboard:update` and RESTful endpoint `/api/social/leaderboard`.
2. **Player Profiles**:
   - Comprehensive profile telemetry displaying liquid cash, total net worth, individual asset category values, active job title, joined date, player level, and unlocked achievements count (`/api/social/profile` and `/api/social/profile/:userId`).
   - Dynamic prestige titles determined by wealth milestones (`Novice Entrepreneur`, `Corporate Magnate`, `Venture Capitalist`, `Financial Titan`, `High-Roller Sovereign`, `Apex Global Oligarch`).

### Progressive Achievements System
1. **Milestone Tracking Engine**:
   - Progressive objectives evaluated on-the-fly based on live player actions:
     - `FIRST_TRADE`: First securities trade on the exchange ($500.00, 100 XP).
     - `ESTATE_ACQUISITION`: First commercial property acquired ($2,000.00, 250 XP).
     - `SHOWROOM_SHOWCASE`: Order and display vehicle in dealership ($1,500.00, 200 XP).
     - `AVIATION_DISPATCH`: Dispatch aircraft on route ($2,500.00, 300 XP).
     - `INDUSTRIAL_CYCLE`: Complete manufacturing loop ($1,800.00, 250 XP).
     - `AGRICULTURAL_HARVEST`: Cultivate and harvest crops/livestock ($1,200.00, 180 XP).
     - `GLOBAL_EXPEDITION`: Dispatch international cargo shipment ($3,000.00, 350 XP).
     - `CRYPTO_PROSPECTOR`: Install active GPU mining rig ($1,500.00, 220 XP).
     - `WEALTH_TIER_1`: Accumulate $100,000.00 net worth ($10,000.00, 1,000 XP).
     - `WEALTH_TIER_2`: Accumulate $500,000.00 net worth ($50,000.00, 2,500 XP).
     - `SOCIAL_NETWORKER`: Execute peer-to-peer money transfer ($500.00, 150 XP).
2. **Authoritative Claiming**:
   - Rewards are claimed via `POST /api/progression/achievements/claim`.
   - Atomically credits cash prizes to the player's balance with an `ACHIEVEMENT_REWARD` transaction log.
   - Awards XP points, advances player level, and guards against duplicate claims.

---

## 11. Phase 4 Verification Results

Execution log from the automated end-to-end integration test (`server/test-phase4.mjs`):
```
[Test Phase 4] Initializing Real-Time Communication, Social Economy & Progression test...
[Test] Registered Tycoon Alpha: tycoon_alpha_1792621561726
[Test] Registered Tycoon Beta: tycoon_beta_1792621561726
[Test 1/5] Testing Socket.io JWT Authentication...
[Test PASS] Unauthenticated socket rejected cleanly: Authentication failed: Token expired or signature invalid.
[Test 2/5] Establishing Authenticated Real-Time Sockets for Alpha and Beta...
[Test PASS] Both Alpha and Beta connected with authenticated session sockets.
[Test 3/5] Testing Real-Time Global Chat & XSS Sanitization...
[Test PASS] Beta received global message in real-time: &lt;script&gt;alert(&quot;malicious_xss&quot;)&lt;&#x2F;script&gt; Financial Report 2026
[Test PASS] XSS defense verified: Script tags escaped safely.
[Test 4/5] Testing Real-Time Private Direct Messaging...
[Test PASS] Direct message received by Beta: Private trade inquiry: Looking to acquire equity in your logistics fleet.
[Test PASS] Direct notification received by Beta from: tycoon_alpha_1792621561726
[Test 5/5] Testing Global Rich List & Achievements Progression...
[Test PASS] Leaderboard rankings count: 2
[Test PASS] Top Rank #1 Tycoon: tycoon_beta_1792621561726 Net Worth: $892000
[Test PASS] Player Profile for Alpha: { username: 'tycoon_alpha_1792621561726', title: 'Financial Titan', level: 1, netWorth: 887800, liquidCash: 484527, totalAssets: 403273 }
[Test PASS] Achievements count: 11
[Test] FIRST_TRADE achievement status: { code: 'FIRST_TRADE', unlocked: true, claimed: false, progress: 1 }
[Test PASS] Claimed achievement reward successfully: { code: 'FIRST_TRADE', cashReward: 500, xpReward: 100, newBalance: 485027, newLevel: 2 }
[Test PASS] Duplicate achievement claim rejected cleanly (Code: ALREADY_CLAIMED).
[ALL PHASE 4 REAL-TIME COMMUNICATION, SOCIAL ECONOMY & PROGRESSION FEATURES VERIFIED FLAWLESSLY]
```

---

## 12. Phase 5: Frontend UI/UX Dashboard & Integration

### 12.1 Engineering & Design Standards Compliance
- **Zero-Emoji Policy**: Zero emojis anywhere in components, notifications, buttons, and badges. All visual indicators use curated SVG iconography from `lucide-react`.
- **Strict TypeScript**: 100% strict type safety across all frontend components, hooks, services, and models with zero usage of `any`.
- **Financial Design System**: Dark dashboard aesthetics (`#070b14` base, slate-900 glass panels, emerald wealth accents, cyan telemetry, gold milestones), 8px layout grid scale, and bidirectional RTL/LTR support with Google Fonts **Cairo** typography.
- **Strict 4-State Coverage**: `loading`, `error`, `empty`, and `success` states cleanly implemented for all sector, social, and progression components using `ComponentStateWrapper` and inspectable via `StateInspectorBar`.

### 12.2 Implemented Component Tree & Modules
1. **Main Dashboard & Navigation**:
   - `client/src/components/dashboard/MainDashboard.tsx`: Persistent cash balance tracker, quick navigation tab bar, and financial overview.
   - `client/src/components/sectors/EconomyControlBar.tsx`: Sinks telemetry (hourly taxes, maintenance, net flow), acceleration ticks, and dev fund grants.
2. **Interactive Business Sector Views**:
   - `client/src/components/sectors/JobsView.tsx`: Career tiers and passive salary accruals.
   - `client/src/components/sectors/StocksView.tsx`: Real-time stock ticker, portfolio tracking, and interactive Buy/Sell execution modal.
   - `client/src/components/sectors/RealEstateView.tsx`: Property acquisition catalog, passive rental yield tracking, and tier upgrades.
   - `client/src/components/sectors/DealershipView.tsx`: Showroom inventory, vehicle contracts, car sales, and showroom floor expansions.
   - `client/src/components/sectors/AirportView.tsx`: Commercial aircraft procurement, flight dispatching on routes, landing revenue collection, and terminal upgrades.
   - `client/src/components/sectors/FactoryView.tsx`: Raw material warehouse sourcing, assembly line commissioning, and production cycles.
   - `client/src/components/sectors/FarmView.tsx`: Crop seed catalog, acreage allocation, crop batch cultivation, and harvest liquidation.
   - `client/src/components/sectors/LogisticsView.tsx`: Commercial shipping contracts, container vessel voyages, and dock expansions.
   - `client/src/components/sectors/CryptoView.tsx`: Blockchain algorithm selection, ASIC rig hardware deployment, and uncashed vault liquidation.
3. **Social & Communication Views**:
   - `client/src/components/social/LeaderboardView.tsx`: Global Rich List with real-time Socket.io updates, net worth ranks, and player profile inspection.
   - `client/src/components/social/ProfileView.tsx`: Comprehensive portfolio audit and 8-sector asset breakdown.
   - `client/src/components/social/ChatPanel.tsx`: Real-time Global and Direct chat with anti-XSS sanitization and auto-scrolling message streams.
   - `client/src/components/dashboard/TransferModal.tsx`: P2P money transfers with 2.5% fee calculation, daily cap guards, and row-level locking.
4. **Progression & Achievement Engine**:
   - `client/src/components/progression/AchievementsView.tsx`: 11 progressive milestone objectives with live progress tracking, atomic prize claims, and celebratory toasts.
   - `client/src/context/ToastContext.tsx`: Universal toast notification container supporting achievements, trades, and system alerts without emojis.
5. **Real-Time WebSocket Integration**:
   - `client/src/services/socket.service.ts`: Bidirectional Socket.io client with automatic reconnect, JWT auth handshake, and event pub/sub.



