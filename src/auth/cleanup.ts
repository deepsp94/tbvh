import { getDb } from "../db/index.js";

export function startNonceCleanup() {
  const cleanup = () => {
    const db = getDb();
    db.prepare("DELETE FROM nonces WHERE expires_at < ?").run(
      new Date().toISOString()
    );
  };

  cleanup();
  setInterval(cleanup, 5 * 60 * 1000);
}
