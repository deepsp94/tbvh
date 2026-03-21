import { useState, useEffect } from "react";
import type { ProgressEvent } from "@shared/types.js";
import { API_BASE } from "../lib/apiBase";

interface UseNegotiationStreamResult {
  events: ProgressEvent[];
  isConnected: boolean;
  isDone: boolean;
  error: string | null;
}

export function useNegotiationStream(
  instanceId: string | null,
  jwt: string | null
): UseNegotiationStreamResult {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instanceId || !jwt) return;

    const url = `${API_BASE}/instances/${instanceId}/stream?token=${encodeURIComponent(jwt)}`;
    const es = new EventSource(url);

    es.onopen = () => setIsConnected(true);

    es.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as ProgressEvent;
        setEvents((prev) => [...prev, event]);
        if (event.type === "outcome" || event.type === "error") {
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
      // Don't close — allow browser auto-reconnect unless already done
    };

    return () => {
      es.close();
    };
  }, [instanceId, jwt]);

  return { events, isConnected, isDone, error };
}
