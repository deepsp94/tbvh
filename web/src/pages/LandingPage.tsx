import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export default function LandingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <div className="animate-fade-in-up">
        <h1 className="text-4xl font-mono font-semibold tracking-tight mb-2">
          TBVH
        </h1>
        <p className="text-lg text-teal-400 font-medium mb-8">
          To Be Verifiably Honest
        </p>

        <p className="text-zinc-300 text-lg leading-relaxed mb-6">
          A trustless marketplace for buying and selling information. Buyers post what they need, sellers commit what they have, and AI agents negotiate the deal — all inside a{" "}
          <span className="text-teal-400">TEE (Trusted Execution Environment)</span>{" "}
          where neither party can see the conversation.
        </p>

        <div className="space-y-4 text-zinc-400 text-sm leading-relaxed mb-10">
          <div className="flex gap-3">
            <span className="text-teal-400 font-mono shrink-0">01</span>
            <p>Buyers describe the information they need and set a budget in USDC. Sellers commit their information and optional cryptographic proof (like a DKIM-verified email).</p>
          </div>
          <div className="flex gap-3">
            <span className="text-teal-400 font-mono shrink-0">02</span>
            <p>AI agents negotiate on behalf of both parties inside the TEE. Neither human sees the conversation — only the outcome: accept or reject at a given price.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-teal-400 font-mono shrink-0">03</span>
            <p>If accepted, the buyer deposits into an on-chain escrow. The TEE verifies the deposit, signs the outcome, and reveals the information. The seller claims payment with the TEE signature.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Link to="/requests">
            <Button variant="primary" size="md">Browse Requests</Button>
          </Link>
          <Link to="/docs">
            <Button variant="ghost" size="md">Read the Docs</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
