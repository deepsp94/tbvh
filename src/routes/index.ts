import { Hono } from "hono";
import { authRoutes } from "./auth.js";
import { instanceRoutes } from "./instances.js";

export const routes = new Hono();

routes.route("/auth", authRoutes);
routes.route("/instances", instanceRoutes);
