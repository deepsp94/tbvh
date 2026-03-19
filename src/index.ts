import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { getDb } from "./db/index.js";
import { authRoutes } from "./auth/routes.js";
import { startNonceCleanup } from "./auth/cleanup.js";
import { instanceRoutes } from "./instances/routes.js";

// Initialize database
getDb();

// Start nonce cleanup (every 5 min)
startNonceCleanup();

const app = new Hono();

app.use("*", cors({ origin: "*" }));

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.route("/auth", authRoutes);
app.route("/instances", instanceRoutes);

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`TBVH server running on http://localhost:${config.port}`);
});
