import Database from "better-sqlite3";
import { config } from "../config.js";
import { schema } from "./schema.js";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(schema);
    console.log(`Database initialized at ${config.dbPath}`);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
