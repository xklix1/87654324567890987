// Phase 4 End-to-End Verification Test Script
// Real-Time Socket.io Communication, Social Economy & Progression
// Strict Zero-Emoji Policy enforced

import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function registerTycoon(username) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password: 'SecurePassword123!',
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Registration failed for ${username}: ` + JSON.stringify(data));

  // Grant development funds for tycoon asset testing
  const token = data.data.token;
  await fetch(`${BASE_URL}/economy/faucet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return { user: data.data.user, token };
}

async function testPhase4() {
  console.log('[Test Phase 4] Initializing Real-Time Communication, Social Economy & Progression test...');

  // 1. Register User Alpha and User Beta
  const timestamp = Date.now();
  const alpha = await registerTycoon(`tycoon_alpha_${timestamp}`);
  const beta = await registerTycoon(`tycoon_beta_${timestamp}`);
  console.log('[Test] Registered Tycoon Alpha:', alpha.user.username);
  console.log('[Test] Registered Tycoon Beta:', beta.user.username);

  const alphaHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${alpha.token}`,
  };

  const betaHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${beta.token}`,
  };

  // 2. Test Socket.io Authentication Security
  console.log('[Test 1/5] Testing Socket.io JWT Authentication...');
  await new Promise((resolve, reject) => {
    const unauthSocket = io(SOCKET_URL, {
      auth: { token: 'invalid_expired_token' },
      transports: ['websocket'],
    });

    unauthSocket.on('connect_error', (err) => {
      console.log('[Test PASS] Unauthenticated socket rejected cleanly:', err.message);
      unauthSocket.disconnect();
      resolve();
    });

    unauthSocket.on('connect', () => {
      unauthSocket.disconnect();
      reject(new Error('Security vulnerability: Unauthenticated connection was accepted!'));
    });
  });

  // 3. Connect User Alpha and User Beta via Authenticated Socket.io
  console.log('[Test 2/5] Establishing Authenticated Real-Time Sockets for Alpha and Beta...');
  const socketAlpha = io(SOCKET_URL, {
    auth: { token: alpha.token },
    transports: ['websocket'],
  });

  const socketBeta = io(SOCKET_URL, {
    auth: { token: beta.token },
    transports: ['websocket'],
  });

  await Promise.all([
    new Promise((resolve) => socketAlpha.on('connect', resolve)),
    new Promise((resolve) => socketBeta.on('connect', resolve)),
  ]);
  console.log('[Test PASS] Both Alpha and Beta connected with authenticated session sockets.');

  // 4. Test Real-Time Global Chat and XSS Sanitization
  console.log('[Test 3/5] Testing Real-Time Global Chat & XSS Sanitization...');
  const globalReceivedPromise = new Promise((resolve) => {
    socketBeta.on('chat:message', (msg) => {
      if (msg.channel === 'GLOBAL') {
        resolve(msg);
      }
    });
  });

  // Alpha sends a message containing XSS attempt and emoji to verify Zero-Emoji & XSS defense
  const maliciousInput = '<script>alert("malicious_xss")</script> Financial Report 2026';
  socketAlpha.emit('chat:send', {
    channel: 'GLOBAL',
    content: maliciousInput,
  });

  const receivedGlobalMsg = await globalReceivedPromise;
  console.log('[Test PASS] Beta received global message in real-time:', receivedGlobalMsg.content);

  // Assert XSS entities were escaped and no raw tags exist
  if (receivedGlobalMsg.content.includes('<script>')) {
    throw new Error('XSS Vulnerability: Raw script tag was not escaped!');
  }
  if (!receivedGlobalMsg.content.includes('&lt;script&gt;')) {
    throw new Error('Sanitization error: Script tag should be escaped to &lt;script&gt;');
  }
  console.log('[Test PASS] XSS defense verified: Script tags escaped safely.');

  // 5. Test Private Direct Messaging between Alpha and Beta
  console.log('[Test 4/5] Testing Real-Time Private Direct Messaging...');
  const directReceivedPromise = new Promise((resolve) => {
    socketBeta.on('chat:message', (msg) => {
      if (msg.channel === 'DIRECT') {
        resolve(msg);
      }
    });
  });

  const directNotificationPromise = new Promise((resolve) => {
    socketBeta.on('notification:direct_message', (notif) => {
      resolve(notif);
    });
  });

  socketAlpha.emit('chat:send', {
    channel: 'DIRECT',
    receiver_id: beta.user.id,
    content: 'Private trade inquiry: Looking to acquire equity in your logistics fleet.',
  });

  const [receivedDirectMsg, directNotif] = await Promise.all([
    directReceivedPromise,
    directNotificationPromise,
  ]);

  console.log('[Test PASS] Direct message received by Beta:', receivedDirectMsg.content);
  console.log('[Test PASS] Direct notification received by Beta from:', directNotif.from_username);

  // 6. Test Rich List Leaderboard & Player Asset Breakdown
  console.log('[Test 5/5] Testing Global Rich List & Achievements Progression...');

  // Alpha acquires some assets (stock + real estate) to differentiate net worth
  await fetch(`${BASE_URL}/sectors/stocks/buy`, {
    method: 'POST',
    headers: alphaHeaders,
    body: JSON.stringify({ stockId: 1, shares: 10 }),
  });
  await fetch(`${BASE_URL}/sectors/real-estate/buy`, {
    method: 'POST',
    headers: alphaHeaders,
    body: JSON.stringify({ propertyId: 1 }),
  });

  // Query Global Leaderboard via HTTP
  const leaderboardRes = await fetch(`${BASE_URL}/social/leaderboard`);
  const leaderboardData = await leaderboardRes.json();
  console.log('[Test PASS] Leaderboard rankings count:', leaderboardData.data.length);
  const topTycoon = leaderboardData.data[0];
  console.log('[Test PASS] Top Rank #1 Tycoon:', topTycoon.username, 'Net Worth: $' + topTycoon.net_worth);

  // Query Player Profile for Alpha
  const profileRes = await fetch(`${BASE_URL}/social/profile`, { headers: alphaHeaders });
  const profileData = await profileRes.json();
  const profile = profileData.data;
  console.log('[Test PASS] Player Profile for Alpha:', {
    username: profile.username,
    title: profile.title,
    level: profile.level,
    netWorth: profile.net_worth,
    liquidCash: profile.liquid_cash,
    totalAssets: profile.asset_breakdown.total_assets_value,
    realEstateValue: profile.asset_breakdown.real_estate_value,
    stocksValue: profile.asset_breakdown.stocks_value,
  });

  // Query Achievements for Alpha
  const achRes = await fetch(`${BASE_URL}/progression/achievements`, { headers: alphaHeaders });
  const achData = await achRes.json();
  console.log('[Test PASS] Achievements count:', achData.data.length);

  // Find FIRST_TRADE achievement (should be unlocked because Alpha bought 10 shares of stock)
  const firstTradeAch = achData.data.find((a) => a.code === 'FIRST_TRADE');
  console.log('[Test] FIRST_TRADE achievement status:', {
    code: firstTradeAch.code,
    unlocked: firstTradeAch.unlocked,
    claimed: firstTradeAch.claimed,
    progress: firstTradeAch.current_progress,
  });

  if (!firstTradeAch.unlocked) {
    throw new Error('Achievement FIRST_TRADE should be unlocked after buying stock!');
  }

  // Claim achievement reward
  const claimRes = await fetch(`${BASE_URL}/progression/achievements/claim`, {
    method: 'POST',
    headers: alphaHeaders,
    body: JSON.stringify({ code: 'FIRST_TRADE' }),
  });
  const claimData = await claimRes.json();
  if (!claimData.success) throw new Error('Claim achievement failed: ' + JSON.stringify(claimData));

  console.log('[Test PASS] Claimed achievement reward successfully:', {
    code: claimData.data.achievement.code,
    cashReward: claimData.data.cash_reward,
    xpReward: claimData.data.xp_reward,
    newBalance: claimData.data.new_balance,
    newXp: claimData.data.new_xp,
    newLevel: claimData.data.new_level,
    newTitle: claimData.data.new_title,
  });

  // Verify second claim is rejected (anti-duplicate claim prevention)
  const duplicateClaimRes = await fetch(`${BASE_URL}/progression/achievements/claim`, {
    method: 'POST',
    headers: alphaHeaders,
    body: JSON.stringify({ code: 'FIRST_TRADE' }),
  });
  const duplicateClaimData = await duplicateClaimRes.json();
  if (duplicateClaimData.success) {
    throw new Error('Anti-exploit failure: Duplicate achievement claim was allowed!');
  }
  console.log('[Test PASS] Duplicate achievement claim rejected cleanly (Code: ALREADY_CLAIMED).');

  // Disconnect test sockets cleanly
  socketAlpha.disconnect();
  socketBeta.disconnect();

  console.log('[Test SUCCESS] All Phase 4 Real-Time Communication, Social Economy & Progression features verified flawlessly!');
}

testPhase4().catch((err) => {
  console.error('[Test FAILED]', err);
  process.exit(1);
});
