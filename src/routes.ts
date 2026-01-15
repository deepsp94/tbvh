import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { v4 as uuidv4 } from "uuid";
import type {
  NegotiationRequest,
  NegotiationSession,
  NegotiationOutcome,
  AgentMessage,
} from "./types.js";
import { runNegotiation } from "./negotiation.js";

// In-memory session storage
const sessions = new Map<string, NegotiationSession>();

export const negotiateRoutes = new Hono();

// Create a new negotiation session
negotiateRoutes.post("/negotiate", async (c) => {
  const body = await c.req.json<NegotiationRequest>();

  // Validate required fields
  if (!body.buyer_requirement || !body.seller_info || !body.max_payment) {
    return c.json(
      { error: "Missing required fields: buyer_requirement, seller_info, max_payment" },
      400
    );
  }

  const session: NegotiationSession = {
    id: uuidv4(),
    request: body,
    messages: [],
    status: "pending",
    createdAt: new Date(),
  };

  sessions.set(session.id, session);

  return c.json({ session_id: session.id });
});

// Get session status
negotiateRoutes.get("/negotiate/:id", (c) => {
  const id = c.req.param("id");
  const session = sessions.get(id);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({
    id: session.id,
    status: session.status,
    messages: session.messages,
    outcome: session.outcome,
  });
});

// Stream negotiation via SSE
negotiateRoutes.get("/negotiate/:id/stream", async (c) => {
  const id = c.req.param("id");
  const session = sessions.get(id);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  if (session.status === "completed") {
    return c.json({ error: "Session already completed", outcome: session.outcome }, 400);
  }

  if (session.status === "running") {
    return c.json({ error: "Session already running" }, 400);
  }

  const apiKey = process.env.PHALA_API_KEY;
  if (!apiKey) {
    return c.json({ error: "PHALA_API_KEY not configured" }, 500);
  }

  session.status = "running";

  return streamSSE(c, async (stream) => {
    try {
      for await (const event of runNegotiation(session, apiKey)) {
        if ("decision" in event) {
          // NegotiationOutcome
          await stream.writeSSE({
            event: "done",
            data: JSON.stringify(event),
          });
        } else {
          // AgentMessage
          await stream.writeSSE({
            event: "message",
            data: JSON.stringify(event),
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ message }),
      });
      session.status = "completed";
      session.outcome = {
        decision: "REJECT",
        reasoning: `Error during negotiation: ${message}`,
      };
    }
  });
});

// List all sessions (for debugging)
negotiateRoutes.get("/sessions", (c) => {
  const list = Array.from(sessions.values()).map((s) => ({
    id: s.id,
    status: s.status,
    createdAt: s.createdAt,
    outcome: s.outcome,
  }));
  return c.json(list);
});

// Delete a session
negotiateRoutes.delete("/negotiate/:id", (c) => {
  const id = c.req.param("id");
  if (sessions.delete(id)) {
    return c.json({ deleted: true });
  }
  return c.json({ error: "Session not found" }, 404);
});
