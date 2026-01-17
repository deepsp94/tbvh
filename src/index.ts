import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { getDb } from "./db/index.js";
import { routes } from "./routes/index.js";
import { cleanupExpiredNonces } from "./auth/nonce.js";

const app = new Hono();

// Initialize database on startup
getDb();
console.log("Database initialized");

// Cleanup expired nonces periodically (every 5 minutes)
setInterval(() => {
  const cleaned = cleanupExpiredNonces();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired nonces`);
  }
}, 5 * 60 * 1000);

// CORS for frontend
app.use("*", cors());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Mount all routes
app.route("/", routes);

const port = parseInt(process.env.PORT || "3000");

console.log(`TBVH TEE Core starting on port ${port}`);

serve({ fetch: app.fetch, port });
