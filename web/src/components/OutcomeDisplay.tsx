import { Link } from "react-router-dom";
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
  // Status badge is already shown in the NegotiationCard header.
  // This component only renders additional info (price, TEE badge, verify link).

  if (status === "accepted") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
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
        {askingPrice != null && (
          <span className="text-sm font-mono font-medium text-zinc-200">
            {formatUsdc(askingPrice)} <span className="text-zinc-500">USDC</span>
          </span>
        )}
      </div>
    );
  }

  // rejected/cancelled/failed — card header badge is sufficient
  return null;
}
