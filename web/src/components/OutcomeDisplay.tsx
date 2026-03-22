import { Link } from "react-router-dom";
import { Badge } from "./ui/Badge";
import { TeeBadge } from "./TeeBadge";
import type { NegotiationStatus } from "@shared/types.js";

interface Props {
  status: NegotiationStatus;
  askingPrice: number | null;
  negotiationId: string;
  teeAttested?: number;
  outcomeSignature?: string | null;
}

export function OutcomeDisplay({ status, askingPrice, negotiationId, teeAttested, outcomeSignature }: Props) {
  if (status === "accepted") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Badge variant="green">ACCEPTED</Badge>
          {askingPrice != null && (
            <span className="text-sm font-medium text-zinc-200">
              {askingPrice} USDC
            </span>
          )}
          {teeAttested != null && (
            <TeeBadge teeAttested={teeAttested} signature={outcomeSignature ?? null} />
          )}
        </div>
        {outcomeSignature && (
          <Link
            to={`/verify/${negotiationId}`}
            className="inline-block text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Verify outcome →
          </Link>
        )}
      </div>
    );
  }

  if (status === "proposed") {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="amber">PROPOSED</Badge>
        {askingPrice != null && (
          <span className="text-sm font-medium text-zinc-200">
            {askingPrice} USDC
          </span>
        )}
      </div>
    );
  }

  if (status === "rejected") {
    return <Badge variant="red">REJECTED</Badge>;
  }

  if (status === "cancelled") {
    return <Badge variant="zinc">CANCELLED</Badge>;
  }

  if (status === "failed") {
    return <Badge variant="red">FAILED</Badge>;
  }

  return null;
}
