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
    <div className="flex items-center gap-2 py-1">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: maxTurns }, (_, i) => {
          const turn = i + 1;
          const done = turn <= completedTurns;
          const active = isRunning && turn === activeTurn;
          return (
            <div
              key={turn}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                done
                  ? "bg-green-400"
                  : active
                  ? "bg-blue-400 animate-pulse"
                  : "bg-zinc-700"
              }`}
              title={`Turn ${turn}`}
            />
          );
        })}
      </div>
      <span className="text-xs text-zinc-500">
        {completedTurns} / {maxTurns}
      </span>
    </div>
  );
}
