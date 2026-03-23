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
      status TEXT NOT NULL DEFAULT 'open',
      buyer_address TEXT NOT NULL,
      buyer_requirement_title TEXT NOT NULL,
      buyer_requirement TEXT NOT NULL,
      buyer_prompt TEXT,
      max_payment REAL NOT NULL,
      model TEXT NOT NULL DEFAULT 'deepseek/deepseek-chat-v3-0324',
      max_turns INTEGER NOT NULL DEFAULT 10,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS negotiations (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL,
      seller_address TEXT NOT NULL,
      seller_info TEXT,
      seller_proof TEXT,
      seller_prompt TEXT,
      proof_type TEXT NOT NULL DEFAULT 'text',
      email_domain TEXT,
      email_subject TEXT,
      email_body TEXT,
      email_verified INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'committed',
      asking_price REAL,
      outcome_reasoning TEXT,
      outcome_signature TEXT,
      outcome_signer TEXT,
      outcome_signed_at TEXT,
      tee_attested INTEGER DEFAULT 0,
      committed_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_negotiations_instance ON negotiations(instance_id);
    CREATE INDEX IF NOT EXISTS idx_negotiations_seller ON negotiations(seller_address);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      negotiation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      turn INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_negotiation ON messages(negotiation_id, turn);

    CREATE TABLE IF NOT EXISTS negotiation_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      negotiation_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      turn INTEGER,
      content TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_negotiation ON negotiation_events(negotiation_id, seq);

    CREATE TABLE IF NOT EXISTS daily_usage (
      date TEXT NOT NULL,
      address TEXT NOT NULL,
      negotiations INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date, address)
    );
  `);
}
