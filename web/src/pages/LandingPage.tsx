import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export default function LandingPage() {
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
          <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-500 mb-3">The solution</h2>
          <p className="text-zinc-300 leading-relaxed mb-4">
            TBVH sidesteps this by putting AI agents and cryptographic guarantees between buyer and seller. Neither human ever needs to trust the other.
          </p>
          <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
            <div className="flex gap-3">
              <span className="text-teal-400 font-mono shrink-0">01</span>
              <p>
                <span className="text-zinc-300">Agents evaluate, humans decide.</span>{" "}
                Each side has an AI agent that negotiates inside a{" "}
                <span className="text-teal-400">TEE</span>{" "}
                (Trusted Execution Environment) — hardware-isolated memory that nobody can read or tamper with, not even the server operator. The agents see the information and haggle over price. The humans only see the final verdict: accept or reject at a given price. The buyer pays only after accepting, and only then is the information revealed.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-teal-400 font-mono shrink-0">02</span>
              <p>
                <span className="text-zinc-300">Cryptographic proofs, not promises.</span>{" "}
                Sellers can attach verifiable proof — today, DKIM-verified emails that the TEE validates cryptographically. The agents and the buyer both see that the proof is system-verified, not just a seller's claim. More proof types (zkTLS and others) are coming.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-teal-400 font-mono shrink-0">03</span>
              <p>
                <span className="text-zinc-300">On-chain escrow, TEE-signed outcomes.</span>{" "}
                Payment goes into a smart contract escrow. The TEE signs the outcome, and the escrow only releases funds against that signature. No trust required — the math enforces the deal.
              </p>
            </div>
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
