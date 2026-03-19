import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Label } from "../components/ui/Label";
import { createInstance } from "../lib/api";

export default function CreateInstancePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const [requirement, setRequirement] = useState("");
  const [maxPayment, setMaxPayment] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createInstance({
        buyer_requirement: requirement,
        max_payment: Number(maxPayment),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
      navigate("/");
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400">Sign in to create an instance.</p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requirement.trim()) return;
    const payment = Number(maxPayment);
    if (!payment || payment <= 0) return;
    mutation.mutate();
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">Create Instance</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="requirement">Buyer Requirement</Label>
          <Textarea
            id="requirement"
            rows={4}
            placeholder="Describe what information you need..."
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="max-payment">Max Payment (USDC)</Label>
          <Input
            id="max-payment"
            type="number"
            min="0.000001"
            step="any"
            placeholder="e.g. 50"
            value={maxPayment}
            onChange={(e) => setMaxPayment(e.target.value)}
            required
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-400">
            {mutation.error instanceof Error ? mutation.error.message : "Something went wrong"}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
