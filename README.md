# TBVH - To Be Verifiably Honest

A privacy-preserving marketplace for information, powered by TEE (Trusted Execution Environment). Enables buyers and sellers to negotiate over valuable information without the seller revealing it prematurely.

## The Problem: Arrow's Information Paradox

Selling information has a fundamental problem: **you can't evaluate information without seeing it, but once you see it, you don't need to pay for it.**

Example: Alice has insider knowledge about a company's upcoming earnings. Bob wants to buy this information to make a trade. But:
- If Alice reveals the information first, Bob can just use it without paying
- If Bob pays first, Alice might deliver worthless information
- If Alice gives a "preview," she might accidentally reveal enough to eliminate the need to pay

This is Arrow's Information Paradox, and it's why information markets are hard.

## The Solution

TBVH solves this using three components:

1. **TEE (Trusted Execution Environment)** - A secure enclave where code runs in isolation. Even the server operator cannot see the data inside. We use Intel TDX via Phala Cloud.

2. **AI Agent Negotiation** - Instead of humans negotiating directly, AI agents negotiate on their behalf. The buyer's agent evaluates the seller's pitch without the buyer seeing the actual information.

3. **Binary Outcome** - The buyer's agent outputs only ACCEPT or REJECT (plus reasoning). The actual information is only revealed to the buyer on ACCEPT, after payment.

```
┌─────────────────────────────────────────────────────────────────┐
│                         TEE Container                           │
│                                                                 │
│   Buyer provides:              Seller provides:                 │
│   - Requirement                - Information (secret)           │
│   - Max payment                - Proof/evidence                 │
│                                                                 │
│                    ┌─────────────────┐                          │
│                    │   AI Agents     │                          │
│                    │   Negotiate     │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│                             ▼                                   │
│                    ACCEPT or REJECT                             │
│                    (+ reasoning)                                │
│                                                                 │
│   On ACCEPT: seller_info revealed to buyer (after payment)     │
│   On REJECT: seller_info deleted, never seen by buyer          │
└─────────────────────────────────────────────────────────────────┘
```

## How It Works

### The Flow

```
1. BUYER creates instance
   └─→ Specifies: requirement, max payment, optional custom prompt
   └─→ Status: created

2. SELLER commits to instance
   └─→ Provides: information, proof, optional custom prompt
   └─→ Status: committed

3. BUYER starts negotiation
   └─→ AI agents begin negotiating inside TEE
   └─→ Status: running

4. NEGOTIATION completes
   └─→ Buyer agent outputs: ACCEPT $X or REJECT
   └─→ Status: completed

5. OUTCOME
   └─→ ACCEPT: seller_info revealed to buyer, payment processed
   └─→ REJECT: seller_info deleted permanently
```

### Instance Lifecycle

```
created ──→ committed ──→ running ──→ completed
   │                         │            │
   │                         │            └─→ ACCEPT or REJECT
   └─→ (can be cancelled)    └─→ failed (on error/timeout)
```

## Privacy Model

Understanding what each party can see is critical:

| Data | Buyer | Seller | TEE Only |
|------|-------|--------|----------|
| `buyer_requirement` | Yes | Yes | - |
| `max_payment` | Yes | Yes | - |
| `seller_info` | **Only on ACCEPT** | Yes | Yes (until outcome) |
| `seller_proof` | No | Yes | Yes |
| Agent conversation | No | No | Yes |
| `outcome` | Yes | Yes | - |
| `outcome_reasoning` | Yes | Yes | - |

**Key guarantees:**
- Seller's information is NEVER revealed to buyer before ACCEPT
- On REJECT or failure, seller_info is permanently deleted
- The agent conversation stays inside the TEE forever
- Even the server operator cannot see data inside the TEE

## Quick Start

### Prerequisites

- Node.js 22+
- A Phala Cloud API key (for the AI model)

### Local Development

```bash
# Clone the repo
git clone https://github.com/your-org/tbvh.git
cd tbvh

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your PHALA_API_KEY

# Start dev server
npm run dev
```

The server runs at `http://localhost:3000`.

### Test the API

```bash
# Health check
curl http://localhost:3000/health

# Get auth nonce
curl "http://localhost:3000/auth/nonce?address=0xYourAddress"

# List instances
curl http://localhost:3000/instances
```

## API Reference

### Authentication

Uses [Sign-In With Ethereum (SIWE)](https://eips.ethereum.org/EIPS/eip-4361) for wallet-based auth.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/nonce?address=0x...` | GET | No | Get nonce for SIWE message |
| `/auth/verify` | POST | No | Verify SIWE signature, get JWT |

### Instances

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/instances` | GET | Optional | List all instances (public view) |
| `/instances/mine` | GET | Required | List my instances (as buyer/seller) |
| `/instances/:id` | GET | Optional | Get instance details |
| `/instances` | POST | Required | Create instance (as buyer) |
| `/instances/:id/commit` | POST | Required | Commit to instance (as seller) |
| `/instances/:id/run` | POST | Required | Start negotiation (buyer only) |
| `/instances/:id/stream` | GET | Required | Stream progress via SSE |
| `/instances/:id` | DELETE | Required | Cancel instance (buyer, pre-commit) |

### Request/Response Examples

**Create Instance (Buyer):**
```bash
curl -X POST http://localhost:3000/instances \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_requirement": "Information about upcoming tech earnings surprises",
    "max_payment": 500
  }'
