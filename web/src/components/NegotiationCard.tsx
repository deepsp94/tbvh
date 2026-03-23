import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { ProgressTimeline } from "./ProgressTimeline";
import { OutcomeDisplay } from "./OutcomeDisplay";
import { EscrowPanel } from "./EscrowPanel";
import { acceptNegotiation, cancelNegotiation } from "../lib/api";
import { shortAddress, formatUsdc } from "../lib/format";
import type { BuyerNegotiationView, SellerNegotiationView, PublicNegotiationView, NegotiationStatus, ProgressEvent } from "@shared/types.js";

// Union of all views; PublicNegotiationView lacks status so we use 'accepted' default for public
type AnyNegotiationView = BuyerNegotiationView | SellerNegotiationView | PublicNegotiationView;

function getStatus(n: AnyNegotiationView): NegotiationStatus {
  return "status" in n ? n.status : "accepted";
}

const STATUS_VARIANTS: Record<NegotiationStatus, "amber" | "blue" | "teal" | "red" | "zinc"> = {
  committed: "amber",
  running: "blue",
  proposed: "amber",
  accepted: "teal",
  rejected: "red",
  cancelled: "zinc",
  failed: "red",
};

interface Props {
  negotiation: AnyNegotiationView;
  role: "buyer" | "seller" | "public";
  instanceId: string;
  events: ProgressEvent[];
  maxTurns: number;
  address: string | null;
}

export function NegotiationCard({ negotiation, role, instanceId, events, maxTurns, address }: Props) {
  const queryClient = useQueryClient();
  const n = negotiation;
  const status = getStatus(n);

  const negEvents = events.filter((e) => e.negotiation_id === n.id);

  const acceptMutation = useMutation({
    mutationFn: () => acceptNegotiation(n.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiations", instanceId] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelNegotiation(n.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiations", instanceId] });
    },
  });

  const isTerminal = ["accepted", "rejected", "cancelled", "failed"].includes(status);
  const isBuyer = role === "buyer";
  const isSeller = role === "seller";

  const cardClasses = [
    "border rounded-xl p-4 bg-[--color-surface-1] border-[--color-border] transition-all duration-200",
    status === "running" ? "border-l-2 border-l-blue-400" : "",
    isTerminal && status !== "accepted" ? "opacity-50 grayscale" : "",
  ].join(" ");

  return (
    <div className={cardClasses}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANTS[status]}>{status}</Badge>
          <span className="text-xs font-mono text-zinc-500">
            {shortAddress(n.seller_address)}
          </span>
        </div>
        {n.asking_price != null && (
          <span className="text-lg font-mono font-semibold text-zinc-100">
            {formatUsdc(n.asking_price)}
            <span className="text-xs text-zinc-500 ml-1 font-normal">USDC</span>
          </span>
        )}
      </div>

      {/* Email proof badge */}
      {"proof_type" in n && n.proof_type === "email" && "email_verified" in n && (n as BuyerNegotiationView).email_verified === 1 && (
        <div className="flex items-center gap-1.5 mb-2">
          <Badge variant="emerald">
            DKIM verified
            {"email_domain" in n && (n as BuyerNegotiationView).email_domain && (
              <span className="ml-1 opacity-70">
                from {(n as BuyerNegotiationView).email_domain}
              </span>
            )}
          </Badge>
        </div>
      )}

      {/* Running: show turn progress */}
      {status === "running" && (
        <ProgressTimeline
          events={negEvents}
          maxTurns={maxTurns}
          isRunning={true}
        />
      )}

      {/* Terminal outcomes */}
      {(status === "proposed" || status === "accepted" || status === "rejected" || status === "failed" || status === "cancelled") && (
        <OutcomeDisplay
          status={status}
          askingPrice={n.asking_price ?? null}
          negotiationId={n.id}
          teeAttested={"tee_attested" in n ? (n as BuyerNegotiationView).tee_attested : undefined}
          outcomeSignature={"outcome_signature" in n ? (n as BuyerNegotiationView).outcome_signature : undefined}
        />
      )}

      {/* Accepted: show seller_info to buyer */}
      {status === "accepted" && isBuyer && "seller_info" in n && (n as BuyerNegotiationView).seller_info && (
        <div className="mt-3 border-t border-[--color-border] pt-3">
          <p className="text-xs text-zinc-500 mb-1">Seller Information</p>
          <p className="text-sm text-zinc-200 whitespace-pre-wrap">
            {(n as BuyerNegotiationView).seller_info}
          </p>
        </div>
      )}

      {/* Buyer actions */}
      {isBuyer && (
        <div className="flex gap-2 mt-3">
          {status === "proposed" && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? "Accepting..." : "Accept"}
            </Button>
          )}
          {!isTerminal && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
            </Button>
          )}
        </div>
      )}

      {/* Seller view: status messages */}
      {isSeller && status === "committed" && (
        <p className="text-xs text-zinc-500 mt-2">Starting...</p>
      )}
      {isSeller && status === "proposed" && (
        <p className="text-xs text-zinc-500 mt-2">
          Agreed at {n.asking_price} USDC — waiting for buyer
        </p>
      )}

      {/* Escrow panel for buyer proposed/accepted or seller accepted */}
      {(isBuyer || isSeller) && (status === "proposed" || status === "accepted") && (
        <EscrowPanel
          negotiationId={n.id}
          negotiation={n as BuyerNegotiationView}
          address={address}
          isBuyer={isBuyer}
          isSeller={isSeller}
        />
      )}

      {/* Error messages */}
      {acceptMutation.isError && (
        <p className="text-xs text-red-400 mt-2">
          {acceptMutation.error instanceof Error ? acceptMutation.error.message : "Failed"}
        </p>
      )}
      {cancelMutation.isError && (
        <p className="text-xs text-red-400 mt-2">
          {cancelMutation.error instanceof Error ? cancelMutation.error.message : "Failed"}
        </p>
      )}
    </div>
  );
}
