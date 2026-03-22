import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { Card, CardHeader, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { getMyInstances } from "../lib/api";
import type { InstanceStatus, NegotiationStatus, PublicInstanceView, SellerNegotiationView } from "@shared/types.js";

const INSTANCE_STATUS_VARIANTS: Record<InstanceStatus, "amber" | "blue" | "green" | "red" | "zinc"> = {
  open: "green",
  closed: "zinc",
};

const NEG_STATUS_VARIANTS: Record<NegotiationStatus, "amber" | "blue" | "green" | "red" | "zinc"> = {
  committed: "amber",
  running: "blue",
  proposed: "amber",
  accepted: "green",
  rejected: "red",
  cancelled: "zinc",
  failed: "red",
};

function BuyerInstanceCard({ instance }: { instance: PublicInstanceView }) {
  return (
    <Link to={`/instances/${instance.id}`} className="block">
      <Card className="hover:border-zinc-600 transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant={INSTANCE_STATUS_VARIANTS[instance.status]}>{instance.status}</Badge>
            <span className="text-xs text-zinc-500">
              {new Date(instance.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-200 mb-2">
            {instance.buyer_requirement.length > 120
              ? instance.buyer_requirement.slice(0, 120) + "…"
              : instance.buyer_requirement}
          </p>
          <p className="text-xs text-zinc-500">
            Max: <span className="text-zinc-300">{instance.max_payment} USDC</span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function SellerNegotiationCard({ neg }: { neg: SellerNegotiationView & { buyer_requirement: string; max_payment: number } }) {
  return (
    <Link to={`/instances/${neg.instance_id}`} className="block">
      <Card className="hover:border-zinc-600 transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant={NEG_STATUS_VARIANTS[neg.status]}>{neg.status}</Badge>
            <span className="text-xs text-zinc-500">
              {new Date(neg.committed_at).toLocaleDateString()}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-200 mb-2">
            {neg.buyer_requirement.length > 120
              ? neg.buyer_requirement.slice(0, 120) + "…"
              : neg.buyer_requirement}
          </p>
          <div className="flex gap-4 text-xs text-zinc-500">
            <span>
              Max: <span className="text-zinc-300">{neg.max_payment} USDC</span>
            </span>
            {neg.asking_price != null && (
              <span>
                Price: <span className="text-zinc-300">{neg.asking_price} USDC</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function MyInstancesPage() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["myInstances"],
    queryFn: getMyInstances,
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400">Sign in to view your instances.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-8">My Instances</h1>
      <div className="space-y-10">
        <div>
          <h2 className="text-base font-semibold mb-4 text-zinc-200">As Buyer</h2>
          {(data?.as_buyer ?? []).length === 0 ? (
            <p className="text-zinc-500 text-sm">No instances as buyer yet</p>
          ) : (
            <div className="grid gap-3">
              {data!.as_buyer.map((i) => (
                <BuyerInstanceCard key={i.id} instance={i} />
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-base font-semibold mb-4 text-zinc-200">As Seller</h2>
          {(data?.as_seller ?? []).length === 0 ? (
            <p className="text-zinc-500 text-sm">No negotiations as seller yet</p>
          ) : (
            <div className="grid gap-3">
              {data!.as_seller.map((n) => (
                <SellerNegotiationCard key={n.id} neg={n} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
