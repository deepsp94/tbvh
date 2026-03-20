import { getDb } from "./index.js";
import { config } from "../config.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function trackUsage(model: string, tokens: number): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO daily_usage (date, model, total_tokens)
    VALUES (?, ?, ?)
    ON CONFLICT(date, model) DO UPDATE SET total_tokens = total_tokens + excluded.total_tokens
  `).run(today(), model, tokens);
}

export function getDailyUsage(model: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT total_tokens FROM daily_usage WHERE date = ? AND model = ?")
    .get(today(), model) as { total_tokens: number } | undefined;
  return row?.total_tokens ?? 0;
}

export function checkDailyLimit(model: string): boolean {
  return getDailyUsage(model) < config.maxDailyTokens;
}
