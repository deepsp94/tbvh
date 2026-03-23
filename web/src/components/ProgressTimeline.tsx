import type { ProgressEvent } from "@shared/types.js";

interface Props {
  events: ProgressEvent[];
  maxTurns: number;
  isRunning: boolean;
}

export function ProgressTimeline({ events, maxTurns, isRunning }: Props) {
  const completedTurns = events.filter((e) => e.type === "buyer_response").length;
  const activeTurn = events.find((e) => e.type === "turn_start" && !events.some(
    (b) => b.type === "buyer_response" && b.turn === e.turn
  ))?.turn;

  return (
    <div className="flex items-center gap-1 py-2">
      <div className="flex items-center">
        {Array.from({ length: maxTurns }, (_, i) => {
          const turn = i + 1;
          const done = turn <= completedTurns;
          const active = isRunning && turn === activeTurn;
          return (
            <div key={turn} className="flex items-center">
              {i > 0 && (
                <div className={`w-3 h-px ${done ? "bg-teal-400/40" : "bg-zinc-700/50"}`} />
              )}
              <div
                className={`h-3 w-3 rounded-full transition-colors ${
                  done
                    ? "bg-teal-400"
                    : active
                    ? "bg-blue-400 animate-pulse-soft"
                    : "bg-zinc-700"
                }`}
                title={`Turn ${turn}`}
              />
            </div>
          );
        })}
      </div>
      <span className="text-xs text-zinc-500 ml-2 font-mono">
        {completedTurns}/{maxTurns}
      </span>
    </div>
  );
}
