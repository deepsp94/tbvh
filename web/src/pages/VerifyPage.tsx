import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { verifyTypedData } from "viem";
import { getTeeVerification } from "../lib/api";
import { Badge } from "../components/ui/Badge";
import { Alert } from "../components/ui/Alert";
import { Skeleton } from "../components/ui/Skeleton";
import { TeeBadge } from "../components/TeeBadge";

export default function VerifyPage() {
  const { negotiationId } = useParams<{ negotiationId: string }>();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["teeVerify", negotiationId],
    queryFn: () => getTeeVerification(negotiationId!),
    enabled: !!negotiationId,
  });

  useEffect(() => {
    if (!data) return;

    async function verify() {
      setVerifying(true);
      try {
        const result = await verifyTypedData({
          address: data!.signerAddress as `0x${string}`,
          domain: {
            ...data!.domain,
            verifyingContract: data!.domain.verifyingContract as `0x${string}`,
          },
          types: data!.types,
          primaryType: "NegotiationOutcome",
          message: data!.value as Record<string, unknown>,
          signature: data!.signature as `0x${string}`,
        });
        setIsValid(result);
      } catch {
        setIsValid(false);
      } finally {
        setVerifying(false);
      }
    }

    verify();
  }, [data]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Link to="/" className="text-zinc-500 hover:text-zinc-300 text-sm">
          ← Back
        </Link>
        <Alert variant="error">
          {error instanceof Error ? error.message : "Failed to load verification data"}
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="text-zinc-500 hover:text-zinc-300 text-sm mb-6 inline-block"
      >
        ← Back
      </Link>

      <h1 className="text-lg font-semibold mb-6">Outcome Verification</h1>

      <div className="space-y-6">
        {/* Verification result */}
        {verifying ? (
          <Alert variant="info">Verifying signature...</Alert>
        ) : isValid === true ? (
          <Alert variant="success">Signature is valid. This outcome was cryptographically signed by the TEE signer.</Alert>
        ) : isValid === false ? (
          <Alert variant="error">Signature verification failed. This outcome may have been tampered with.</Alert>
        ) : null}

        {/* Outcome summary */}
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="green">ACCEPTED</Badge>
            <span className="text-sm font-medium text-zinc-200">
              {Number(data.finalPrice) / 1_000_000} USDC
            </span>
            <TeeBadge
              teeAttested={data.teeAttested ? 1 : 0}
              signature={data.signature}
            />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Negotiation</p>
            <p className="font-mono text-zinc-400 text-xs">{data.negotiationId}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Buyer</p>
              <p className="font-mono text-zinc-400 text-xs">{data.buyer}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Seller</p>
              <p className="font-mono text-zinc-400 text-xs">{data.seller}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Signer</p>
            <p className="font-mono text-zinc-400 text-xs">{data.signerAddress}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Timestamp</p>
            <p className="text-zinc-400 text-xs">
              {new Date(data.timestamp * 1000).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Signature */}
        <details className="border border-zinc-800 rounded-lg bg-zinc-900">
          <summary className="px-4 py-3 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200">
            Raw signature & EIP-712 data
          </summary>
          <div className="px-4 pb-4 space-y-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Signature</p>
              <p className="font-mono text-zinc-400 text-xs break-all">{data.signature}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">EIP-712 Domain</p>
              <pre className="text-xs text-zinc-400 overflow-auto">
                {JSON.stringify(data.domain, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">EIP-712 Value</p>
              <pre className="text-xs text-zinc-400 overflow-auto">
                {JSON.stringify(data.value, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
