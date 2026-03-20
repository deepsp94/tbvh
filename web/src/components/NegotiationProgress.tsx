import type { ProgressEvent } from "@shared/types.js";

interface Props {
  events: ProgressEvent[];
}

export function NegotiationProgress({ events }: Props) {
  const visible = events.filter(
    (e) => e.type === "seller_message" || e.type === "buyer_message"
  );

  if (visible.length === 0) {
    return <p className="text-zinc-500 text-sm">Waiting for negotiation to start...</p>;
  }

  return (
    <div className="space-y-3">
      {visible.map((event, i) => {
        const isSeller = event.type === "seller_message";
        return (
          <div key={i} className={`flex ${isSeller ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] ${isSeller ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <span className="text-xs text-zinc-500">
                {isSeller ? "Seller" : "Buyer"} · Turn {event.turn}
              </span>
              <div
                className={`px-3 py-2 rounded-lg text-sm text-zinc-100 ${
                  isSeller ? "bg-zinc-800" : "bg-zinc-700"
                }`}
              >
                {event.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
