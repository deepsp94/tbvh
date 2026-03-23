import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { listInstances } from "../lib/api";
import { relativeTime, shortAddress, formatUsdc } from "../lib/format";
import type { InstanceStatus, PublicInstanceView } from "@shared/types.js";

const STATUS_FILTERS: Array<{ label: string; value: string | undefined }> = [
  { label: "All", value: undefined },
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
];

const STATUS_VARIANTS: Record<InstanceStatus, "teal" | "zinc"> = {
  open: "teal",
  closed: "zinc",
};

export default function HomePage() {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<string | undefined>(undefined);

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["instances", activeStatus],
    queryFn: () => listInstances(activeStatus),
    refetchInterval: 10000,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold font-mono">Requests</h1>
          <p className="text-sm text-zinc-500 mt-1">Active information requests</p>
        </div>
        <Button variant="primary" onClick={() => navigate("/create")}>New Request</Button>
      </div>

      <div className="flex gap-4 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setActiveStatus(f.value)}
            className={`pb-2 text-sm transition-colors border-b-2 ${
              activeStatus === f.value
                ? "text-zinc-100 border-teal-500"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : instances.length === 0 ? (
        <p className="text-zinc-500 text-sm">No requests yet</p>
      ) : (
        <div className="grid gap-3 stagger-children">
          {instances.map((instance: PublicInstanceView) => (
            <Link key={instance.id} to={`/instances/${instance.id}`} className="block">
              <Card className="hover:border-[--color-border-hover] hover:bg-[--color-surface-2] cursor-pointer">
                <CardContent>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="text-sm font-medium text-zinc-100 mb-1">{instance.buyer_requirement_title}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {instance.buyer_requirement.length > 120
                          ? instance.buyer_requirement.slice(0, 120) + "..."
                          : instance.buyer_requirement}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-lg font-mono font-semibold text-zinc-100">
                        {formatUsdc(instance.max_payment)}
                        <span className="text-xs text-zinc-500 ml-1 font-normal">USDC</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <Badge variant={STATUS_VARIANTS[instance.status]}>{instance.status}</Badge>
                    <span className="font-mono">{shortAddress(instance.buyer_address)}</span>
                    <span>{relativeTime(instance.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
