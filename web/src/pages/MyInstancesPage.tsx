import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { Card, CardHeader, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { getMyInstances } from "../lib/api";
import type { InstanceStatus, ParticipantInstanceView } from "@shared/types.js";

const STATUS_VARIANTS: Record<InstanceStatus, "amber" | "blue" | "green" | "red" | "zinc"> = {
  created: "amber",
  committed: "blue",
  running: "blue",
  completed: "green",
  failed: "red",
};

function InstanceCard({ instance }: { instance: ParticipantInstanceView }) {
  return (
    <Link to={`/instances/${instance.id}`} className="block">
      <Card className="hover:border-zinc-600 transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant={STATUS_VARIANTS[instance.status]}>{instance.status}</Badge>
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
          <div className="flex gap-4 text-xs text-zinc-500">
            <span>
              Max: <span className="text-zinc-300">{instance.max_payment} USDC</span>
            </span>
            {instance.outcome && (
              <span>
                Outcome:{" "}
                <span
                  className={
                    instance.outcome === "ACCEPT" ? "text-green-400" : "text-red-400"
                  }
                >
                  {instance.outcome}
                </span>
                {instance.final_price != null && (
                  <span className="text-zinc-300"> @ {instance.final_price} USDC</span>
                )}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Section({
  title,
  instances,
  emptyMessage,
}: {
  title: string;
  instances: ParticipantInstanceView[];
  emptyMessage: string;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-4 text-zinc-200">{title}</h2>
      {instances.length === 0 ? (
        <p className="text-zinc-500 text-sm">{emptyMessage}</p>
      ) : (
        <div className="grid gap-3">
          {instances.map((i) => (
            <InstanceCard key={i.id} instance={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyInstancesPage() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["myInstances"],
    queryFn: getMyInstances,
    enabled: isAuthenticated,
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
        <Section
          title="As Buyer"
          instances={data?.as_buyer ?? []}
          emptyMessage="No instances as buyer yet"
        />
        <Section
          title="As Seller"
          instances={data?.as_seller ?? []}
          emptyMessage="No instances as seller yet"
        />
      </div>
    </div>
  );
}
