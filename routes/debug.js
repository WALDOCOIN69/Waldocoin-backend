import express from "express";
import fs from "fs";

const router = express.Router();
const BATTLE_PATH = "./battles.json";

router.post("/fake-battle", (req, res) => {
  try {
    const dummyBattle = {
      battleId: Date.now().toString(),
      isComplete: false,
      paidOut: true,
      accepted: true,
      pot: 100,
      startTime: Date.now(),
      creator: "rWALDODEV",
      meme1: {
        wallet: "rWALDODEV",
        tweet_id: "123456",
        image_url: "https://via.placeholder.com/300?text=Meme+1"
      },
      meme2: {
        wallet: "rWALDOCHALLENGER",
        tweet_id: "654321",
        image_url: "https://via.placeholder.com/300?text=Meme+2"
      },
      votes: []
    };

    fs.writeFileSync(BATTLE_PATH, JSON.stringify([dummyBattle], null, 2));
    res.json({ success: true, message: "Fake battle created", battleId: dummyBattle.battleId });
  } catch (err) {
    console.error("❌ Failed to create fake battle:", err);
    res.status(500).json({ error: "Failed to create fake battle" });
  }
});

export default router;
