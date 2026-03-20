import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index.js";
import type { ProgressEvent } from "@shared/types.js";

export type StoredEvent = ProgressEvent & { seq: number };

export function insertEvent(
  instanceId: string,
  event: Omit<ProgressEvent, "timestamp">
): number {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const metadata = event.outcome || event.error
    ? JSON.stringify({ outcome: event.outcome, error: event.error })
    : null;
  const result = db
    .prepare(
      "INSERT INTO negotiation_events (id, instance_id, event_type, turn, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, instanceId, event.type, event.turn ?? null, event.content ?? null, metadata, now);
  return result.lastInsertRowid as number;
}

function rowToEvent(row: Record<string, unknown>): StoredEvent {
  const metadata = row.metadata ? JSON.parse(row.metadata as string) : {};
  return {
    seq: row.seq as number,
    type: row.event_type as ProgressEvent["type"],
    turn: row.turn as number | undefined,
    content: row.content as string | undefined,
    outcome: metadata.outcome,
    error: metadata.error,
    timestamp: row.created_at as string,
  };
}

export function getEvents(instanceId: string): StoredEvent[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM negotiation_events WHERE instance_id = ? ORDER BY seq ASC")
    .all(instanceId) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

export function getEventsAfter(instanceId: string, afterSeq: number): StoredEvent[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM negotiation_events WHERE instance_id = ? AND seq > ? ORDER BY seq ASC")
    .all(instanceId, afterSeq) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}
