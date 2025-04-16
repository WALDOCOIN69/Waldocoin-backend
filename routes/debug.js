import express from "express";
import fs from "fs";

const router = express.Router();
const ADMIN_KEY = process.env.ADMIN_KEY || "waldogodmode2025";
const BATTLE_PATH = "./battles.json";

// 🧪 Create a fake battle
router.post("/fake-battle", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

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

// 👁️ View current battles
router.get("/battles", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const data = fs.readFileSync(BATTLE_PATH, "utf-8");
    const battles = JSON.parse(data);
    res.json(battles);
  } catch (err) {
    console.error("❌ Failed to read battles.json:", err);
    res.status(500).json({ error: "Failed to load battles" });
  }
});

export default router;
