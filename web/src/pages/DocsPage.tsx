export default function DocsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">API Documentation</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Everything on TBVH can be done via the API. No frontend or browser wallet required.
      </p>

      <div className="space-y-12">
        {/* Authentication */}
        <Section title="Authentication (SIWE)">
          <P>
            TBVH uses Sign-In with Ethereum (SIWE). You sign a message with your private key
            to prove wallet ownership, then receive a JWT valid for 24 hours.
          </P>

          <H3>1. Get a nonce</H3>
          <Code>{`curl $API/auth/nonce?address=0xYOUR_ADDRESS`}</Code>
          <P>Returns <C>{`{"nonce": "abc123...", "expiresAt": "..."}`}</C>. The nonce expires in 5 minutes.</P>

          <H3>2. Construct and sign the SIWE message</H3>
          <P>
            The SIWE message must have the exact format below. The <C>domain</C> must match the
            backend's <C>SIWE_DOMAIN</C> config (check the frontend URL). Using <C>cast</C> from Foundry:
          </P>
          <Code>{`# Construct the message (replace values)
DOMAIN="tbvh-puce.vercel.app"
ADDRESS="0xYOUR_ADDRESS"
NONCE="abc123..."  # from step 1
URI="https://$DOMAIN"
CHAIN_ID=84532

MESSAGE="$DOMAIN wants you to sign in with your Ethereum account:
$ADDRESS

Sign in to TBVH

URI: $URI
Version: 1
Chain ID: $CHAIN_ID
Nonce: $NONCE
Issued At: $(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

# Sign with cast
SIGNATURE=$(cast wallet sign --private-key $PRIVATE_KEY "$MESSAGE")`}</Code>

          <H3>3. Verify and get JWT</H3>
          <Code>{`curl -X POST $API/auth/verify \\
  -H "Content-Type: application/json" \\
  -d "{\\"message\\": \\"$MESSAGE\\", \\"signature\\": \\"$SIGNATURE\\"}"

# Returns: {"token": "eyJ...", "address": "0x...", "expiresAt": "..."}`}</Code>
          <P>Use the token as <C>Authorization: Bearer &lt;token&gt;</C> on all authenticated requests.</P>
        </Section>

        {/* API Reference */}
        <Section title="API Reference">
          <H3>Instances</H3>
          <EndpointTable endpoints={[
            { method: "GET", path: "/instances", auth: "No", desc: "List all instances. Filter with ?status=open|closed" },
            { method: "GET", path: "/instances/:id", auth: "No", desc: "Get instance details" },
            { method: "POST", path: "/instances", auth: "Yes", desc: "Create instance (buyer)" },
            { method: "POST", path: "/instances/:id/close", auth: "Yes", desc: "Close instance (buyer). No new sellers can commit." },
            { method: "DELETE", path: "/instances/:id", auth: "Yes", desc: "Delete instance + all negotiations (buyer)" },
            { method: "GET", path: "/instances/mine", auth: "Yes", desc: "List your instances (as buyer and seller)" },
          ]} />

          <H3>Create Instance</H3>
          <Code>{`curl -X POST $API/instances \\
  -H "Authorization: Bearer $JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
    "buyer_requirement": "Looking for verified per-credit pricing for Snowflake Enterprise tier",
    "max_payment": 50
  }'`}</Code>

          <H3>Negotiations</H3>
          <EndpointTable endpoints={[
            { method: "POST", path: "/instances/:id/negotiate", auth: "Yes", desc: "Commit as seller. Negotiation auto-starts immediately." },
            { method: "GET", path: "/instances/:id/negotiations", auth: "Optional", desc: "List negotiations. View depends on role (buyer/seller/public)." },
            { method: "POST", path: "/negotiations/:nid/accept", auth: "Yes", desc: "Buyer accepts. Requires escrow deposit on-chain first." },
            { method: "POST", path: "/negotiations/:nid/cancel", auth: "Yes", desc: "Buyer or seller cancels." },
          ]} />

          <H3>Commit as Seller (text proof)</H3>
          <Code>{`curl -X POST $API/instances/INSTANCE_ID/negotiate \\
  -H "Authorization: Bearer $JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
    "seller_info": "I have the exact per-credit pricing from our 2025 Snowflake contract",
    "seller_proof": "I can provide the signed order form reference number"
  }'`}</Code>

          <H3>Commit as Seller (email proof)</H3>
          <Code>{`curl -X POST $API/instances/INSTANCE_ID/negotiate \\
  -H "Authorization: Bearer $JWT" \\
  -F "seller_info=I have the pricing details from our Snowflake renewal" \\
  -F "email_file=@pricing-email.eml"`}</Code>
          <P>
            The .eml file's DKIM signature is verified by the TEE. If verification fails, the commit is rejected.
            Max file size: 1MB.
          </P>

          <H3>Accept a Negotiation</H3>
          <P>
            After agents agree on a price, the negotiation enters <C>proposed</C> status.
            The buyer must deposit into escrow on-chain before calling accept.
          </P>
          <Code>{`# 1. Deposit on-chain (see On-Chain Operations below)
# 2. Then accept via API:
curl -X POST $API/negotiations/NEGOTIATION_ID/accept \\
  -H "Authorization: Bearer $JWT"

# Backend verifies the deposit on-chain, then signs the outcome with the TEE key.
# Returns the negotiation with status "accepted" and seller_info revealed.`}</Code>

          <H3>SSE Streams</H3>
          <EndpointTable endpoints={[
            { method: "GET", path: "/instances/:id/stream?token=JWT", auth: "Query param", desc: "Buyer: all negotiation events for this instance" },
            { method: "GET", path: "/negotiations/:nid/stream?token=JWT", auth: "Query param", desc: "Seller: events for their negotiation" },
          ]} />
          <Code>{`# Watch negotiation progress in real-time
curl -N "$API/instances/INSTANCE_ID/stream?token=$JWT"

# Events: turn_start, seller_response, buyer_response, proposed, rejected, error`}</Code>

          <H3>TEE</H3>
          <EndpointTable endpoints={[
            { method: "GET", path: "/tee/info", auth: "No", desc: "Signer address, contract addresses, chain ID, EIP-712 domain" },
            { method: "GET", path: "/tee/attestation", auth: "No", desc: "TDX attestation quote (proof of TEE)" },
            { method: "GET", path: "/tee/verify/:negotiationId", auth: "No", desc: "EIP-712 signature and verification data for an accepted negotiation" },
          ]} />
        </Section>

        {/* On-Chain Operations */}
        <Section title="On-Chain Operations">
          <P>
            All on-chain operations use Base Sepolia (chain ID 84532). Get the contract addresses from <C>GET /tee/info</C>:
          </P>
          <Code>{`curl $API/tee/info
# Returns: { contractAddress: "0x...", tokenAddress: "0x...", ... }`}</Code>

          <P>
            Negotiation IDs are mapped to bytes32 for the escrow contract using <C>keccak256(toHex(negotiationId))</C>.
            With cast:
          </P>
          <Code>{`BYTES32_ID=$(cast keccak "$(cast --to-hex-data $NEGOTIATION_ID)")`}</Code>

          <H3>Mint test USDC (testnet only)</H3>
          <Code>{`cast send $USDC "mint(address,uint256)" $YOUR_ADDRESS 1000000000 \\
  --rpc-url $RPC --private-key $PRIVATE_KEY
# 1000000000 = 1000 USDC (6 decimals)`}</Code>

          <H3>Approve escrow to spend USDC</H3>
          <Code>{`cast send $USDC "approve(address,uint256)" $ESCROW $AMOUNT \\
  --rpc-url $RPC --private-key $PRIVATE_KEY
# AMOUNT in smallest units (e.g. 50000000 = 50 USDC)`}</Code>

          <H3>Deposit into escrow</H3>
          <Code>{`cast send $ESCROW "deposit(bytes32,uint256)" $BYTES32_ID $AMOUNT \\
  --rpc-url $RPC --private-key $PRIVATE_KEY`}</Code>

          <H3>Release payment (seller claims)</H3>
          <P>
            After the buyer accepts, get the TEE signature from the verify endpoint:
          </P>
          <Code>{`# Get verification data
curl $API/tee/verify/$NEGOTIATION_ID
# Returns: { seller, outcome, finalPrice, timestamp, signature, ... }

# Seller calls release
cast send $ESCROW \\
  "release(bytes32,address,string,uint256,uint256,bytes)" \\
  $BYTES32_ID $SELLER_ADDRESS "ACCEPT" $FINAL_PRICE $TIMESTAMP $SIGNATURE \\
  --rpc-url $RPC --private-key $SELLER_PRIVATE_KEY`}</Code>

          <H3>Refund (buyer)</H3>
          <P>Two options: immediate refund with a TEE REJECT signature, or timeout refund after 7 days.</P>
          <Code>{`# With signature (immediate, requires REJECT outcome):
cast send $ESCROW \\
  "refundWithSignature(bytes32,address,string,uint256,uint256,bytes)" \\
  $BYTES32_ID $SELLER "REJECT" $FINAL_PRICE $TIMESTAMP $SIGNATURE \\
  --rpc-url $RPC --private-key $BUYER_PRIVATE_KEY

# Timeout (after 7 days, no signature needed):
cast send $ESCROW "refund(bytes32)" $BYTES32_ID \\
  --rpc-url $RPC --private-key $BUYER_PRIVATE_KEY`}</Code>
        </Section>

        {/* Full Example */}
        <Section title="Full Example">
          <P>End-to-end flow using curl and cast. Replace all placeholder values.</P>

          <Code>{`# === Setup ===
API="https://YOUR_BACKEND_URL"
RPC="https://base-sepolia.g.alchemy.com/v2/YOUR_KEY"
BUYER_KEY="0x..."   # Buyer's private key
SELLER_KEY="0x..."  # Seller's private key
BUYER_ADDR=$(cast wallet address $BUYER_KEY)
SELLER_ADDR=$(cast wallet address $SELLER_KEY)

# === 1. Authenticate (both parties) ===
# (repeat for buyer and seller with their respective keys)
NONCE=$(curl -s "$API/auth/nonce?address=$BUYER_ADDR" | jq -r .nonce)
# ... construct SIWE message and sign (see Authentication section)
BUYER_JWT="..."  # from /auth/verify

# === 2. Buyer creates an instance ===
INSTANCE=$(curl -s -X POST "$API/instances" \\
  -H "Authorization: Bearer $BUYER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"buyer_requirement": "Snowflake Enterprise pricing", "max_payment": 50}')
INSTANCE_ID=$(echo $INSTANCE | jq -r .id)

# === 3. Seller commits (negotiation auto-starts) ===
NEGOTIATION=$(curl -s -X POST "$API/instances/$INSTANCE_ID/negotiate" \\
  -H "Authorization: Bearer $SELLER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"seller_info": "I have the pricing", "seller_proof": "Signed order form"}')
NEGOTIATION_ID=$(echo $NEGOTIATION | jq -r .id)

# === 4. Watch negotiation (buyer) ===
curl -N "$API/instances/$INSTANCE_ID/stream?token=$BUYER_JWT"
# Wait for "proposed" event with asking_price

# === 5. Get contract addresses ===
TEE_INFO=$(curl -s "$API/tee/info")
ESCROW=$(echo $TEE_INFO | jq -r .contractAddress)
USDC=$(echo $TEE_INFO | jq -r .tokenAddress)

# === 6. Deposit into escrow ===
BYTES32_ID=$(cast keccak "$(cast --to-hex-data $NEGOTIATION_ID)")
AMOUNT=50000000  # 50 USDC

cast send $USDC "approve(address,uint256)" $ESCROW $AMOUNT \\
  --rpc-url $RPC --private-key $BUYER_KEY
cast send $ESCROW "deposit(bytes32,uint256)" $BYTES32_ID $AMOUNT \\
  --rpc-url $RPC --private-key $BUYER_KEY

# === 7. Accept ===
curl -s -X POST "$API/negotiations/$NEGOTIATION_ID/accept" \\
  -H "Authorization: Bearer $BUYER_JWT"
# Returns negotiation with status "accepted" and seller_info revealed

# === 8. Seller claims payment ===
VERIFY=$(curl -s "$API/tee/verify/$NEGOTIATION_ID")
FINAL_PRICE=$(echo $VERIFY | jq -r .finalPrice)
TIMESTAMP=$(echo $VERIFY | jq -r .timestamp)
SIGNATURE=$(echo $VERIFY | jq -r .signature)

cast send $ESCROW \\
  "release(bytes32,address,string,uint256,uint256,bytes)" \\
  $BYTES32_ID $SELLER_ADDR "ACCEPT" $FINAL_PRICE $TIMESTAMP $SIGNATURE \\
  --rpc-url $RPC --private-key $SELLER_KEY`}</Code>
        </Section>
      </div>
    </div>
  );
}

// --- Reusable components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-100 mb-4 pb-2 border-b border-zinc-800">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-zinc-200 mt-6">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-400 leading-relaxed">{children}</p>;
}

function C({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-mono">{children}</code>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

function EndpointTable({ endpoints }: { endpoints: Array<{ method: string; path: string; auth: string; desc: string }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left mt-2">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500">
            <th className="py-2 pr-3 font-medium">Method</th>
            <th className="py-2 pr-3 font-medium">Path</th>
            <th className="py-2 pr-3 font-medium">Auth</th>
            <th className="py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((e, i) => (
            <tr key={i} className="border-b border-zinc-800/50">
              <td className="py-2 pr-3 font-mono text-blue-400">{e.method}</td>
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
