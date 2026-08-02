import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { makeToken, authMiddleware, AuthPayload } from "./auth";
import { generateUUID } from "../src/utils";

const app = express();
const PORT = 3001;

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "1mb" }));

// ── Auth ──

app.post("/api/auth/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  if (username.length < 2 || username.length > 20) {
    res.status(400).json({ error: "Username must be 2-20 characters" });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: "Password must be at least 4 characters" });
    return;
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const id = generateUUID();
  const hash = bcrypt.hashSync(password, 10);

  db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)").run(id, username, hash);

  const token = makeToken({ userId: id, username });
  res.status(201).json({ token, user: { id, username } });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const db = getDb();
  const user = db.prepare("SELECT id, username, password_hash FROM users WHERE username = ?").get(username) as { id: string; username: string; password_hash: string } | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = makeToken({ userId: user.id, username: user.username });
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  res.json({ user: { id: auth.userId, username: auth.username } });
});

// ── Saves ──

app.get("/api/saves", authMiddleware, (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  const db = getDb();
  const saves = db.prepare(
    "SELECT id, slot, floor, hp, gold, updated_at FROM saves WHERE user_id = ? ORDER BY slot"
  ).all(auth.userId) as any[];

  const result = saves.map(s => ({
    id: s.id,
    slot: s.slot,
    floor: s.floor,
    hp: s.hp,
    gold: s.gold,
    updatedAt: s.updated_at,
  }));

  res.json({ saves: result });
});

app.get("/api/saves/:slot", authMiddleware, (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  const slot = parseInt(req.params.slot as string);
  if (isNaN(slot) || slot < 0 || slot > 2) {
    res.status(400).json({ error: "Invalid slot (0-2)" });
    return;
  }

  const db = getDb();
  const save = db.prepare(
    "SELECT * FROM saves WHERE user_id = ? AND slot = ?"
  ).get(auth.userId, slot) as any;

  if (!save) {
    res.status(404).json({ error: "No save in this slot" });
    return;
  }

  res.json({
    id: save.id,
    slot: save.slot,
    gameState: JSON.parse(save.game_state),
    floor: save.floor,
    hp: save.hp,
    gold: save.gold,
    updatedAt: save.updated_at,
  });
});

app.put("/api/saves/:slot", authMiddleware, (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  const slot = parseInt(req.params.slot as string);
  if (isNaN(slot) || slot < 0 || slot > 2) {
    res.status(400).json({ error: "Invalid slot (0-2)" });
    return;
  }

  const { gameState, floor, hp, gold } = req.body;
  if (!gameState) {
    res.status(400).json({ error: "gameState required" });
    return;
  }

  const db = getDb();
  const existing = db.prepare(
    "SELECT id FROM saves WHERE user_id = ? AND slot = ?"
  ).get(auth.userId, slot) as any;

  if (existing) {
    db.prepare(
      `UPDATE saves SET game_state = ?, floor = ?, hp = ?, gold = ?, updated_at = datetime('now')
       WHERE user_id = ? AND slot = ?`
    ).run(JSON.stringify(gameState), floor ?? 1, hp ?? 80, gold ?? 0, auth.userId, slot);
  } else {
    const id = generateUUID();
    db.prepare(
      `INSERT INTO saves (id, user_id, slot, game_state, floor, hp, gold)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, auth.userId, slot, JSON.stringify(gameState), floor ?? 1, hp ?? 80, gold ?? 0);
  }

  res.json({ success: true, slot });
});

app.delete("/api/saves/:slot", authMiddleware, (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  const slot = parseInt(req.params.slot as string);
  if (isNaN(slot) || slot < 0 || slot > 2) {
    res.status(400).json({ error: "Invalid slot (0-2)" });
    return;
  }

  const db = getDb();
  db.prepare("DELETE FROM saves WHERE user_id = ? AND slot = ?").run(auth.userId, slot);
  res.json({ success: true });
});

// ── Leaderboard ──

app.get("/api/leaderboard", (_req, res) => {
  const db = getDb();
  const entries = db.prepare(
    `SELECT username, score, floor, victory, deck_size, relics_count, created_at
     FROM leaderboard ORDER BY score DESC LIMIT 20`
  ).all();
  res.json({ entries });
});

app.post("/api/leaderboard", authMiddleware, (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  const { score, floor, victory, deckSize, relicsCount } = req.body;

  const db = getDb();
  const id = generateUUID();
  db.prepare(
    `INSERT INTO leaderboard (id, user_id, username, score, floor, victory, deck_size, relics_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, auth.userId, auth.username, score, floor, victory ? 1 : 0, deckSize ?? 0, relicsCount ?? 0);

  res.status(201).json({ success: true });
});

app.listen(PORT, () => {
  console.log(`[Server] Shadow Deck API running on http://localhost:${PORT}`);
});

export default app;
