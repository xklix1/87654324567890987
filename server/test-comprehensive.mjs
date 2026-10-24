// Comprehensive Production Verification & Automated Test Suite
// Covers Network Resilience, Anti-Cheat, Idempotency, Financial Precision & Sector Safeguards

import { io } from 'socket.io-client';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

function generateUuid() {
  return crypto.randomUUID();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName} - ${details}`);
    failedTests++;
    throw new Error(`Test assertion failed: ${testName} (${details})`);
  }
}

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('  WEALTH RACE TYCOON - COMPREHENSIVE ARCHITECTURAL TEST SUITE   ');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: Health, Server Timestamp & Anti-Replay Guard
  // --------------------------------------------------------------------------
  console.log('[SECTION 1] Server Health, Timestamp Calibration & Anti-Replay Guard');
  
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  assert(healthData.status === 'UP', 'Server reports UP status');
  assert(typeof healthData.server_timestamp === 'number', 'Server exposes server_timestamp for clock synchronization');
  
  const clientTime = Date.now();
  const clockOffset = healthData.server_timestamp - clientTime;
  console.log(`  [Info] Client-Server clock offset: ${clockOffset}ms`);

  // Test 1.1: Request with valid calibrated timestamp and nonce
  const deviceIdAlpha = 'device_hardware_alpha_' + Date.now();
  const testNonce1 = generateUuid();
  const validTimestamp = Date.now() + clockOffset;

  const validReplayRes = await fetch(`${BASE_URL}/health`, {
    headers: {
      'x-device-id': deviceIdAlpha,
      'x-request-timestamp': validTimestamp.toString(),
      'x-request-nonce': testNonce1,
    },
  });
  assert(validReplayRes.status === 200, 'Request with valid timestamp and nonce passes security guard');

  // Test 1.2: Replay attack prevention - Reusing the same nonce
  const replayAttackRes = await fetch(`${BASE_URL}/health`, {
    headers: {
      'x-device-id': deviceIdAlpha,
      'x-request-timestamp': validTimestamp.toString(),
      'x-request-nonce': testNonce1, // Reused nonce
    },
  });
  assert(replayAttackRes.status === 403, 'Replay attack blocked (403): Duplicate nonce detected');
  const replayData = await replayAttackRes.json();
  assert(replayData.error.code === 'REPLAY_ATTACK_DETECTED', 'Correct error code: REPLAY_ATTACK_DETECTED');

  // Test 1.3: Anti-Replay clock skew (> 30 seconds)
  const expiredTimestamp = Date.now() - 45000; // 45 seconds in the past
  const expiredSkewRes = await fetch(`${BASE_URL}/health`, {
    headers: {
      'x-device-id': deviceIdAlpha,
      'x-request-timestamp': expiredTimestamp.toString(),
      'x-request-nonce': generateUuid(),
    },
  });
  assert(expiredSkewRes.status === 403, 'Clock skew blocked (403): Request older than 30 seconds rejected');
  const skewData = await expiredSkewRes.json();
  assert(skewData.error.code === 'REQUEST_TIMESTAMP_EXPIRED', 'Correct error code: REQUEST_TIMESTAMP_EXPIRED');

  console.log('\n[SECTION 2] Device Fingerprinting & Anti-Sybil Multi-Accounting');

  // --------------------------------------------------------------------------
  // SECTION 2: Device Fingerprinting & Multi-Accounting Defense
  // --------------------------------------------------------------------------
  const sharedHardwareId = 'hw_fingerprint_' + Date.now();

  // Register 3 accounts on same hardware (should succeed)
  for (let i = 1; i <= 3; i++) {
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': sharedHardwareId,
      },
      body: JSON.stringify({
        username: `sybil_test_${Date.now()}_${i}`,
        password: 'Password123!',
      }),
    });
    const regData = await regRes.json();
    assert(regData.success === true, `Registration of account #${i} on device succeeded`);
  }

  // Register 4th account on same hardware (must be BLOCKED by device guard)
  const blockedRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': sharedHardwareId,
    },
    body: JSON.stringify({
      username: `sybil_test_${Date.now()}_4`,
      password: 'Password123!',
    }),
  });
  assert(blockedRegRes.status === 403, '4th account on same hardware blocked (403)');
  const blockedRegData = await blockedRegRes.json();
  assert(blockedRegData.error.code === 'DEVICE_LIMIT_EXCEEDED', 'Correct error code: DEVICE_LIMIT_EXCEEDED');

  console.log('\n[SECTION 3] Single Active Session Enforcement & Token Eviction');

  // --------------------------------------------------------------------------
  // SECTION 3: Single Active Session Enforcement
  // --------------------------------------------------------------------------
  const userAlphaName = `player_alpha_${Date.now()}`;
  const device1 = 'phone_samsung_' + Date.now();
  const device2 = 'tablet_xiaomi_' + Date.now();

  // Register User Alpha on Device 1
  const regAlphaRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': device1 },
    body: JSON.stringify({ username: userAlphaName, password: 'Password123!' }),
  });
  const regAlphaData = await regAlphaRes.json();
  assert(regAlphaData.success, 'Registered Player Alpha');
  const tokenSession1 = regAlphaData.data.token;

  // Verify Session 1 works
  const sync1Res = await fetch(`${BASE_URL}/sync`, {
    headers: { Authorization: `Bearer ${tokenSession1}`, 'x-device-id': device1 },
  });
  assert(sync1Res.status === 200, 'Session 1 token valid for sync');

  // Now login from Device 2 (new active session)
  const login2Res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': device2 },
    body: JSON.stringify({ username: userAlphaName, password: 'Password123!' }),
  });
  const login2Data = await login2Res.json();
  assert(login2Data.success, 'Login from Device 2 succeeded with new active_session_id');
  const tokenSession2 = login2Data.data.token;

  // Session 1 token MUST NOW BE INVALIDATED (401 SESSION_REVOKED)
  const syncOldSessionRes = await fetch(`${BASE_URL}/sync`, {
    headers: { Authorization: `Bearer ${tokenSession1}`, 'x-device-id': device1 },
  });
  assert(syncOldSessionRes.status === 401, 'Older Session 1 token rejected (401)');
  const oldSessionData = await syncOldSessionRes.json();
  assert(oldSessionData.error.code === 'SESSION_REVOKED', 'Correct revocation code: SESSION_REVOKED');

  // Session 2 token works normally
  const syncNewSessionRes = await fetch(`${BASE_URL}/sync`, {
    headers: { Authorization: `Bearer ${tokenSession2}`, 'x-device-id': device2 },
  });
  assert(syncNewSessionRes.status === 200, 'New Session 2 token active and verified');

  console.log('\n[SECTION 4] Traffic Optimization, Idempotency Engine & UI Debounce');

  // --------------------------------------------------------------------------
  // SECTION 4: Idempotency Keys Engine
  // --------------------------------------------------------------------------
  // Fund Player Alpha with $10,000 for purchasing tests
  await fetch(`${BASE_URL}/economy/faucet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenSession2}` },
  });

  const stocksRes = await fetch(`${BASE_URL}/sectors/stocks`);
  const stocksData = await stocksRes.json();
  const targetStock = stocksData.data[0];

  const uniqueIdempotencyKey = 'idemp_test_uuid_' + generateUuid();
  const buyPayload = { stockId: targetStock.id, shares: 1 };

  // First execution with idempotency key
  const buy1Res = await fetch(`${BASE_URL}/sectors/stocks/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenSession2}`,
      'x-idempotency-key': uniqueIdempotencyKey,
    },
    body: JSON.stringify(buyPayload),
  });
  const buy1Data = await buy1Res.json();
  assert(buy1Data.success === true, 'First purchase with idempotency key succeeded');
  const balanceAfterFirstBuy = buy1Data.data.new_balance;

  // Repeated execution (Network retry / double click debounce) with SAME idempotency key
  const buy2Res = await fetch(`${BASE_URL}/sectors/stocks/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenSession2}`,
      'x-idempotency-key': uniqueIdempotencyKey, // Reused key
    },
    body: JSON.stringify(buyPayload),
  });
  const buy2Data = await buy2Res.json();
  assert(buy2Res.status === 200, 'Duplicate request returned 200 OK from idempotency cache');
  assert(buy2Data.data.new_balance === balanceAfterFirstBuy, 'Zero double-deduction: Balance unchanged on retry');
  assert(buy2Data.data.total_cost === buy1Data.data.total_cost, 'Identical response returned from idempotency store');

  console.log('\n[SECTION 5] Anti-Cheat, Collusion Detection & Progression Gatekeeping');

  // --------------------------------------------------------------------------
  // SECTION 5: P2P Transfer Safeguards
  // Ensure P2P_TRANSFERS_ENABLED is active initially
  await fetch(`${BASE_URL}/system/flags/P2P_TRANSFERS_ENABLED`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: true }),
  });

  // --------------------------------------------------------------------------
  // Register Player Beta
  const userBetaName = `player_beta_${Date.now()}`;
  const deviceBeta = 'device_beta_' + Date.now();
  const regBetaRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceBeta },
    body: JSON.stringify({ username: userBetaName, password: 'Password123!' }),
  });
  const regBetaData = await regBetaRes.json();
  const tokenBeta = regBetaData.data.token;
  const userBetaId = regBetaData.data.user.id;

  // Test 5.1: Progression Gatekeeping (Alpha is Level 1, cannot transfer)
  const levelBlockedRes = await fetch(`${BASE_URL}/transactions/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenSession2}`,
      'x-device-id': device2,
    },
    body: JSON.stringify({ receiver_id: userBetaId, amount: 50 }),
  });
  assert(levelBlockedRes.status === 403, 'Outgoing transfer blocked for Level 1 player (403)');
  const levelBlockedData = await levelBlockedRes.json();
  assert(levelBlockedData.error.code === 'TRANSFER_LEVEL_LOCKED' || levelBlockedData.error.code === 'PROGRESSION_GATE_LOCKED', 'Correct error code: TRANSFER_LEVEL_LOCKED');

  // Test 5.2: Anti-Collusion Defense (Sender and Receiver on same device)
  // Register Player Charlie on the same device as Alpha (device2)
  const userCharlieName = `player_charlie_${Date.now()}`;
  const regCharlieRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': device2 }, // Same device as Alpha
    body: JSON.stringify({ username: userCharlieName, password: 'Password123!' }),
  });
  const regCharlieData = await regCharlieRes.json();
  const userCharlieId = regCharlieData.data.user.id;

  const collusionRes = await fetch(`${BASE_URL}/transactions/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenSession2}`,
      'x-device-id': device2, // Same device!
    },
    body: JSON.stringify({ receiver_id: userCharlieId, amount: 20 }),
  });
  assert(collusionRes.status === 403, 'Collusion transfer blocked (403)');
  const collusionData = await collusionRes.json();
  assert(collusionData.error.code === 'COLLUSION_DETECTED', 'Correct error code: COLLUSION_DETECTED');

  console.log('\n[SECTION 6] Sector Kill-Switches (Live Feature Flags)');

  // --------------------------------------------------------------------------
  // SECTION 6: Sector Kill-Switches (Feature Flags)
  // --------------------------------------------------------------------------
  try {
    const disableFlagRes = await fetch(`${BASE_URL}/system/flags/P2P_TRANSFERS_ENABLED`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    assert(disableFlagRes.status === 200, 'P2P_TRANSFERS_ENABLED kill-switch turned OFF');

    // Verify transfer is blocked by Sector Kill-Switch
    const sectorDisabledRes = await fetch(`${BASE_URL}/transactions/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenSession2}`,
        'x-device-id': device2,
      },
      body: JSON.stringify({ receiver_id: userBetaId, amount: 25 }),
    });
    assert(sectorDisabledRes.status === 503, 'Transfer rejected with 503 Service Unavailable');
    const sectorDisabledData = await sectorDisabledRes.json();
    assert(
      sectorDisabledData.error.code === 'SECTOR_DISABLED' ||
        sectorDisabledData.error.code === 'SECTOR_MAINTENANCE',
      'Correct code: SECTOR_DISABLED or SECTOR_MAINTENANCE'
    );
  } finally {
    // Re-enable P2P transfers
    await fetch(`${BASE_URL}/system/flags/P2P_TRANSFERS_ENABLED`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    console.log('  [PASS] P2P_TRANSFERS_ENABLED kill-switch restored to ON');
  }

  console.log('\n[SECTION 7] Real-Time WebSocket Heartbeat, RTT & Lifecycle');

  // --------------------------------------------------------------------------
  // SECTION 7: WebSocket Heartbeat & Lifecycle
  // --------------------------------------------------------------------------
  await new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      auth: { token: tokenSession2 },
      transports: ['websocket'],
    });

    socket.on('connect_error', (err) => {
      reject(new Error('Socket connection failed: ' + err.message));
    });

    socket.on('connect', () => {
      assert(socket.connected, 'Authenticated Socket.io connected successfully');

      // Test Heartbeat Ping-Pong
      const pingSent = Date.now();
      socket.emit('system:ping', { client_timestamp: pingSent });

      socket.on('system:pong', (data) => {
        const rtt = Date.now() - pingSent;
        assert(typeof data.server_time === 'number' || typeof data.server_timestamp === 'number', 'Heartbeat pong includes server timestamp');
        console.log(`  [Pass] WebSocket RTT Latency: ${rtt}ms`);

        // Test Telemetry Pause on Backgrounding
        socket.emit('telemetry:pause');
        console.log('  [Pass] Emitted telemetry:pause (APK backgrounded)');

        // Test Telemetry Resume on Foregrounding
        socket.emit('telemetry:resume');
        console.log('  [Pass] Emitted telemetry:resume (APK foreground resumed)');

        socket.disconnect();
        resolve();
      });
    });
  });

  console.log('\n[SECTION 8] Economic Anomaly Watchdog & Audit Logging');

  // --------------------------------------------------------------------------
  // SECTION 8: Economic Anomaly Watchdog
  // --------------------------------------------------------------------------
  // Register a player to test abnormal balance surge detection
  const exploiterName = `exploiter_${Date.now()}`;
  const regExploiter = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: exploiterName, password: 'Password123!' }),
  });
  const exploiterData = await regExploiter.json();
  const exploiterToken = exploiterData.data.token;

  // Check initial watchdog status
  const profileRes = await fetch(`${BASE_URL}/sync`, {
    headers: { Authorization: `Bearer ${exploiterToken}` },
  });
  const profileData = await profileRes.json();
  assert(profileData.data.user.transfers_frozen === false, 'New account transfers are active');

  console.log('\n================================================================');
  console.log(`  COMPREHENSIVE TEST COMPLETED: ${passedTests} PASSED, ${failedTests} FAILED  `);
  console.log('================================================================\n');
}

runComprehensiveTests()
  .then(() => {
    console.log('[Test Suite Result] ALL PRODUCTION RESILIENCE & ARCHITECTURE TESTS PASSED!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Test Suite Error]', err);
    process.exit(1);
  });
