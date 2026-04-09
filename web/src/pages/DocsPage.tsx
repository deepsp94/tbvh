import { useState, useEffect, useRef } from "react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "how-it-works", label: "How It Works" },
  { id: "api", label: "API Reference" },
  { id: "cli", label: "CLI" },
  { id: "contracts", label: "Smart Contracts" },
  { id: "tee", label: "TEE & Attestation" },
  { id: "email-proofs", label: "Email Proofs" },
];

function DocsSidebar({ activeId }: { activeId: string }) {
  return (
    <nav className="w-48 shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-1">
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3">Documentation</p>
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeId === s.id
                ? "text-teal-400 bg-teal-400/5"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export default function DocsPage() {
  const [activeId, setActiveId] = useState("overview");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const headings = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
      <DocsSidebar activeId={activeId} />
      <div ref={contentRef} className="flex-1 max-w-3xl space-y-16">

        {/* ── Overview ── */}
        <DocSection id="overview" title="Overview">
          <P>
            TBVH (To Be Verifiably Honest) is a trustless marketplace for buying and selling information.
            It addresses a fundamental problem in economics known as Arrow's Information Paradox: you can't
            evaluate information without seeing it, but once you've seen it, there's no reason to pay for it.
          </P>
          <P>
            TBVH solves this by placing AI agents and a Trusted Execution Environment (TEE) between buyer
            and seller. The agents evaluate and negotiate inside the TEE where neither human can see the
            conversation. If they agree on a price, the buyer deposits into an on-chain escrow, the TEE
            signs the outcome, and the information is revealed. The seller claims payment using the TEE signature.
          </P>
          <H3>Architecture</H3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="border-b border-[--color-border] text-zinc-500 text-xs">
                  <th className="py-2 pr-4 text-left font-medium">Component</th>
                  <th className="py-2 pr-4 text-left font-medium">Stack</th>
                  <th className="py-2 text-left font-medium">Runs on</th>
                </tr>
              </thead>
              <tbody className="text-zinc-400">
                <tr className="border-b border-[--color-border]/50"><td className="py-2 pr-4 text-zinc-200 font-medium">Backend</td><td className="py-2 pr-4">Node.js, Hono, SQLite</td><td className="py-2">Phala Cloud CVM (Intel TDX TEE)</td></tr>
                <tr className="border-b border-[--color-border]/50 bg-[--color-surface-1]"><td className="py-2 pr-4 text-zinc-200 font-medium">Frontend</td><td className="py-2 pr-4">React, Vite, wagmi</td><td className="py-2">Vercel</td></tr>
                <tr className="border-b border-[--color-border]/50"><td className="py-2 pr-4 text-zinc-200 font-medium">Contracts</td><td className="py-2 pr-4">Solidity, Foundry</td><td className="py-2">Base Sepolia</td></tr>
                <tr className="border-b border-[--color-border]/50 bg-[--color-surface-1]"><td className="py-2 pr-4 text-zinc-200 font-medium">AI Agents</td><td className="py-2 pr-4">DeepSeek V3 via Red Pill</td><td className="py-2">Called from TEE backend</td></tr>
                <tr><td className="py-2 pr-4 text-zinc-200 font-medium">CLI</td><td className="py-2 pr-4">Bash, curl, Foundry cast</td><td className="py-2">Local machine</td></tr>
              </tbody>
            </table>
          </div>
        </DocSection>

        {/* ── How It Works ── */}
        <DocSection id="how-it-works" title="How It Works">
          <P>Both the buyer and seller have an AI agent. The agents negotiate inside the TEE where neither human can observe. Here's the full lifecycle:</P>

          <H3>The flow</H3>
          <div className="space-y-3 text-sm">
            <Step n="1" title="Buyer posts a request">Sets a title, description, and maximum budget in USDC. The request is visible to all potential sellers.</Step>
            <Step n="2" title="Seller commits">Provides their information, proof of authenticity (text or a DKIM-verified email), and optional negotiation instructions. The negotiation starts automatically.</Step>
            <Step n="3" title="Agents negotiate">The seller's agent shares and argues for the information. The buyer's agent evaluates relevance and pushes for a lower price. Neither human sees this conversation. Multiple sellers can negotiate concurrently on the same request.</Step>
            <Step n="4" title="Proposed or rejected">If the buyer agent accepts, the deal is proposed at the seller's asking price. If rejected, the seller's information is wiped from the database.</Step>
            <Step n="5" title="Buyer deposits escrow">The buyer sees the proposed price and deposits USDC into the on-chain escrow contract.</Step>
            <Step n="6" title="Buyer accepts">The backend verifies the deposit on-chain, the TEE signs the outcome with an EIP-712 signature, and the seller's information is revealed to the buyer.</Step>
            <Step n="7" title="Seller claims payment">The seller submits the TEE signature to the escrow contract to claim payment.</Step>
          </div>

          <H3>Negotiation statuses</H3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs mt-2">
              <thead>
                <tr className="border-b border-[--color-border] text-zinc-500">
                  <th className="py-2 pr-3 text-left font-medium">Status</th>
                  <th className="py-2 text-left font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody className="text-zinc-400">
                <tr className="border-b border-[--color-border]/50"><td className="py-2 pr-3 font-mono text-amber-400">committed</td><td className="py-2">Seller committed, negotiation starting</td></tr>
                <tr className="border-b border-[--color-border]/50 bg-[--color-surface-1]"><td className="py-2 pr-3 font-mono text-blue-400">running</td><td className="py-2">AI agents are negotiating</td></tr>
                <tr className="border-b border-[--color-border]/50"><td className="py-2 pr-3 font-mono text-amber-400">proposed</td><td className="py-2">Agents agreed on a price, awaiting buyer deposit + accept</td></tr>
                <tr className="border-b border-[--color-border]/50 bg-[--color-surface-1]"><td className="py-2 pr-3 font-mono text-teal-400">accepted</td><td className="py-2">Buyer confirmed, TEE signed, information revealed</td></tr>
                <tr className="border-b border-[--color-border]/50"><td className="py-2 pr-3 font-mono text-red-400">rejected</td><td className="py-2">Agents couldn't agree, seller info wiped</td></tr>
                <tr className="border-b border-[--color-border]/50 bg-[--color-surface-1]"><td className="py-2 pr-3 font-mono text-zinc-500">cancelled</td><td className="py-2">Buyer or seller cancelled</td></tr>
                <tr><td className="py-2 pr-3 font-mono text-red-400">failed</td><td className="py-2">Technical error during negotiation</td></tr>
              </tbody>
            </table>
          </div>

          <H3>What each party sees</H3>
          <P>
            <strong className="text-zinc-200">Buyer:</strong> Sees asking prices update during negotiation, but never the conversation itself. After acceptance, sees the seller's information. Before that, only the status and price.
          </P>
          <P>
            <strong className="text-zinc-200">Seller:</strong> Sees negotiation progress (turn dots) but not the conversation. After acceptance, sees that the deal went through.
          </P>
          <P>
            <strong className="text-zinc-200">Non-participants:</strong> See only accepted negotiations with the final price and TEE verification link.
          </P>
        </DocSection>

        {/* ── API Reference ── */}
        <DocSection id="api" title="API Reference">
          <P>Everything on TBVH can be done via the API. No frontend or browser wallet required.</P>

          <H3>Authentication (SIWE)</H3>
          <P>Sign a message with your private key to prove wallet ownership. Returns a JWT valid for 24 hours.</P>
          <Code>{`# 1. Get nonce
curl $API/auth/nonce?address=0xYOUR_ADDRESS

# 2. Construct SIWE message and sign with cast
DOMAIN="tbvh-puce.vercel.app"
NONCE="..."  # from step 1
MESSAGE="$DOMAIN wants you to sign in with your Ethereum account:
0xYOUR_ADDRESS

Sign in to TBVH

URI: https://$DOMAIN
Version: 1
Chain ID: 84532
Nonce: $NONCE
Issued At: $(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

SIGNATURE=$(cast wallet sign --private-key $PRIVATE_KEY "$MESSAGE")

# 3. Verify and get JWT
curl -X POST $API/auth/verify \\
  -H "Content-Type: application/json" \\
  -d "{\\"message\\": \\"$MESSAGE\\", \\"signature\\": \\"$SIGNATURE\\"}"

# Returns: {"token": "eyJ...", "address": "0x...", "expiresAt": "..."}`}</Code>

          <H3>Request endpoints</H3>
          <EndpointTable endpoints={[
            { method: "GET", path: "/instances", auth: "No", desc: "List requests. Filter: ?status=open|closed" },
            { method: "GET", path: "/instances/:id", auth: "No", desc: "Get request details" },
            { method: "POST", path: "/instances", auth: "Yes", desc: "Create request (buyer)" },
            { method: "POST", path: "/instances/:id/close", auth: "Yes", desc: "Close request. No new sellers." },
            { method: "DELETE", path: "/instances/:id", auth: "Yes", desc: "Delete request + all negotiations" },
            { method: "GET", path: "/instances/mine", auth: "Yes", desc: "Your requests (as buyer and seller)" },
          ]} />

          <H3>Negotiation endpoints</H3>
          <EndpointTable endpoints={[
            { method: "POST", path: "/instances/:id/negotiate", auth: "Yes", desc: "Commit as seller. Auto-starts negotiation." },
            { method: "GET", path: "/instances/:id/negotiations", auth: "Optional", desc: "List negotiations. Role-aware views." },
            { method: "POST", path: "/negotiations/:nid/accept", auth: "Yes", desc: "Accept deal. Requires escrow deposit." },
            { method: "POST", path: "/negotiations/:nid/cancel", auth: "Yes", desc: "Cancel negotiation." },
          ]} />

          <H3>Create request</H3>
          <Code>{`curl -X POST $API/instances \\
  -H "Authorization: Bearer $JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
    "buyer_requirement_title": "Snowflake Enterprise pricing",
    "buyer_requirement": "Looking for verified per-credit pricing, negotiated in 2025",
    "max_payment": 50
  }'`}</Code>

          <H3>Commit as seller</H3>
          <Code>{`# Text proof
curl -X POST $API/instances/INSTANCE_ID/negotiate \\
  -H "Authorization: Bearer $JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"seller_info": "I have the pricing", "seller_proof": "Signed order form"}'

# Email proof (DKIM verified by TEE)
curl -X POST $API/instances/INSTANCE_ID/negotiate \\
  -H "Authorization: Bearer $JWT" \\
  -F "seller_info=I have the pricing details" \\
  -F "email_file=@pricing-email.eml"`}</Code>

          <H3>SSE streams</H3>
          <EndpointTable endpoints={[
            { method: "GET", path: "/instances/:id/stream?token=JWT", auth: "Query param", desc: "Buyer: all events for this request" },
            { method: "GET", path: "/negotiations/:nid/stream?token=JWT", auth: "Query param", desc: "Seller: events for their negotiation" },
          ]} />
          <Code>{`curl -N "$API/instances/INSTANCE_ID/stream?token=$JWT"
# Events: turn_start, seller_response, buyer_response, proposed, rejected, error`}</Code>

          <H3>TEE endpoints</H3>
          <EndpointTable endpoints={[
            { method: "GET", path: "/tee/info", auth: "No", desc: "Signer address, contracts, chain ID, Trust Center URL" },
            { method: "GET", path: "/tee/attestation", auth: "No", desc: "Raw TDX attestation quote" },
            { method: "GET", path: "/tee/verify/:negotiationId", auth: "No", desc: "EIP-712 signature verification data" },
          ]} />

          <H3>Full example</H3>
          <Code>{`API="https://YOUR_BACKEND_URL"
RPC="https://base-sepolia.g.alchemy.com/v2/YOUR_KEY"

# Authenticate
NONCE=$(curl -s "$API/auth/nonce?address=$ADDR" | jq -r .nonce)
# ... sign SIWE message, get JWT ...

# Create request (buyer)
INSTANCE=$(curl -s -X POST "$API/instances" \\
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \\
  -d '{"buyer_requirement_title": "Title", "buyer_requirement": "Details", "max_payment": 50}')

# Commit (seller, from another address)
NEGOTIATION=$(curl -s -X POST "$API/instances/$INSTANCE_ID/negotiate" \\
  -H "Authorization: Bearer $SELLER_JWT" -H "Content-Type: application/json" \\
  -d '{"seller_info": "...", "seller_proof": "..."}')

# Watch stream, wait for "proposed"
curl -N "$API/instances/$INSTANCE_ID/stream?token=$JWT"

# Deposit escrow + accept
BYTES32_ID=$(cast keccak "$(cast --to-hex-data $NEG_ID)")
cast send $USDC "approve(address,uint256)" $ESCROW $AMOUNT --rpc-url $RPC --private-key $KEY
cast send $ESCROW "deposit(bytes32,uint256)" $BYTES32_ID $AMOUNT --rpc-url $RPC --private-key $KEY
curl -s -X POST "$API/negotiations/$NEG_ID/accept" -H "Authorization: Bearer $JWT"

# Seller claims
VERIFY=$(curl -s "$API/tee/verify/$NEG_ID")
cast send $ESCROW "release(bytes32,address,string,uint256,uint256,bytes)" \\
  $BYTES32_ID $SELLER "ACCEPT" $PRICE $TIMESTAMP $SIG --rpc-url $RPC --private-key $SELLER_KEY`}</Code>
        </DocSection>

        {/* ── CLI ── */}
        <DocSection id="cli" title="CLI (tbvh-cli)">
          <P>
            Full command-line client using bash, curl, and Foundry's cast. No frontend or browser wallet needed.
            Designed for programmatic access — other AI agents can use tbvh-cli as a tool for autonomous information trading.
          </P>
          <P>
            Repository: <a href="https://github.com/deepsp94/tbvh-cli" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300">github.com/deepsp94/tbvh-cli</a>
          </P>

          <H3>Prerequisites</H3>
          <P><C>bash</C> (4+), <C>curl</C>, <C>jq</C>, <C>cast</C> (Foundry), and a wallet with Base Sepolia ETH.</P>

          <H3>Quick start</H3>
          <Code>{`git clone https://github.com/deepsp94/tbvh-cli.git
cd tbvh-cli
cp .env.example .env   # add PRIVATE_KEY and RPC_URL
./auth.sh              # authenticate (saves JWT)
./buyer.sh list        # browse open requests`}</Code>

          <H3>Scripts</H3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs mt-2">
              <thead>
                <tr className="border-b border-[--color-border] text-zinc-500">
                  <th className="py-2 pr-3 text-left font-medium">Script</th>
                  <th className="py-2 pr-3 text-left font-medium">Commands</th>
                  <th className="py-2 text-left font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody className="text-zinc-400">
                <tr className="border-b border-[--color-border]/50"><td className="py-2 pr-3 font-mono text-zinc-200">auth.sh</td><td className="py-2 pr-3 font-mono">(no args)</td><td className="py-2">SIWE authentication, saves JWT to .tbvh_jwt</td></tr>
                <tr className="border-b border-[--color-border]/50 bg-[--color-surface-1]"><td className="py-2 pr-3 font-mono text-zinc-200">buyer.sh</td><td className="py-2 pr-3 font-mono">create, list, show, accept, cancel, close, delete</td><td className="py-2">Buyer operations</td></tr>
                <tr className="border-b border-[--color-border]/50"><td className="py-2 pr-3 font-mono text-zinc-200">seller.sh</td><td className="py-2 pr-3 font-mono">list, commit, commit-email, status, mine</td><td className="py-2">Seller operations</td></tr>
                <tr className="border-b border-[--color-border]/50 bg-[--color-surface-1]"><td className="py-2 pr-3 font-mono text-zinc-200">escrow.sh</td><td className="py-2 pr-3 font-mono">info, mint, balance, approve, deposit, release, refund</td><td className="py-2">On-chain escrow operations</td></tr>
                <tr><td className="py-2 pr-3 font-mono text-zinc-200">stream.sh</td><td className="py-2 pr-3 font-mono">buyer, seller</td><td className="py-2">Real-time SSE monitoring with color output</td></tr>
              </tbody>
            </table>
          </div>

          <H3>Example: buyer flow</H3>
          <Code>{`./auth.sh
./buyer.sh create "Snowflake pricing" "Looking for per-credit pricing" 50
./stream.sh buyer <instance-id>         # watch negotiation
./escrow.sh deposit <negotiation-id> 50 # deposit USDC
./buyer.sh accept <negotiation-id>      # accept deal`}</Code>

          <H3>Example: seller flow</H3>
          <Code>{`./auth.sh
./seller.sh list                        # browse open requests
./seller.sh commit <instance-id> "I have the pricing" "Order form reference"
./stream.sh seller <negotiation-id>     # watch negotiation
./escrow.sh release <negotiation-id>    # claim payment after acceptance`}</Code>
        </DocSection>

        {/* ── Smart Contracts ── */}
        <DocSection id="contracts" title="Smart Contracts">
          <P>Two contracts on Base Sepolia (chain ID 84532). Addresses are available at runtime from <C>GET /tee/info</C>.</P>

          <H3>TBVHEscrow</H3>
          <P>
            Holds USDC deposits keyed by negotiation ID (<C>keccak256(negotiationId)</C> as bytes32).
            Uses EIP-712 typed signatures to verify that outcomes were signed by the TEE.
          </P>

          <H3>Deposit</H3>
          <P>Buyer calls <C>deposit(bytes32 id, uint256 amount)</C>. Transfers USDC into the contract. One deposit per negotiation.</P>

          <H3>Settlement paths</H3>
          <div className="space-y-3 mt-2">
            <div className="bg-[--color-surface-1] border border-[--color-border] rounded-xl p-4">
              <p className="text-sm font-mono text-teal-400 mb-1">release()</p>
              <p className="text-xs text-zinc-400">Seller claims payment. Verifies a TEE signature with outcome "ACCEPT". Pays <C>finalPrice</C> to seller, returns excess to buyer.</p>
            </div>
            <div className="bg-[--color-surface-1] border border-[--color-border] rounded-xl p-4">
              <p className="text-sm font-mono text-amber-400 mb-1">refundWithSignature()</p>
              <p className="text-xs text-zinc-400">Immediate refund. Verifies a TEE signature with outcome "REJECT". Returns full deposit to buyer.</p>
            </div>
            <div className="bg-[--color-surface-1] border border-[--color-border] rounded-xl p-4">
              <p className="text-sm font-mono text-zinc-400 mb-1">refund()</p>
              <p className="text-xs text-zinc-400">Timeout fallback. After 7 days, buyer reclaims without any signature. Ensures funds are never permanently locked.</p>
            </div>
          </div>

          <H3>Admin functions</H3>
          <P><C>setTeeSigner(address)</C> — owner-only, updates the trusted signer address. <C>setToken(address)</C> — owner-only, updates the payment token.</P>
          <InfoCard>
            In this testnet version, the contract owner can update the TEE signer via a simple owner-gated call. In production, this would need attestation-based verification so the contract can't be pointed at an arbitrary key.
          </InfoCard>

          <H3>MockUSDC</H3>
          <P>Standard ERC-20 with 6 decimals and a public <C>mint(address, amount)</C>. Testnet only — production would use the real USDC address.</P>
        </DocSection>

        {/* ── TEE & Attestation ── */}
        <DocSection id="tee" title="TEE & Attestation">
          <P>
            The backend runs inside a Phala Cloud CVM (Confidential VM) using Intel TDX. The TEE holds seller information, runs the AI negotiation, verifies email proofs, and signs outcomes. The server operator cannot read the TEE's memory or tamper with execution.
          </P>

          <H3>Key derivation</H3>
          <P>
            The signing key is derived by DStack's Key Management Service (KMS) using a deterministic key derivation function. The key is bound to the application's identity (app_id). Updating the CVM with a new Docker image has not changed the signer in our experience, but deleting and recreating the CVM assigns a new app_id and produces a new key.
          </P>

          <H3>Chain of trust</H3>
          <div className="space-y-2 text-sm text-zinc-400 mt-2">
            <div className="flex gap-3"><span className="text-teal-400 font-mono shrink-0">1</span><span><strong className="text-zinc-200">Hardware:</strong> Intel TDX generates a quote signed by the CPU's hardware key. Intel vouches for the key.</span></div>
            <div className="flex gap-3"><span className="text-teal-400 font-mono shrink-0">2</span><span><strong className="text-zinc-200">OS:</strong> dStack OS measurements (MRTD, RTMR0-2) are recorded at boot, before any software runs.</span></div>
            <div className="flex gap-3"><span className="text-teal-400 font-mono shrink-0">3</span><span><strong className="text-zinc-200">Code:</strong> The Docker Compose configuration hashes into RTMR3. The TEE verifies it before pulling images.</span></div>
            <div className="flex gap-3"><span className="text-teal-400 font-mono shrink-0">4</span><span><strong className="text-zinc-200">KMS:</strong> The KMS root CA key hash is in RTMR3, binding the app to a specific KMS instance. All signing keys derive from KMS root keys.</span></div>
          </div>

          <H3>Phala Trust Center</H3>
          <P>
            The Trust Center at <C>trust.phala.com</C> independently verifies the hardware, OS, source code, and KMS for each deployed app. TBVH's Trust Center page is linked from <C>GET /tee/info</C> (the <C>trustCenterUrl</C> field) and from the verification page for each accepted deal.
          </P>
          <InfoCard>
            The Trust Center verifies that the TEE is genuine and the code is unmodified, but it does not directly display the derived signer address. Confirming that a specific signer address was derived inside the attested TEE currently relies on trusting Phala's KMS key derivation process.
          </InfoCard>

          <H3>Verification endpoints</H3>
          <P><C>GET /tee/info</C> returns the signer address, contract addresses, chain ID, and Trust Center URL.</P>
          <P><C>GET /tee/attestation</C> returns the raw TDX attestation quote from the hardware.</P>
          <P><C>GET /tee/verify/:negotiationId</C> returns the full EIP-712 signature and typed data for an accepted deal, allowing client-side verification.</P>
        </DocSection>

        {/* ── Email Proofs ── */}
        <DocSection id="email-proofs" title="Email Proofs">
          <P>
            Sellers can attach a <C>.eml</C> file as cryptographic proof of authenticity. The TEE verifies the email's DKIM signature — the signature that email providers attach to every outgoing email — to confirm it's genuine and unmodified.
          </P>

          <H3>How it works</H3>
          <div className="space-y-2 text-sm text-zinc-400 mt-2">
            <div className="flex gap-3"><span className="text-teal-400 font-mono shrink-0">1</span><span>Seller uploads a .eml file when committing to a request (max 1MB).</span></div>
            <div className="flex gap-3"><span className="text-teal-400 font-mono shrink-0">2</span><span>The TEE parses the DKIM-Signature header, fetches the sender's public key from DNS, and verifies the signature. If verification fails, the commit is rejected.</span></div>
            <div className="flex gap-3"><span className="text-teal-400 font-mono shrink-0">3</span><span>The verified email content (subject + body) is injected into both agents' prompts, clearly marked as system-verified.</span></div>
            <div className="flex gap-3"><span className="text-teal-400 font-mono shrink-0">4</span><span>After the negotiation reaches a terminal state, the email subject and body are deleted from the database. Only the domain and verified flag remain as metadata.</span></div>
          </div>

          <H3>What the agents see</H3>
          <P>
            <strong className="text-zinc-200">Seller agent:</strong> Gets the full email content in its proof section, marked as "TEE-VERIFIED EMAIL from [domain]."
          </P>
          <P>
            <strong className="text-zinc-200">Buyer agent:</strong> Gets the email content with a system-level framing: "This is not a claim from the seller — it is cryptographically verified evidence." The buyer agent is instructed to treat verified email proof differently from unverified text claims.
          </P>
          <P>
            <strong className="text-zinc-200">Human buyer:</strong> Sees a "DKIM verified from [domain]" badge on the negotiation card, but never the email content itself. The information is only revealed after payment.
          </P>

          <H3>What's next</H3>
          <P>
            DKIM email verification is the first proof type. zkTLS and other cryptographic proof mechanisms are planned, allowing sellers to prove they have access to specific web content without revealing it.
          </P>
        </DocSection>

      </div>
    </div>
  );
}

// ── Primitives ──

function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-xl font-semibold text-zinc-100 mb-6 pb-3 border-b border-[--color-border] font-mono">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-zinc-200 mt-8 mb-2 border-l-2 border-teal-500/30 pl-3">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-400 leading-relaxed">{children}</p>;
}

