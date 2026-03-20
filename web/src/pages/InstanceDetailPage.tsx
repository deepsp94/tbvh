import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Label } from "../components/ui/Label";
import { Badge } from "../components/ui/Badge";
import { NegotiationProgress } from "../components/NegotiationProgress";
import { ProgressTimeline } from "../components/ProgressTimeline";
import { OutcomeDisplay } from "../components/OutcomeDisplay";
import { useNegotiationStream } from "../hooks/useNegotiationStream";
import { getInstance, commitInstance, cancelInstance, runNegotiation } from "../lib/api";
import type { InstanceStatus, CommitInstanceInput, NegotiationOutcome } from "@shared/types.js";

const STATUS_VARIANTS: Record<InstanceStatus, "amber" | "blue" | "green" | "red" | "zinc"> = {
  created: "amber",
  committed: "blue",
  running: "blue",
  completed: "green",
  failed: "red",
};

function CommitForm({ instanceId, onSuccess }: { instanceId: string; onSuccess: () => void }) {
  const [sellerInfo, setSellerInfo] = useState("");
  const [sellerProof, setSellerProof] = useState("");
  const [sellerPrompt, setSellerPrompt] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      commitInstance(instanceId, {
        seller_info: sellerInfo,
        seller_proof: sellerProof,
        ...(sellerPrompt.trim() ? { seller_prompt: sellerPrompt } : {}),
      } as CommitInstanceInput),
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

  const [isStreaming, setIsStreaming] = useState(false);
  const { events, isDone } = useNegotiationStream(isStreaming ? id! : null, jwt);

  const { data: instance, isLoading, isError } = useQuery({
    queryKey: ["instance", id],
    queryFn: () => getInstance(id!),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "running" && !isDone) return 3000;
      return false;
    },
    enabled: !!id,
  });

  // Auto-connect stream if instance is already running/completed/failed
  useEffect(() => {
    if (
      instance?.status &&
      ["running", "completed", "failed"].includes(instance.status)
    ) {
      setIsStreaming(true);
    }
  }, [instance?.status]);

  const runMutation = useMutation({
    mutationFn: () => runNegotiation(id!),
    onSuccess: () => {
      setIsStreaming(true);
      queryClient.invalidateQueries({ queryKey: ["instance", id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelInstance(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
      navigate("/");
    },
  });

  // Derive outcome: prefer live stream event, fall back to instance fields
  const streamOutcome = events.find((e) => e.type === "outcome")?.outcome;
  const outcome: NegotiationOutcome | null =
    streamOutcome ??
    (instance?.outcome
      ? {
          outcome: instance.outcome,
          final_price: instance.final_price ?? null,
          reasoning: instance.outcome_reasoning ?? "",
        }
      : null);

  const isBuyer = address && instance && address === instance.buyer_address;
  const isRunningOrDone =
    instance?.status === "running" ||
    instance?.status === "completed" ||
    instance?.status === "failed";

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
            {instance.committed_at && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Committed</p>
                <p className="text-sm text-zinc-200">
                  {new Date(instance.committed_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Buyer</p>
              <p className="text-xs font-mono text-zinc-400">{instance.buyer_address}</p>
            </div>
            {instance.seller_address && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Seller</p>
                <p className="text-xs font-mono text-zinc-400">{instance.seller_address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Buyer actions */}
        {isBuyer && instance.status === "created" && (
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel Instance"}
            </Button>
          </div>
        )}

        {isBuyer && instance.status === "committed" && (
          <div>
            <Button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
            >
              {runMutation.isPending ? "Starting…" : "Start Negotiation"}
            </Button>
            {runMutation.isError && (
              <p className="text-sm text-red-400 mt-2">
                {runMutation.error instanceof Error
                  ? runMutation.error.message
                  : "Failed to start negotiation"}
              </p>
            )}
          </div>
        )}

        {/* Commit form for non-buyers */}
        {!isBuyer && isAuthenticated && instance.status === "created" && (
          <CommitForm
            instanceId={id!}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["instance", id] });
              queryClient.invalidateQueries({ queryKey: ["instances"] });
            }}
          />
        )}

        {/* Negotiation section */}
        {isRunningOrDone && (
          <div className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className="text-sm font-semibold text-zinc-200">Negotiation</h2>
            <ProgressTimeline
              events={events}
              maxTurns={10}
              isRunning={instance.status === "running"}
            />
            <NegotiationProgress events={events} />
          </div>
        )}

        {/* Outcome */}
        {outcome && (
          <div className="border-t border-zinc-800 pt-6">
            <h2 className="text-sm font-semibold text-zinc-200 mb-3">Outcome</h2>
            <OutcomeDisplay
              outcome={outcome}
              instanceId={id}
              teeAttested={instance.tee_attested}
              outcomeSignature={instance.outcome_signature}
            />
          </div>
        )}
      </div>
    </div>
  );
}
