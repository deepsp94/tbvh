import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.status === "ok" ? "connected" : "disconnected");
      })
      .catch(() => {
        setStatus("disconnected");
      });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">TBVH</h1>
        <p className="text-zinc-400">To Be Verifiably Honest</p>
        <div className="flex items-center justify-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              status === "connected"
                ? "bg-green-500"
                : status === "disconnected"
                  ? "bg-red-500"
                  : "bg-zinc-500 animate-pulse"
            }`}
          />
          <span className="text-sm text-zinc-400">
            {status === "loading"
              ? "Connecting..."
              : status === "connected"
                ? "Backend connected"
                : "Backend disconnected"}
          </span>
        </div>
      </div>
    </div>
  );
}