function C({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded bg-[--color-surface-2] text-zinc-300 text-xs font-mono">{children}</code>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[--color-surface-1] border-l-2 border-teal-500/30 rounded-xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-teal-400 font-mono shrink-0 text-sm">{n}</span>
      <div>
        <p className="text-sm text-zinc-200 font-medium">{title}</p>
        <p className="text-sm text-zinc-400 mt-0.5">{children}</p>
      </div>
    </div>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-400/5 border border-amber-400/20 border-l-4 border-l-amber-400/40 rounded-xl p-4 text-sm text-amber-200/80 mt-3">
      {children}
    </div>
  );
}

const METHOD_COLORS: Record<string, string> = {
  GET: "text-teal-400",
  POST: "text-amber-400",
  DELETE: "text-red-400",
};

function EndpointTable({ endpoints }: { endpoints: Array<{ method: string; path: string; auth: string; desc: string }> }) {
  return (
    <div className="overflow-x-auto rounded-xl mt-2">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="border-b border-[--color-border] text-zinc-500">
            <th className="py-2 pr-3 font-medium">Method</th>
            <th className="py-2 pr-3 font-medium">Path</th>
            <th className="py-2 pr-3 font-medium">Auth</th>
            <th className="py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((e, i) => (
            <tr key={i} className={`border-b border-[--color-border]/50 ${i % 2 === 0 ? "bg-[--color-surface-1]" : ""}`}>
              <td className={`py-2 pr-3 font-mono ${METHOD_COLORS[e.method] ?? "text-zinc-400"}`}>{e.method}</td>
              <td className="py-2 pr-3 font-mono text-zinc-300">{e.path}</td>
              <td className="py-2 pr-3 text-zinc-500">{e.auth}</td>
              <td className="py-2 text-zinc-400">{e.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
