import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index.js";
import type { ProgressEvent } from "@shared/types.js";

export type StoredEvent = ProgressEvent & { seq: number };

export function insertEvent(
  negotiationId: string,
  event: Omit<ProgressEvent, "timestamp">
): number {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const metadata = event.asking_price != null || event.error
    ? JSON.stringify({ asking_price: event.asking_price, error: event.error })
    : null;
  const result = db
    .prepare(
      "INSERT INTO negotiation_events (id, negotiation_id, event_type, turn, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, negotiationId, event.type, event.turn ?? null, null, metadata, now);
  return result.lastInsertRowid as number;
}

function rowToEvent(row: Record<string, unknown>): StoredEvent {
  const metadata = row.metadata ? JSON.parse(row.metadata as string) : {};
  return {
    seq: row.seq as number,
    type: row.event_type as ProgressEvent["type"],
    negotiation_id: row.negotiation_id as string,
    turn: row.turn as number | undefined,
    asking_price: metadata.asking_price,
    error: metadata.error,
    timestamp: row.created_at as string,
  };
}

export function getEvents(negotiationId: string): StoredEvent[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM negotiation_events WHERE negotiation_id = ? ORDER BY seq ASC")
    .all(negotiationId) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

export function getEventsAfter(negotiationId: string, afterSeq: number): StoredEvent[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM negotiation_events WHERE negotiation_id = ? AND seq > ? ORDER BY seq ASC")
    .all(negotiationId, afterSeq) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

export function getEventsByInstance(instanceId: string): StoredEvent[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT e.* FROM negotiation_events e
      JOIN negotiations n ON e.negotiation_id = n.id
      WHERE n.instance_id = ?
      ORDER BY e.seq ASC
    `)
    .all(instanceId) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

export function getEventsByInstanceAfter(instanceId: string, afterSeq: number): StoredEvent[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT e.* FROM negotiation_events e
      JOIN negotiations n ON e.negotiation_id = n.id
      WHERE n.instance_id = ? AND e.seq > ?
      ORDER BY e.seq ASC
    `)
    .all(instanceId, afterSeq) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}
