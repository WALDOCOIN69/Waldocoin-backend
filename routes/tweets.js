import express from 'express';
import fs from 'fs';

const router = express.Router();

// Load mock DB
const DB_PATH = './db.json';
function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return { users: {} };
  }
}

// Tweets API
router.get('/', (req, res) => {
  const db = loadDB();
  const memes = Object.values(db.users).flatMap(user => user.memes || []); // Collect memes from all users
  res.json(memes);
});

export default router;
