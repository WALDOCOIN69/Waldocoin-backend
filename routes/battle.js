import express from 'express';
import fs from 'fs';
import { XummSdk } from 'xumm-sdk';
import { sendWaldo } from '../utils/sendWaldo.js';
import { updateXP } from '../utils/updateXP.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const xumm = new XummSdk(process.env.XUMM_API_KEY, process.env.XUMM_API_SECRET);
const BATTLE_PATH = './battles.json';
const WALDO_DESTINATION = process.env.WALDO_TREASURY_WALLET;
const ADMIN_KEY = process.env.ADMIN_KEY || "waldogod2025";

function loadBattle() {
  try {
    return JSON.parse(fs.readFileSync(BATTLE_PATH));
  } catch {
    return [];
  }
}

function saveBattle(battles) {
  fs.writeFileSync(BATTLE_PATH, JSON.stringify(battles, null, 2));
}

router.get("/", (req, res) => {
  res.send("\u2694\ufe0f WALDO Battle API is online");
});

router.get('/active', (req, res) => {
  const battles = loadBattle();
  const activeBattle = battles.find((battle) => !battle.isComplete);
  if (!activeBattle) return res.status(404).json({ error: 'No active battle' });
  res.json(activeBattle);
});

router.post('/start', async (req, res) => {
  const { meme1, wallet } = req.body;
  const battles = loadBattle();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentBattles = battles.filter(
    (battle) => battle.creator === wallet && battle.startTime >= sevenDaysAgo
  );

  if (recentBattles.length >= 3) {
    return res.status(400).json({ error: 'You can only start 3 battles in a 7-day period.' });
  }

  const activeBattle = battles.find((battle) => !battle.isComplete);
  if (activeBattle) {
    return res.status(400).json({ error: 'A battle is already active.' });
  }

  try {
    const payload = await xumm.payload.create({
      txjson: {
        TransactionType: 'Payment',
        Destination: WALDO_DESTINATION,
        Amount: '100000000',
        DestinationTag: 4001,
        Memos: [{ Memo: { MemoData: Buffer.from('WALDO_BATTLE_START').toString('hex') } }]
      },
      custom_meta: {
        identifier: 'waldo_battle_start',
        instruction: 'Sign to start a WALDO Meme Battle (100 WALDO fee)',
      },
    });

    const newBattle = {
      battleId: Date.now().toString(),
      meme1,
      meme2: null,
      votes: [],
      startTime: Date.now(),
      endTime: Date.now() + 24 * 60 * 60 * 1000,
      isComplete: false,
      pot: 100,
      creator: wallet,
      accepted: false,
      payloadUuid: payload.uuid,
    };

    battles.push(newBattle);
    saveBattle(battles);
    res.json({ success: true, launch: payload.next.always, qr: payload.refs.qr_png });
  } catch (err) {
    console.error('XUMM start error:', err);
    res.status(500).json({ error: 'Failed to create XUMM sign request' });
  }
});

router.post('/accept', async (req, res) => {
  const { meme2, wallet } = req.body;
  const battles = loadBattle();
  const battle = battles.find((b) => !b.isComplete);

  if (!battle || battle.accepted) return res.status(400).json({ error: 'No pending battle to accept' });

  try {
    const payload = await xumm.payload.create({
      txjson: {
        TransactionType: 'Payment',
        Destination: WALDO_DESTINATION,
        Amount: '50000000',
        DestinationTag: 4002,
        Memos: [{ Memo: { MemoData: Buffer.from('WALDO_BATTLE_ACCEPT').toString('hex') } }]
      },
      custom_meta: {
        identifier: 'waldo_battle_accept',
        instruction: 'Sign to accept WALDO Meme Battle (50 WALDO fee)',
      },
    });

    const fee = 50;
    const toPot = fee * 0.95;
    const burn = fee * 0.02;
    const treasury = fee * 0.03;

    battle.meme2 = meme2;
    battle.accepted = true;
    battle.pot += toPot;
    battle.burn = burn;
    battle.treasury = treasury;
    battle.acceptor = wallet;
    battle.payloadAcceptUuid = payload.uuid;
    saveBattle(battles);

    res.json({ success: true, launch: payload.next.always, qr: payload.refs.qr_png });
  } catch (err) {
    console.error('XUMM accept error:', err);
    res.status(500).json({ error: 'Failed to create XUMM sign request' });
  }
});

router.post('/vote', (req, res) => {
  const { wallet, choice } = req.body;
  const battles = loadBattle();
  const battle = battles.find((b) => !b.isComplete && b.accepted);

  if (!battle) return res.status(400).json({ error: 'No active battle' });
  const alreadyVoted = battle.votes.find((v) => v.wallet === wallet);
  if (alreadyVoted) return res.status(400).json({ error: 'You already voted' });

  battle.votes.push({ wallet, choice });
  battle.pot += 5;
  saveBattle(battles);
  res.json({ success: true, message: 'Vote recorded.' });
});

router.post('/payout', async (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { battleId } = req.body;
  const battles = loadBattle();
  const battle = battles.find((b) => b.battleId === battleId);

  if (!battle || battle.isComplete || battle.paidOut) {
    return res.status(400).json({ error: 'Battle not found or already paid' });
  }

  const { meme1, meme2, votes } = battle;
  const voteCount = { meme1: 0, meme2: 0 };
  const voterMap = { meme1: [], meme2: [] };

  for (const vote of votes) {
    voteCount[vote.choice]++;
    voterMap[vote.choice].push(vote.wallet);
  }

  const winnerKey = voteCount.meme1 >= voteCount.meme2 ? 'meme1' : 'meme2';
  const loserKey = winnerKey === 'meme1' ? 'meme2' : 'meme1';

  const totalPot = battle.pot;
  const payout = totalPot * 0.95;
  const burn = totalPot * 0.025;
  const treasury = totalPot * 0.025;

  const winnerPoster = battle[winnerKey].wallet;
  const voterWinners = voterMap[winnerKey];
  const toPoster = payout * 0.6;
  const toVoters = payout * 0.35;
  const perVoter = voterWinners.length > 0 ? toVoters / voterWinners.length : 0;

  try {
    await sendWaldo(winnerPoster, toPoster);
    for (const voter of voterWinners) {
      await sendWaldo(voter, perVoter);
    }

    await updateXP(battle[winnerKey].tweet_id, 100);
    await updateXP(battle[loserKey].tweet_id, 25);

    battle.paidOut = true;
    battle.isComplete = true;
    saveBattle(battles);

    res.json({
      success: true,
      poster: toPoster,
      perVoter,
      burn,
      treasury,
      voterCount: voterWinners.length,
    });
  } catch (err) {
    console.error('❌ WALDO payout failed:', err);
    res.status(500).json({ error: 'Payout failed' });
  }
});

export default router;

