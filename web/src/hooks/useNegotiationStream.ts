import { useState, useEffect } from "react";
import type { ProgressEvent } from "@shared/types.js";
import { API_BASE } from "../lib/apiBase";

interface UseNegotiationStreamResult {
  events: ProgressEvent[];
  isConnected: boolean;
  isDone: boolean;
  error: string | null;
}

// Instance-level stream (buyer sees all negotiations)
export function useInstanceStream(
  instanceId: string | null,
  jwt: string | null
): UseNegotiationStreamResult {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instanceId || !jwt) return;

    setEvents([]);
    setIsDone(false);
    setError(null);

    const url = `${API_BASE}/instances/${instanceId}/stream?token=${encodeURIComponent(jwt)}`;
    const es = new EventSource(url);

    es.onopen = () => setIsConnected(true);

    es.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as ProgressEvent;
        setEvents((prev) => [...prev, event]);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      setIsDone(true);
      es.close();
    };

    return () => {
      es.close();
    };
  }, [instanceId, jwt]);

  return { events, isConnected, isDone, error };
}

// Negotiation-level stream (seller sees their single negotiation)
export function useNegotiationStream(
  negotiationId: string | null,
  jwt: string | null
): UseNegotiationStreamResult {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!negotiationId || !jwt) return;

    setEvents([]);
    setIsDone(false);
    setError(null);

    const url = `${API_BASE}/negotiations/${negotiationId}/stream?token=${encodeURIComponent(jwt)}`;
    const es = new EventSource(url);

    es.onopen = () => setIsConnected(true);

    es.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as ProgressEvent;
        setEvents((prev) => [...prev, event]);
        if (event.type === "proposed" || event.type === "rejected" || event.type === "error") {
          setIsDone(true);
          es.close();
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      setError("Stream connection lost");
    };

    return () => {
      es.close();
    };
  }, [negotiationId, jwt]);

  return { events, isConnected, isDone, error };
}
