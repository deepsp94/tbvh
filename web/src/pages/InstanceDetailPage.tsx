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
import { useInstanceStream } from "../hooks/useNegotiationStream";
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

const STATUS_VARIANTS: Record<InstanceStatus, "amber" | "blue" | "green" | "red" | "zinc"> = {
  open: "green",
  closed: "zinc",
};

function CommitForm({ instanceId, onSuccess }: { instanceId: string; onSuccess: () => void }) {
  const [sellerInfo, setSellerInfo] = useState("");
  const [sellerProof, setSellerProof] = useState("");
  const [sellerPrompt, setSellerPrompt] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      commitNegotiation(instanceId, {
        seller_info: sellerInfo,
        seller_proof: sellerProof,
        ...(sellerPrompt.trim() ? { seller_prompt: sellerPrompt } : {}),
      } as CommitNegotiationInput),
    onSuccess,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sellerInfo.trim() || !sellerProof.trim()) return;
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
          <Label htmlFor="seller-proof">Proof of Authenticity</Label>
          <Input
            id="seller-proof"
            placeholder="Link, hash, or description of proof..."
            value={sellerProof}
            onChange={(e) => setSellerProof(e.target.value)}
            required
          />
        </div>
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
  });

  const { data: negotiations = [], refetch: refetchNegotiations } = useQuery({
    queryKey: ["negotiations", id],
    queryFn: () => listNegotiations(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const isBuyer = address && instance && address === instance.buyer_address;

  // Only connect stream when there are running negotiations
  const hasRunning = negotiations.some(
    (n) => "status" in n && (n.status === "running" || n.status === "committed")
  );
  const { events } = useInstanceStream(
    isBuyer && hasRunning ? id! : null,
    jwt
  );

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
      navigate("/");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (isError || !instance) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-red-400 text-sm">Instance not found.</p>
        <Link to="/" className="text-zinc-400 hover:text-zinc-100 text-sm mt-2 inline-block">
          ← Back to instances
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="text-zinc-500 hover:text-zinc-300 text-sm mb-6 inline-block">
        ← Back to instances
      </Link>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <Badge variant={STATUS_VARIANTS[instance.status]}>{instance.status}</Badge>
          <span className="text-xs text-zinc-500">
            {new Date(instance.created_at).toLocaleString()}
          </span>
        </div>

        {/* Core info */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Requirement</p>
            <p className="text-sm text-zinc-200">{instance.buyer_requirement}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Max Payment</p>
              <p className="text-sm text-zinc-200">{instance.max_payment} USDC</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Buyer</p>
            <p className="text-xs font-mono text-zinc-400">{instance.buyer_address}</p>
          </div>
        </div>

        {/* Buyer actions */}
        {isBuyer && instance.status === "open" && (
          <div className="flex gap-3">
            <span title="Stop accepting new sellers. Existing negotiations continue.">
              <Button
                variant="ghost"
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
              >
                {closeMutation.isPending ? "Closing…" : "Close Instance"}
              </Button>
            </span>
            <span title="Permanently delete this instance and all its negotiations.">
              <Button
                variant="ghost"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Instance"}
              </Button>
            </span>
          </div>
        )}

        {/* Commit form for non-buyers on open instances */}
        {!isBuyer && isAuthenticated && instance.status === "open" && (
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
          <div className="space-y-3 border-t border-zinc-800 pt-6">
            <h2 className="text-sm font-semibold text-zinc-200">
              Negotiations ({negotiations.length})
            </h2>
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
        )}
      </div>
    </div>
  );
}
