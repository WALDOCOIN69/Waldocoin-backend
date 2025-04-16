import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import tweetsRoute from "./routes/tweets.js";
import claimStatusRoute from "./routes/claimStatus.js";
import battleRoutes from './routes/battle.js';

dotenv.config();

const app = express(); // ✅ move this BEFORE any app.use()
const port = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// Register routes AFTER initializing app
app.use("/api/tweets", tweetsRoute);
app.use("/claimStatus", claimStatusRoute);
app.use('/api/battle', battleRoutes); // ✅ safe here now

// Load mock DB
const DB_PATH = "./db.json";
function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return { users: {} };
  }
}

// Start server
app.listen(port, () => console.log(`✅ WALDOcoin API running at http://localhost:${port}`));
