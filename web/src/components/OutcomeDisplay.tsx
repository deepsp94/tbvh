import type { NegotiationOutcome } from "@shared/types.js";
import { Badge } from "./ui/Badge";

interface Props {
  outcome: NegotiationOutcome;
}

export function OutcomeDisplay({ outcome }: Props) {
  const isAccepted = outcome.outcome === "ACCEPT";

  return (
    <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 space-y-3">
      <div className="flex items-center gap-3">
        <Badge variant={isAccepted ? "green" : "red"}>
          {isAccepted ? "ACCEPTED" : "REJECTED"}
        </Badge>
        {isAccepted && outcome.final_price != null && (
          <span className="text-sm font-medium text-zinc-200">
            {outcome.final_price} USDC
          </span>
        )}
      </div>
      {outcome.reasoning && (
        <p className="text-sm text-zinc-400">{outcome.reasoning}</p>
      )}
    </div>
  );
}
