import express from "express";
import fs from "fs";

const router = express.Router();
const BATTLE_PATH = "./battles.json";

// 🔄 RESET ALL BATTLES (for testing only)
router.post("/clear", (req, res) => {
  fs.writeFileSync(BATTLE_PATH, JSON.stringify([], null, 2));
  res.json({ success: true, message: "All battles cleared." });
});

// 🧼 RESET ACTIVE BATTLE ONLY (flags it incomplete + unpaid)
router.post("/reset-active", (req, res) => {
  try {
    const battles = JSON.parse(fs.readFileSync(BATTLE_PATH));
    const active = battles.find((b) => !b.isComplete);

    if (!active) {
      return res.status(404).json({ error: "No active battle found" });
    }

    active.paidOut = false;
    active.isComplete = false;
    fs.writeFileSync(BATTLE_PATH, JSON.stringify(battles, null, 2));
    res.json({ success: true, message: "Active battle reset." });
  } catch (err) {
    console.error("Reset error:", err);
    res.status(500).json({ error: "Failed to reset battle" });
  }
});

export default router;
