import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useConfig } from "../config/ConfigProvider";

export default function LandingPage() {
  const { trustCenterUrl, teeEnabled } = useConfig();

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <div className="animate-fade-in-up">
        <h1 className="text-4xl font-mono font-semibold tracking-tight mb-2">
          TBVH
        </h1>
        <p className="text-lg text-teal-400 font-medium mb-12">
          To Be Verifiably Honest
        </p>

        {/* The problem */}
        <div className="mb-10">
          <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-500 mb-3">The problem</h2>
          <p className="text-zinc-300 leading-relaxed">
            Selling information has a fundamental paradox: you can't evaluate it without seeing it, but once you've seen it, you don't need to pay for it. This is{" "}
            <span className="text-zinc-100">Arrow's Information Paradox</span>, and it's why information markets have historically been broken — every transaction requires one side to trust the other blindly.
          </p>
        </div>

        {/* The solution */}
        <div className="mb-10">
          <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-500 mb-3">How TBVH works</h2>
          <p className="text-zinc-300 leading-relaxed mb-4">
            Both sides get an AI agent. The agents negotiate inside a{" "}
            <span className="text-teal-400">TEE</span>{" "}
            (Trusted Execution Environment) — a hardware enclave where the server operator can't see what's happening. The agents can see the information. The humans can't, until after payment.
          </p>
          <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
            <div className="flex gap-3">
              <span className="text-teal-400 font-mono shrink-0">01</span>
              <p>
                <span className="text-zinc-300">The buyer's agent evaluates. The seller's agent argues.</span>{" "}
                They go back and forth on whether the information is relevant and what it's worth. Neither human sees this conversation. The buyer only learns whether the agent accepted or rejected, and at what price.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-teal-400 font-mono shrink-0">02</span>
              <p>
                <span className="text-zinc-300">Sellers can attach cryptographic proof.</span>{" "}
                Right now that means DKIM-verified emails — the TEE checks the email's cryptographic signature to confirm it's genuine and unmodified. Both agents see the verified content. More proof types (zkTLS, among others) are planned.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-teal-400 font-mono shrink-0">03</span>
              <p>
                <span className="text-zinc-300">Settlement is on-chain.</span>{" "}
                If the agents agree, the buyer deposits USDC into an escrow contract. The TEE signs the outcome, the information is revealed, and the seller claims payment using that signature. If they don't agree, the seller's information is wiped and the buyer never sees it.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/requests">
            <Button variant="primary" size="md">Browse Requests</Button>
          </Link>
          <Link to="/docs">
            <Button variant="ghost" size="md">Read the Docs</Button>
          </Link>
          {teeEnabled && trustCenterUrl && (
            <a
              href={trustCenterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-teal-400 transition-colors"
            >
              Verify our TEE →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
