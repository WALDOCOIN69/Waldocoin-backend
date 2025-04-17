// routes/minted.js
import express from "express";
import fs from "fs";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync("./db.json"));
    const minted = [];

    for (const wallet in db.users) {
      const user = db.users[wallet];
      if (user.memes && Array.isArray(user.memes)) {
        const mintedMemes = user.memes
          .filter(m => m.isMinted)
          .map(m => ({
            wallet,
            image_url: m.image_url,
            xp: m.xp,
            tier: m.tier,
            minted: m.mintedAt,
            nft_url: m.nft_url
          }));
        minted.push(...mintedMemes);
      }
    }

    res.json(minted);
  } catch (err) {
    console.error("Error loading minted memes:", err);
    res.status(500).json({ error: "Failed to load minted memes" });
  }
});

export default router;
