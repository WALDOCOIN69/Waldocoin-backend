// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { XummSdk } from "xumm-sdk";
import fs from "fs";

dotenv.config();

const app = express();
const port = process.env.PORT || 1000;
app.use(cors());
app.use(express.json());

const xumm = new XummSdk(process.env.XUMM_API_KEY, process.env.XUMM_API_SECRET);
let payloadStore = {};

// Load/save mock DB
const DB_PATH = "./db.json";
function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return { users: {}, memes: [] };
  }
}
function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// XUMM Login
app.get("/api/login", async (req, res) => {
  const payload = await xumm.payload.create({ txjson: { TransactionType: "SignIn" } });
  payloadStore[payload.uuid] = payload;
  res.json({ qr: payload.refs.qr_png, uuid: payload.uuid });
});

app.get("/api/status/:uuid", async (req, res) => {
  const payload = payloadStore[req.params.uuid];
  if (!payload) return res.status(404).json({ error: "Not found" });
  const result = await xumm.payload.get(req.params.uuid);
  if (result.meta.signed) {
    const wallet = result.response.account;
    const db = loadDB();
    if (!db.users[wallet]) db.users[wallet] = { xp: 0, memes: [], referrals: [], twitter: null };
    saveDB(db);
    res.json({ loggedIn: true, wallet });
  } else {
    res.json({ loggedIn: false });
  }
});

// Twitter Link
app.post("/api/link-twitter", (req, res) => {
  const { wallet, twitterHandle } = req.body;
  const db = loadDB();
  if (!db.users[wallet]) return res.json({ success: false });
  db.users[wallet].twitter = twitterHandle;
  saveDB(db);
  res.json({ success: true });
});

// User XP
app.get("/api/user/:wallet/xp", (req, res) => {
  const db = loadDB();
  const user = db.users[req.params.wallet];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ xp: user.xp });
});

// Meme List
app.get("/api/user/:wallet/memes", (req, res) => {
  const db = loadDB();
  const user = db.users[req.params.wallet];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ memes: user.memes });
});

// WALDOcoin Price
app.get("/api/price", (req, res) => {
  res.json({ price: 0.0042 }); // placeholder price
});

// Referral Count
app.get("/api/referrals/:wallet", (req, res) => {
  const db = loadDB();
  const user = db.users[req.params.wallet];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ count: user.referrals.length });
});

// Activity Feed (mocked)
app.get("/api/activity/:wallet", (req, res) => {
  const activities = [
    "🧬 Minted meme #2 as NFT",
    "💰 Claimed 50 WALDOcoin",
    "🔥 Meme #3 passed 1K likes",
    "📤 Submitted meme #4",
    `🔗 Wallet connected: ${req.params.wallet.slice(0, 6)}...${req.params.wallet.slice(-4)}`
  ];
  res.json({ feed: activities });
});

app.listen(port, () => console.log(`✅ WALDOcoin API running at http://localhost:${port}`));
