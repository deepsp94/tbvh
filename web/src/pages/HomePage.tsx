import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { listInstances } from "../lib/api";
import type { InstanceStatus, PublicInstanceView } from "@shared/types.js";

const STATUS_FILTERS: Array<{ label: string; value: string | undefined }> = [
  { label: "All", value: undefined },
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
];

const STATUS_VARIANTS: Record<InstanceStatus, "amber" | "blue" | "green" | "red" | "zinc"> = {
  open: "green",
  closed: "zinc",
};

function StatusBadge({ status }: { status: InstanceStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{status}</Badge>;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<string | undefined>(undefined);

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["instances", activeStatus],
    queryFn: () => listInstances(activeStatus),
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Instances</h1>
        <Button onClick={() => navigate("/create")}>Create Instance</Button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-zinc-800 pb-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setActiveStatus(f.value)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeStatus === f.value
                ? "text-zinc-100 bg-zinc-800"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : instances.length === 0 ? (
        <p className="text-zinc-500 text-sm">No instances yet</p>
      ) : (
        <div className="grid gap-3">
          {instances.map((instance: PublicInstanceView) => (
            <Link key={instance.id} to={`/instances/${instance.id}`} className="block">
              <Card className="hover:border-zinc-600 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={instance.status} />
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
                    Max payment: <span className="text-zinc-300">{instance.max_payment} USDC</span>
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
