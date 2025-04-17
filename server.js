import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import tweetsRoute from "./routes/tweets.js";
import claimStatusRoute from "./routes/claimStatus.js";
import battleRoutes from './routes/battle.js';
import resetBattleRoutes from "./routes/resetBattles.js";
import debugRoutes from "./routes/debug.js";
import { startAutoPayout } from "./autoPayoutJob.js";
import mintedRoute from './routes/minted.js';

dotenv.config();

const app = express();
const port = process.env.PORT;

// Add this line to register the route
app.use('/api/minted', mintedRoute);

// ✅ Middleware MUST come first
app.use(cors());
app.use(express.json());

// ✅ Routes
app.use("/api/tweets", tweetsRoute);
app.use("/api/claimStatus", claimStatusRoute);
app.use("/api/battle", battleRoutes);
app.use("/api/reset", resetBattleRoutes);
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "Server is alive and talking." });
});

app.use("/api/debug", debugRoutes);

// ✅ Health check route for Render monitoring
app.get('/api/health', (req, res) => {
  res.status(200).send('WALDO backend is alive 😤');
});

// ✅ Optional local DB loader (if used elsewhere)
const DB_PATH = "./db.json";
function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return { users: {} };
  }
}

// ✅ Start server
app.listen(port, () => {
  console.log(`✅ WALDOcoin API running at http://localhost:${port}`);
});

// ✅ Start background job
startAutoPayout(); // Runs every 5 minutes

