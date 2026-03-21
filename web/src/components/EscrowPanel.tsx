import { useState, useEffect } from "react";
import { formatUnits, parseUnits } from "viem";
import { useConfig } from "../config/ConfigProvider";
import { useEscrow } from "../hooks/useEscrow";
import { getTeeVerification } from "../lib/api";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import type { PublicInstanceView, NegotiationOutcome, TeeVerification } from "@shared/types.js";

interface Props {
  instanceId: string;
  instance: PublicInstanceView;
  outcome: NegotiationOutcome | null;
  address: string | null;
}

export function EscrowPanel({ instanceId, instance, outcome, address }: Props) {
  const { contractAddress, tokenAddress } = useConfig();
  const escrow = useEscrow(
    instanceId,
    contractAddress as `0x${string}`,
    tokenAddress as `0x${string}`
  );
  const [verification, setVerification] = useState<TeeVerification | null>(null);

  const isBuyer = address && address === instance.buyer_address;
  const isSeller = address && address === instance.seller_address;

  // Fetch TEE verification data when needed
  useEffect(() => {
    if (instance.outcome_signature && (instance.status === "completed")) {
      getTeeVerification(instanceId).then(setVerification).catch(() => {});
    }
  }, [instanceId, instance.outcome_signature, instance.status]);

  // Refetch on-chain state after successful tx
  useEffect(() => {
    if (escrow.isSuccess) {
      escrow.refetchAll();
    }
  }, [escrow.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const zeroAddr = "0x0000000000000000000000000000000000000000";
  if (contractAddress === zeroAddr || tokenAddress === zeroAddr) {
    return null; // Contracts not deployed
  }

  // Already settled
  if (escrow.deposit?.settled) {
    return (
      <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900">
        <div className="flex items-center gap-2">
          <Badge variant="zinc">Escrow Settled</Badge>
          <span className="text-xs text-zinc-500">
            {formatUnits(escrow.deposit.amount, 6)} USDC
          </span>
        </div>
      </div>
    );
  }

  // No deposit yet — show deposit form for buyer
  if (!escrow.deposit) {
    if (!isBuyer || instance.status === "created") return null;

    const needsApproval = !escrow.allowance || escrow.allowance < parseUnits(String(instance.max_payment), 6);
    const balanceFormatted = escrow.usdcBalance != null ? formatUnits(escrow.usdcBalance, 6) : "—";

    return (
      <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-200">Deposit Escrow</h3>
        <p className="text-xs text-zinc-500">
          Balance: {balanceFormatted} USDC · Deposit: {instance.max_payment} USDC
        </p>
        {escrow.error && (
          <p className="text-xs text-red-400">{escrow.error.message}</p>
        )}
        <div className="flex gap-2">
          {needsApproval ? (
            <Button
              size="sm"
              onClick={() => escrow.approve(instance.max_payment)}
              disabled={escrow.isPending || escrow.isConfirming}
            >
              {escrow.isPending || escrow.isConfirming ? "Approving…" : "Approve USDC"}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => { escrow.reset(); escrow.depositFunds(instance.max_payment); }}
              disabled={escrow.isPending || escrow.isConfirming}
            >
              {escrow.isPending || escrow.isConfirming ? "Depositing…" : "Deposit"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Has deposit, negotiation complete
  if (outcome && instance.status === "completed") {
    const depositFormatted = formatUnits(escrow.deposit.amount, 6);

    if (outcome.outcome === "ACCEPT" && isSeller && verification) {
      return (
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200">Claim Payment</h3>
          <p className="text-xs text-zinc-500">
            Deposited: {depositFormatted} USDC · Final price: {outcome.final_price} USDC
          </p>
          {escrow.error && (
            <p className="text-xs text-red-400">{escrow.error.message}</p>
          )}
          <Button
            size="sm"
            onClick={() =>
              escrow.release(
                instance.seller_address as `0x${string}`,
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

    if (outcome.outcome === "ACCEPT" && isBuyer) {
      return (
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200">Escrow</h3>
          <p className="text-xs text-zinc-400">
            {depositFormatted} USDC deposited. Seller can claim {outcome.final_price} USDC.
            {outcome.final_price != null && Number(depositFormatted) > outcome.final_price && (
              <> Excess will be returned to you.</>
            )}
          </p>
        </div>
      );
    }

    if (outcome.outcome === "REJECT") {
      if (!isBuyer) return null;

      if (verification) {
        return (
          <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200">Refund Escrow</h3>
            <p className="text-xs text-zinc-500">
              {depositFormatted} USDC deposited. Negotiation rejected — claim your refund.
            </p>
            {escrow.error && (
              <p className="text-xs text-red-400">{escrow.error.message}</p>
            )}
            <Button
              size="sm"
              onClick={() =>
                escrow.refundWithSig(
                  instance.seller_address as `0x${string}`,
                  verification.outcome,
                  BigInt(verification.finalPrice),
                  BigInt(verification.timestamp),
                  verification.signature as `0x${string}`
                )
              }
              disabled={escrow.isPending || escrow.isConfirming}
            >
              {escrow.isPending || escrow.isConfirming ? "Refunding…" : "Refund"}
            </Button>
          </div>
        );
      }

      // No signature — show timeout refund
      const timeoutEnd = Number(escrow.deposit.depositedAt) + 7 * 24 * 60 * 60;
      const now = Math.floor(Date.now() / 1000);
      const canRefund = now >= timeoutEnd;
      const remaining = timeoutEnd - now;
      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);

      return (
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200">Refund Escrow</h3>
          <p className="text-xs text-zinc-500">
            {depositFormatted} USDC deposited.
            {canRefund
              ? " Timeout reached — you can refund."
              : ` Refund available in ${days}d ${hours}h.`}
          </p>
          {escrow.error && (
            <p className="text-xs text-red-400">{escrow.error.message}</p>
          )}
          <Button
            size="sm"
            onClick={() => escrow.refund()}
            disabled={!canRefund || escrow.isPending || escrow.isConfirming}
          >
            {escrow.isPending || escrow.isConfirming ? "Refunding…" : "Refund (timeout)"}
          </Button>
        </div>
      );
    }
  }

  // Has deposit but negotiation not yet complete — show status
  return (
    <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900">
      <div className="flex items-center gap-2">
        <Badge variant="blue">Escrowed</Badge>
        <span className="text-xs text-zinc-400">
          {formatUnits(escrow.deposit.amount, 6)} USDC
        </span>
      </div>
    </div>
  );
}
