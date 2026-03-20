import { Link } from "react-router-dom";
import type { NegotiationOutcome } from "@shared/types.js";
import { Badge } from "./ui/Badge";
import { TeeBadge } from "./TeeBadge";

interface Props {
  outcome: NegotiationOutcome;
  instanceId?: string;
  teeAttested?: number;
  outcomeSignature?: string | null;
}

export function OutcomeDisplay({ outcome, instanceId, teeAttested, outcomeSignature }: Props) {
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
        {teeAttested != null && (
          <TeeBadge teeAttested={teeAttested} signature={outcomeSignature ?? null} />
        )}
      </div>
      {outcome.reasoning && (
        <p className="text-sm text-zinc-400">{outcome.reasoning}</p>
      )}
      {outcomeSignature && instanceId && (
        <Link
          to={`/verify/${instanceId}`}
          className="inline-block text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Verify outcome →
        </Link>
      )}
    </div>
  );
}
