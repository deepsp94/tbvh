import { Link } from "react-router-dom";
import { Badge } from "./ui/Badge";
import { TeeBadge } from "./TeeBadge";
import { formatUsdc } from "../lib/format";
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
          <Badge variant="teal">Accepted</Badge>
          {askingPrice != null && (
            <span className="text-sm font-mono font-medium text-zinc-200">
              {formatUsdc(askingPrice)} <span className="text-zinc-500">USDC</span>
            </span>
          )}
          {teeAttested != null && (
            <TeeBadge teeAttested={teeAttested} signature={outcomeSignature ?? null} />
          )}
        </div>
        {outcomeSignature && (
          <Link
            to={`/verify/${negotiationId}`}
            className="inline-block text-xs text-teal-400 hover:text-teal-300 transition-colors"
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
        <Badge variant="amber">Proposed</Badge>
        {askingPrice != null && (
          <span className="text-sm font-mono font-medium text-zinc-200">
            {formatUsdc(askingPrice)} <span className="text-zinc-500">USDC</span>
          </span>
        )}
      </div>
    );
  }

  if (status === "rejected") {
    return <Badge variant="red">Rejected</Badge>;
  }

  if (status === "cancelled") {
    return <Badge variant="zinc">Cancelled</Badge>;
  }

  if (status === "failed") {
    return <Badge variant="red">Failed</Badge>;
  }

  return null;
}
