import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { negotiateRoutes } from "./routes.js";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/", negotiateRoutes);

const port = parseInt(process.env.PORT || "3000");

console.log(`TBVH TEE Core starting on port ${port}`);

serve({ fetch: app.fetch, port });
