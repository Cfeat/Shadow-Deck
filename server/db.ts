import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(import.meta.dirname, "shadowdeck.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saves (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      slot INTEGER NOT NULL CHECK(slot >= 0 AND slot <= 2),
      game_state TEXT NOT NULL,
      floor INTEGER NOT NULL DEFAULT 1,
      hp INTEGER NOT NULL DEFAULT 80,
      gold INTEGER NOT NULL DEFAULT 99,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, slot)
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      score INTEGER NOT NULL,
      floor INTEGER NOT NULL,
      victory INTEGER NOT NULL DEFAULT 0,
      deck_size INTEGER NOT NULL DEFAULT 0,
      relics_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_saves_user ON saves(user_id);
    CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
  `);
}
