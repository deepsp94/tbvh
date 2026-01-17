import { getDb } from "./index.js";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

export function getUsageToday(address: string): number {
  const db = getDb();
  const date = getTodayDate();

  const row = db
    .prepare("SELECT negotiations_started FROM daily_usage WHERE address = ? AND date = ?")
    .get(address, date) as { negotiations_started: number } | undefined;

  return row?.negotiations_started ?? 0;
}

export function incrementUsage(address: string): number {
  const db = getDb();
  const date = getTodayDate();

  db.prepare(`
    INSERT INTO daily_usage (address, date, negotiations_started)
    VALUES (?, ?, 1)
    ON CONFLICT(address, date) DO UPDATE SET negotiations_started = negotiations_started + 1
  `).run(address, date);

  return getUsageToday(address);
}

export function cleanupOldUsage(daysToKeep: number = 7): number {
  const db = getDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoff = cutoffDate.toISOString().split("T")[0];

  const result = db.prepare("DELETE FROM daily_usage WHERE date < ?").run(cutoff);
  return result.changes;
}
