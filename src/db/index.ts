import Database from "better-sqlite3";
import { config } from "../config.js";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma("journal_mode = WAL");
    runMigrations(db);
  }
  return db;
}

function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nonces (
      nonce TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_nonces_expires ON nonces(expires_at);

    CREATE TABLE IF NOT EXISTS instances (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'created',
      buyer_address TEXT NOT NULL,
      buyer_requirement TEXT NOT NULL,
      buyer_prompt TEXT,
      max_payment REAL NOT NULL,
      seller_address TEXT,
      seller_info TEXT,
      seller_proof TEXT,
      seller_prompt TEXT,
      model TEXT NOT NULL DEFAULT 'deepseek/deepseek-chat-v3-0324',
      max_turns INTEGER NOT NULL DEFAULT 10,
      outcome TEXT,
      final_price REAL,
      outcome_reasoning TEXT,
      outcome_signature TEXT,
      outcome_signer TEXT,
      outcome_signed_at TEXT,
      tee_attested INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      committed_at TEXT,
      started_at TEXT,
      completed_at TEXT
    );
  `);
}
