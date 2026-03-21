import { getDb } from "./index.js";
import { config } from "../config.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordNegotiation(address: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO daily_usage (date, address, negotiations)
    VALUES (?, ?, 1)
    ON CONFLICT(date, address) DO UPDATE SET negotiations = negotiations + 1
  `).run(today(), address);
}

export function checkNegotiationLimit(address: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT negotiations FROM daily_usage WHERE date = ? AND address = ?")
    .get(today(), address) as { negotiations: number } | undefined;
  return (row?.negotiations ?? 0) < config.maxNegotiationsPerDay;
}
