// autoPayoutJob.js
import fs from 'fs';
import { sendWaldo } from "./utils/sendWaldo.js";
import { updateXP } from "./utils/updateXP.js";

const BATTLE_PATH = "./battles.json";

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

export function startAutoPayout(intervalMs = 5 * 60 * 1000) {
  console.log("🔁 WALDO Auto-Payout Job running every", intervalMs / 1000, "seconds");

  setInterval(async () => {
    const battles = loadBattle();
    let updated = false;

    for (const battle of battles) {
      if (battle.accepted && !battle.paidOut && Date.now() > battle.endTime) {
        console.log("⏰ Triggering payout for battle:", battle.battleId);
        const { meme1, meme2, votes } = battle;

        const voteCount = { meme1: 0, meme2: 0 };
        const voterMap = { meme1: [], meme2: [] };

        for (const vote of votes) {
          voteCount[vote.choice]++;
          voterMap[vote.choice].push(vote.wallet);
        }

        const winnerKey = voteCount.meme1 >= voteCount.meme2 ? "meme1" : "meme2";
        const loserKey = winnerKey === "meme1" ? "meme2" : "meme1";

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
          battle.lastPayoutTime = Date.now();

          updated = true;
          console.log(`✅ Payout complete for Battle #${battle.battleId}`);
        } catch (e) {
          console.error("❌ Auto payout failed:", e);
        }
      }
    }

    if (updated) saveBattle(battles);
  }, intervalMs);
}
