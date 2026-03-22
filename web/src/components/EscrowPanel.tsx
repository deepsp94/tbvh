import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { useConfig } from "../config/ConfigProvider";
import { useEscrow } from "../hooks/useEscrow";
import { getTeeVerification } from "../lib/api";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import type { BuyerNegotiationView, TeeVerification } from "@shared/types.js";

interface Props {
  negotiationId: string;
  negotiation: BuyerNegotiationView;
  address: string | null;
  isBuyer: boolean;
  isSeller: boolean;
  onAcceptReady?: () => void;
}

export function EscrowPanel({ negotiationId, negotiation, address, isBuyer, isSeller, onAcceptReady }: Props) {
  const queryClient = useQueryClient();
  const { contractAddress, tokenAddress } = useConfig();
  const escrow = useEscrow(
    negotiationId,
    contractAddress as `0x${string}`,
    tokenAddress as `0x${string}`
  );
  const [verification, setVerification] = useState<TeeVerification | null>(null);

  useEffect(() => {
    if (negotiation.outcome_signature && negotiation.status === "accepted") {
      getTeeVerification(negotiationId).then(setVerification).catch(() => {});
    }
  }, [negotiationId, negotiation.outcome_signature, negotiation.status]);

  useEffect(() => {
    if (escrow.isSuccess) {
      const timer = setTimeout(() => {
        escrow.refetchAll();
        queryClient.invalidateQueries({ queryKey: ["negotiations", negotiation.instance_id] });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [escrow.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const zeroAddr = "0x0000000000000000000000000000000000000000";
  if (contractAddress === zeroAddr || tokenAddress === zeroAddr) {
    return null;
  }

  // Already settled
  if (escrow.deposit?.settled) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="zinc">Settled</Badge>
        <span className="text-xs text-zinc-500">
          {formatUnits(escrow.deposit.amount, 6)} USDC
        </span>
      </div>
    );
  }

  // Proposed: buyer needs to deposit before accept
  if (negotiation.status === "proposed" && isBuyer) {
    const askingPrice = negotiation.asking_price ?? 0;

    if (!escrow.deposit) {
      const needsApproval = !escrow.allowance || escrow.allowance < parseUnits(String(askingPrice), 6);
      const balanceFormatted = escrow.usdcBalance != null ? formatUnits(escrow.usdcBalance, 6) : "—";

      return (
        <div className="space-y-2 mt-2">
          <p className="text-xs text-zinc-500">
            Balance: {balanceFormatted} USDC · Deposit: {askingPrice} USDC
          </p>
          {escrow.error && (
            <p className="text-xs text-red-400">{escrow.error.message}</p>
          )}
          {needsApproval ? (
            <Button
              size="sm"
              onClick={() => escrow.approve(askingPrice)}
              disabled={escrow.isPending || escrow.isConfirming}
            >
              {escrow.isPending || escrow.isConfirming ? "Approving…" : "Approve USDC"}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => { escrow.reset(); escrow.depositFunds(askingPrice); }}
              disabled={escrow.isPending || escrow.isConfirming}
            >
              {escrow.isPending || escrow.isConfirming ? "Depositing…" : "Deposit"}
            </Button>
          )}
        </div>
      );
    }

    // Has deposit, can accept
    return (
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="blue">Deposited</Badge>
        <span className="text-xs text-zinc-400">
          {formatUnits(escrow.deposit.amount, 6)} USDC
        </span>
      </div>
    );
  }

  // Accepted: seller can claim
  if (negotiation.status === "accepted" && isSeller && verification) {
    if (escrow.deposit) {
      const depositFormatted = formatUnits(escrow.deposit.amount, 6);
      return (
        <div className="space-y-2 mt-2">
          <p className="text-xs text-zinc-500">
            Deposited: {depositFormatted} USDC · Price: {negotiation.asking_price} USDC
          </p>
          {escrow.error && (
            <p className="text-xs text-red-400">{escrow.error.message}</p>
          )}
          <Button
            size="sm"
            onClick={() =>
              escrow.release(
                negotiation.seller_address as `0x${string}`,
                verification.outcome,
                BigInt(verification.finalPrice),
                BigInt(verification.timestamp),
                verification.signature as `0x${string}`
              )
            }
            disabled={escrow.isPending || escrow.isConfirming}
          >
            {escrow.isPending || escrow.isConfirming ? "Claiming…" : "Claim Payment"}
          </Button>
        </div>
      );
    }
  }

  // Accepted: buyer sees escrow info
  if (negotiation.status === "accepted" && isBuyer && escrow.deposit) {
    const depositFormatted = formatUnits(escrow.deposit.amount, 6);
    return (
      <div className="mt-2">
        <p className="text-xs text-zinc-400">
          {depositFormatted} USDC deposited. Seller can claim {negotiation.asking_price} USDC.
        </p>
      </div>
    );
  }

  // Has deposit but still running
  if (escrow.deposit) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="blue">Escrowed</Badge>
        <span className="text-xs text-zinc-400">
          {formatUnits(escrow.deposit.amount, 6)} USDC
        </span>
      </div>
    );
  }

  return null;
}