```

**Commit to Instance (Seller):**
```bash
curl -X POST http://localhost:3000/instances/<id>/commit \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "seller_info": "Company X will announce 30% earnings beat on Friday",
    "seller_proof": "I am a senior accountant at Company X, here is my employee badge..."
  }'
```

## Deployment to Phala Cloud

### Prerequisites

1. **Phala Cloud account** - Sign up at [cloud.phala.com](https://cloud.phala.com)
2. **Two API keys** (this is important!):
   - `PHALA_API_KEY` - For the RedPill AI API (get from Phala Cloud dashboard)
   - `PHALA_CLI_KEY` - For CLI authentication (User Avatar → API Tokens)
3. **Docker Hub account** - For hosting the container image
4. **Docker** - Installed locally

### Step-by-Step

```bash
# 1. Install Phala CLI
npm install -g phala

# 2. Authenticate
phala login  # Enter your PHALA_CLI_KEY when prompted
docker login  # Enter Docker Hub credentials

# 3. Build for linux/amd64 (critical!)
docker buildx build --platform linux/amd64 -t yourusername/tbvh-tee-core:latest --push .

# 4. Update docker-compose.yml to use your image
# Change: build: .
# To: image: yourusername/tbvh-tee-core:latest

# 5. Deploy
phala deploy --name tbvh-tee-core --compose ./docker-compose.yml -e ./.env --node-id 18
```

### Gotchas (Read This!)

| Issue | Solution |
|-------|----------|
| **"no matching manifest for linux/amd64"** | You built for arm64 (Mac). Rebuild with `--platform linux/amd64` |
| **"A CVM with name already exists"** | Use `--cvm-id <name>` to update existing deployment |
| **"No available resources"** | Try a different `--node-id`. Use `phala nodes list` to see options |
| **SIWE auth failing in production** | Update `SIWE_DOMAIN` in .env to match your frontend domain |
| **Can't find public URL** | Format: `https://<app-id>-<port>.dstack-pha-<node>.phala.network` |

### Useful Commands

```bash
# Check deployment status
phala cvms get <cvm-id>

# View logs
phala cvms logs <cvm-id>

# View boot/serial logs (useful for debugging)
phala cvms serial-logs <cvm-id>

# Restart
phala cvms restart <cvm-id>

# Update with new env/compose
phala deploy --cvm-id <name> --compose ./docker-compose.yml -e ./.env
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PHALA_API_KEY` | Yes | - | RedPill AI API key for LLM access |
| `JWT_SECRET` | Yes | `dev-secret...` | Secret for signing JWTs. **Generate a secure random value for production** |
| `SIWE_DOMAIN` | Yes | `localhost:3000` | Domain for SIWE auth. Must match frontend domain |
| `DB_PATH` | No | `./tbvh.db` | SQLite database path |
| `NEGOTIATION_TIMEOUT_MS` | No | `300000` | Overall negotiation timeout (5 min) |
| `PER_TURN_TIMEOUT_MS` | No | `120000` | Per-agent-turn timeout (2 min) |
| `MAX_NEGOTIATIONS_PER_USER_PER_DAY` | No | `10` | Rate limit per user |

Generate a secure JWT secret:
```bash
openssl rand -hex 32
```

## Project Structure

```
src/
├── index.ts           # Entry point, mounts routes
├── config.ts          # Environment configuration
├── types.ts           # TypeScript type definitions
├── negotiation.ts     # Agent orchestration with timeouts
├── agents/
│   ├── buyer.ts       # Buyer agent (evaluates, decides)
│   └── seller.ts      # Seller agent (presents, negotiates)
├── auth/
│   ├── siwe.ts        # SIWE signature verification
│   ├── jwt.ts         # JWT creation/verification
│   ├── nonce.ts       # Nonce generation/validation
│   └── middleware.ts  # Auth middleware (requireAuth, optionalAuth)
├── db/
│   ├── index.ts       # Database initialization
│   ├── schema.ts      # SQLite schema
│   ├── instances.ts   # Instance CRUD operations
│   ├── messages.ts    # Message storage (internal)
│   └── usage.ts       # Rate limiting tracking
└── routes/
    ├── index.ts       # Route aggregation
    ├── auth.ts        # Auth endpoints
    └── instances.ts   # Instance endpoints
```

## Current Status

**Phase 2 Complete** - Backend deployed to Phala Cloud TEE.

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Core Backend | Done | Auth, persistence, negotiation engine |
| 2. Phala Deployment | Done | Running in TEE on Phala Cloud |
| 3. Minimal UI | Next | Web interface with wallet connection |
| 4. File Uploads | Planned | Support documents/images as seller_info |
| 5. On-Chain Settlement | Planned | Smart contract escrow |

See [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) for detailed roadmap.

## Production Deployment

**URL:** `https://9d2c456b69edfaab2a77f556c22bbdadc3488a56-3000.dstack-pha-prod9.phala.network`

**Dashboard:** [cloud.phala.com/dashboard/cvms/...](https://cloud.phala.com/dashboard/cvms/app_9d2c456b69edfaab2a77f556c22bbdadc3488a56)

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** [Hono](https://hono.dev/) (lightweight, fast)
- **Database:** SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **Auth:** [SIWE](https://login.xyz/) + JWT
- **AI:** OpenAI SDK → Phala RedPill API (DeepSeek default)
- **TEE:** Intel TDX via [Phala Cloud](https://phala.cloud)

## License

MIT
