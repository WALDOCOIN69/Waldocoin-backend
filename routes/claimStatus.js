import express from 'express';
import fs from 'fs';

const router = express.Router();

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync('./db.json'));
  } catch {
    return { users: {}, rewards: {} };
  }
}

function getLevelFromXP(xp) {
  if (xp >= 1500) return 5;
  if (xp >= 1000) return 4;
  if (xp >= 500) return 3;
  if (xp >= 250) return 2;
  return 1;
}

function getStakingMultiplierFromXP(xp) {
  const level = getLevelFromXP(xp);
  const bonusMap = { 1: 1.15, 2: 1.16, 3: 1.17, 4: 1.18, 5: 1.19 };
  const feeMap = { 1: 0.05, 2: 0.045, 3: 0.04, 4: 0.035, 5: 0.03 };
  const bonus = bonusMap[level];
  const fee = feeMap[level];
  return +(bonus * (1 - fee)).toFixed(4); // e.g., 1.0925 for level 1
}

function getMaxBaseForTier(tier) {
  const map = { 1: 36, 2: 72, 3: 180, 4: 900, 5: 1800 };
  return map[tier] || 0;
}

function getBasePerTier(tier) {
  const map = { 1: 1, 2: 2, 3: 5, 4: 25, 5: 50 };
  return map[tier] || 0;
}

router.get('/', (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) return res.status(400).json({ error: "Missing wallet" });

  const db = loadDB();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const rewards = db.rewards?.[wallet]?.[monthKey] || {};

  const userXP = db.users?.[wallet]?.xp || 0;
  const stakingMultiplier = getStakingMultiplierFromXP(userXP);

  const status = {};
  for (let tier = 1; tier <= 5; tier++) {
    const total = (rewards[tier] || []).reduce((sum, r) => sum + (r.amount || 0), 0);
    const max = getMaxBaseForTier(tier);

    if (!rewards[tier] || rewards[tier].length === 0) {
      status[tier] = "Eligible";
    } else if (total >= max) {
      status[tier] = "Tier cap reached";
    } else {
      status[tier] = "Already claimed";
    }
  }

  res.json({
    wallet,
    xp: userXP,
    stakingMultiplier,
    status
  });
});

export default router;