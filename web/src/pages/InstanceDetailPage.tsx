import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Label } from "../components/ui/Label";
import { Badge } from "../components/ui/Badge";
import { NegotiationCard } from "../components/NegotiationCard";
import { useInstanceStream, useNegotiationStream } from "../hooks/useNegotiationStream";
import {
  getInstance,
  listNegotiations,
  commitNegotiation,
  closeInstance,
  deleteInstance,
} from "../lib/api";
import type {
  InstanceStatus,
  CommitNegotiationInput,
  BuyerNegotiationView,
  SellerNegotiationView,
  PublicNegotiationView,
} from "@shared/types.js";

const STATUS_VARIANTS: Record<InstanceStatus, "teal" | "zinc"> = {
  open: "teal",
  closed: "zinc",
};

function CommitForm({ instanceId, onSuccess }: { instanceId: string; onSuccess: () => void }) {
  const [sellerInfo, setSellerInfo] = useState("");
  const [sellerProof, setSellerProof] = useState("");
  const [sellerPrompt, setSellerPrompt] = useState("");
  const [proofType, setProofType] = useState<"text" | "email">("text");
  const [emailFile, setEmailFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      commitNegotiation(
        instanceId,
        {
          seller_info: sellerInfo,
          ...(proofType === "text" ? { seller_proof: sellerProof } : {}),
          ...(sellerPrompt.trim() ? { seller_prompt: sellerPrompt } : {}),
        } as CommitNegotiationInput,
        proofType === "email" ? emailFile ?? undefined : undefined
      ),
    onSuccess,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sellerInfo.trim()) return;
    if (proofType === "text" && !sellerProof.trim()) return;
    if (proofType === "email" && !emailFile) return;
    mutation.mutate();
  }

  return (
    <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 mt-6">
      <h2 className="text-sm font-semibold mb-4 text-zinc-200">Commit as Seller</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="seller-info">Information to Sell</Label>
          <Textarea
            id="seller-info"
            rows={4}
            placeholder="The information you're selling..."
            value={sellerInfo}
            onChange={(e) => setSellerInfo(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Proof Type</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setProofType("text")}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                proofType === "text" ? "text-zinc-100 bg-zinc-700" : "text-zinc-400 bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setProofType("email")}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                proofType === "email" ? "text-zinc-100 bg-zinc-700" : "text-zinc-400 bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              Email (.eml)
            </button>
          </div>
        </div>
        {proofType === "text" ? (
          <div className="space-y-1.5">
            <Label htmlFor="seller-proof">Proof of Authenticity</Label>
            <Input
              id="seller-proof"
              placeholder="Link, hash, or description of proof..."
              value={sellerProof}
              onChange={(e) => setSellerProof(e.target.value)}
              required
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="email-file">Email Proof (.eml file, max 1MB)</Label>
            <input
              id="email-file"
              type="file"
              accept=".eml"
              onChange={(e) => setEmailFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
            />
            <p className="text-xs text-zinc-500">
              The TEE will verify DKIM signatures to prove this email is authentic and unmodified.
            </p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="seller-prompt">Custom Negotiation Instructions (optional)</Label>
          <Textarea
            id="seller-prompt"
            rows={2}
            placeholder="e.g. Be firm on price, minimum acceptable is 30 USDC"
            value={sellerPrompt}
            onChange={(e) => setSellerPrompt(e.target.value)}
          />
        </div>
        {mutation.isError && (
          <p className="text-sm text-red-400">
            {mutation.error instanceof Error ? mutation.error.message : "Something went wrong"}
          </p>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Committing…" : "Commit"}
        </Button>
      </form>
    </div>
  );
}

export default function InstanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { address, jwt, isAuthenticated } = useAuth();

  const { data: instance, isLoading, isError } = useQuery({
    queryKey: ["instance", id],
    queryFn: () => getInstance(id!),
    enabled: !!id,
    refetchInterval: 10000,
  });

  const { data: negotiations = [], refetch: refetchNegotiations } = useQuery({
    queryKey: ["negotiations", id],
    queryFn: () => listNegotiations(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const isBuyer = address && instance && address === instance.buyer_address;
  const isSeller = !isBuyer && address && negotiations.some((n) => n.seller_address === address);

  // Buyer: instance-level stream (all negotiations)
  const hasRunning = negotiations.some(
    (n) => "status" in n && (n.status === "running" || n.status === "committed")
  );
  const { events: buyerEvents, isDone: buyerStreamDone } = useInstanceStream(
    isBuyer && hasRunning ? id! : null,
    jwt
  );

  // Seller: negotiation-level stream (their running negotiation)
  const sellerRunningNeg = isSeller
    ? negotiations.find((n) => n.seller_address === address && "status" in n && n.status === "running")
    : null;
  const { events: sellerEvents, isDone: sellerStreamDone } = useNegotiationStream(
    sellerRunningNeg?.id ?? null,
    jwt
  );

  const events = isBuyer ? buyerEvents : sellerEvents;
  const streamDone = isBuyer ? buyerStreamDone : sellerStreamDone;

  // When stream closes, refresh immediately
  useEffect(() => {
    if (streamDone) {
      queryClient.invalidateQueries({ queryKey: ["negotiations", id] });
    }
  }, [streamDone, id, queryClient]);

  // Determine role for each negotiation card
  function getRole(n: BuyerNegotiationView | SellerNegotiationView | PublicNegotiationView): "buyer" | "seller" | "public" {
    if (address && instance && address === instance.buyer_address) return "buyer";
    if (address && n.seller_address === address) return "seller";
    return "public";
  }

  const closeMutation = useMutation({
    mutationFn: () => closeInstance(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instance", id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInstance(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
      navigate("/requests");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (isError || !instance) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-red-400 text-sm">Instance not found.</p>
        <Link to="/requests" className="text-zinc-400 hover:text-zinc-100 text-sm mt-2 inline-block">
          ← Back to requests
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/requests" className="text-zinc-500 hover:text-zinc-300 text-sm mb-6 inline-block">
        ← Back to requests
      </Link>

      <div className="space-y-6">
        {/* Instance header card */}
        <div className="bg-[--color-surface-1] border border-[--color-border] rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <Badge variant={STATUS_VARIANTS[instance.status]}>{instance.status}</Badge>
            <span className="text-xs text-zinc-500">
              {new Date(instance.created_at).toLocaleString()}
            </span>
          </div>
          <h2 className="text-base font-medium text-zinc-100 mb-2">{instance.buyer_requirement_title}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">{instance.buyer_requirement}</p>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Max Payment</p>
              <p className="text-lg font-mono font-semibold text-zinc-100">
                {instance.max_payment}
                <span className="text-xs text-zinc-500 ml-1 font-normal">USDC</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Buyer</p>
              <p className="text-xs font-mono text-zinc-400">{instance.buyer_address}</p>
            </div>
          </div>
        </div>

        {/* Buyer actions */}
        {isBuyer && instance.status === "open" && (
          <div className="flex gap-3">
            <span title="Stop accepting new sellers. Existing negotiations continue to completion.">
              <Button
                variant="ghost"
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
              >
                {closeMutation.isPending ? "Closing…" : "Close Request"}
              </Button>
            </span>
            <span title="Permanently delete this request and all its negotiations.">
              <Button
                variant="ghost"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Request"}
              </Button>
            </span>
          </div>
        )}

        {/* Commit form for non-buyers on open instances (hide if seller has an active negotiation) */}
        {!isBuyer && isAuthenticated && instance.status === "open" && !negotiations.some((n) => n.seller_address === address && "status" in n && ["committed", "running", "proposed"].includes(n.status)) && (
          <CommitForm
            instanceId={id!}
            onSuccess={() => {
              refetchNegotiations();
              queryClient.invalidateQueries({ queryKey: ["negotiations", id] });
            }}
          />
        )}

        {/* Negotiations */}
        {negotiations.length > 0 && (
          <div className="space-y-3 border-t border-[--color-border] pt-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-semibold text-zinc-200 font-mono">Negotiations</h2>
              <Badge variant="zinc">{negotiations.length}</Badge>
            </div>
            <div className="space-y-3 stagger-children">
            {negotiations.map((n) => (
              <NegotiationCard
                key={n.id}
                negotiation={n}
                role={getRole(n)}
                instanceId={id!}
                events={events}
                maxTurns={10}
                address={address}
              />
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
