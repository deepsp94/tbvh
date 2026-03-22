# TBVH - To Be Verifiably Honest

A privacy-preserving marketplace for information, powered by TEE (Trusted Execution Environment). Enables buyers and sellers to negotiate over valuable information without the seller revealing it prematurely.

## The Problem: Arrow's Information Paradox

Selling information has a fundamental problem: **you can't evaluate information without seeing it, but once you see it, you don't need to pay for it.**

Example: Alice has insider knowledge about a company's upcoming earnings. Bob wants to buy this information to make a trade. But:
- If Alice reveals the information first, Bob can just use it without paying
- If Bob pays first, Alice might deliver worthless information
- If Alice gives a "preview," she might accidentally reveal enough to eliminate the need to pay

This is Arrow's Information Paradox, and it's why information markets are hard.

## How tbvh works

Both the buyer and the seller have their own AI agent. The agents negotiate with each other inside a TEE — a hardware-secured environment that neither party can observe or tamper with. The humans set the terms; the agents do the talking.

**The humans set up the deal:**

1. **Buyer** posts a request describing the information they need and a max budget in USDC.
2. **Sellers** commit their information and proof of authenticity. Multiple sellers can compete on the same request.

**The agents negotiate:**

3. The **seller's agent** describes the information in full detail and sets an asking price. The **buyer's agent** evaluates whether the information seems to meet the requirement and pushes for a lower price. They go back and forth for up to N turns.
4. The buyer agent's final verdict is binary: **accept** or **reject**. If it accepts, the deal is proposed at the seller's current asking price. Neither human sees what the agents said to each other. This prevents the buyer from learning the seller's information prematurely (and thus Arrow's Information Paradox is sidestepped), and also prevents either side from learning the other's negotiation strategy.

**The humans settle on-chain:**

5. The buyer sees the proposed price and **deposits** into an on-chain escrow.
6. The TEE verifies the deposit, signs the outcome with an EIP-712 signature, and reveals the seller's information to the buyer.
7. The seller **claims payment** from escrow using the TEE signature.

If the agents can't agree, the negotiation is rejected and the seller's information is wiped from the database (the buyer never sees it).

## Architecture

| Component | Stack | Runs on |
|-----------|-------|---------|
| Backend | Node.js, Hono, SQLite | [Phala Cloud](https://cloud.phala.com) CVM (Intel TDX TEE) |
| Frontend | React, Vite, wagmi | Vercel |
| Contracts | Solidity, Foundry | Base Sepolia |
| AI agents | DeepSeek via [Red Pill](https://red-pill.ai) API | Called from backend |

### Why a TEE?

The backend holds seller information, runs negotiations, and signs outcomes. Running inside a TEE (Trusted Execution Environment) means:

- The host cannot read seller data or negotiation messages from memory.
- The signing key is derived deterministically from the code itself — if the code changes, the key changes.
- Attestation proves to anyone that the exact published code is what's running.

The escrow contract only accepts signatures from the TEE signer, so funds can only be released or refunded based on genuine negotiation outcomes.

## Repo structure

```
src/                    Backend
  agents/               Buyer and seller LLM agents
  auth/                 SIWE authentication + JWT
  db/                   SQLite schema and queries
  instances/            Instance (buyer request) routes
  negotiations/         Negotiation (seller attempt) routes
  tee/                  Key derivation, EIP-712 signing, attestation
  negotiation.ts        Negotiation loop (turn-based agent conversation)
shared/                 TypeScript types shared between backend and frontend
web/                    Frontend (React + Vite)
contracts/              Solidity contracts (escrow + mock USDC)
```

## Data model

An **instance** is a buyer's open request. A **negotiation** is a seller's attempt to fulfill it.

```
Instance (open | closed)
  └── Negotiation A (committed → running → proposed → accepted)
  └── Negotiation B (committed → running → rejected)
  └── Negotiation C (cancelled)
```

Multiple negotiations run concurrently against the same instance. The buyer sees asking prices but never message content. The instance stays open until the buyer explicitly closes it.

## Contracts

### TBVHEscrow

The escrow contract holds USDC deposits keyed by a `bytes32` identifier (the keccak256 hash of the negotiation ID). It uses EIP-712 typed signatures to verify that outcomes came from the TEE signer.

**Deposit flow:** The buyer calls `deposit(id, amount)` which transfers USDC into the contract. Each ID can only have one deposit. The deposit records the buyer address, amount, and timestamp.

**Settlement paths:**

- `release(id, seller, outcome, finalPrice, timestamp, signature)` — Anyone can call this (typically the seller). Verifies the signature is from `teeSigner` with outcome `"ACCEPT"`. Pays `finalPrice` to the seller and returns any excess to the buyer.
- `refundWithSignature(id, seller, outcome, finalPrice, timestamp, signature)` — The fast refund path. Verifies a TEE signature with outcome `"REJECT"` and returns the full deposit to the buyer immediately.
- `refund(id)` — The timeout fallback. If 7 days have passed since deposit and the escrow hasn't been settled, the buyer can reclaim without any signature. This ensures funds are never permanently locked, even if the backend goes down.

**Admin functions:**

- `setTeeSigner(address)` — Owner-only. Updates which address the contract trusts for outcome signatures. Called when the backend is redeployed with code changes (which changes the TEE-derived key).
- `setToken(address)` — Owner-only. Updates the payment token address.

> **Note on `setTeeSigner`:** In this testnet version, the contract owner can update the TEE signer at any time via a simple owner-gated call. This is a convenience for development — it lets us rotate the signer when redeploying the backend without redeploying the contract. In a production version, this would need to be replaced with a mechanism that verifies the new signer is backed by a valid TEE attestation, so that the contract can't be pointed at an arbitrary key by the owner.

### MockUSDC

A standard ERC-20 with 6 decimals and a public `mint(address, amount)` function. Used for testnet only — in production this would be replaced with the real USDC contract address.

## Development

The backend and frontend have separate `package.json` files. The backend lives at the repo root; the frontend is in `web/`. They share TypeScript types via `shared/`, which is aliased as `@shared` in both tsconfigs.

```bash
# Backend — starts on :3000
npm install
npm run dev

# Frontend — starts on :5173, proxies /api to :3000
cd web
npm install
npm run dev

# Contracts
cd contracts
forge build
forge test
```

The backend needs a `.env` file with these variables:

| Variable | Purpose |
|----------|---------|
| `PHALA_API_KEY` | Red Pill API key for LLM inference |
| `JWT_SECRET` | 64 hex chars for JWT signing (`openssl rand -hex 32`) |
| `SIWE_DOMAIN` | Frontend domain for SIWE verification (e.g. `localhost:5173` in dev) |
| `CHAIN_ID` | `84532` for Base Sepolia |
| `ESCROW_CONTRACT` | Deployed escrow contract address |
| `USDC_CONTRACT` | Deployed USDC contract address |
| `ALCHEMY_API_KEY` | Alchemy API key for Base Sepolia RPC (used to verify escrow deposits on-chain) |

In development, `TEE_MODE` defaults to `dev`, which derives a deterministic wallet from a seed instead of using DStack hardware keys.

The frontend proxies `/api` requests to the backend in development (configured in `vite.config.ts`). In production, the frontend calls the backend directly via `VITE_API_URL`.

## Deployment

There are three things to deploy: the backend to Phala Cloud, contracts to Base Sepolia, and the frontend to Vercel. They depend on each other in a specific order.

### 1. Build and push the Docker image

The backend runs inside a Phala Cloud CVM (Confidential VM) as a Docker container. Phala CVMs are AMD64, so if you're on Apple Silicon you need to cross-compile:

```bash
docker buildx build --platform linux/amd64 -t <dockerhub-user>/tbvh-tee-core:v5 --load .
docker push <dockerhub-user>/tbvh-tee-core:v5
```

Never use `:latest` — Phala caches it aggressively and won't re-pull. Always use a new versioned tag for code changes.

The Dockerfile is a two-stage build: compile TypeScript in the builder stage, then copy `dist/` and `shared/` into a slim runtime image with only production dependencies.

### 2. Deploy backend to Phala Cloud

The `docker-compose.yml` defines the service configuration for Phala. Three things in it are required and non-obvious:

- `user: root` — the DStack socket is owned by root. Without this, the container silently fails to connect to the TEE hardware (no error, key derivation just doesn't work).
- `/var/run/tappd.sock` volume mount — the Unix socket that connects your container to DStack for key derivation and attestation.
- `DSTACK_SIMULATOR_ENDPOINT=/var/run/tappd.sock` — the `@phala/dstack-sdk` reads this env var to find the socket.

Deploy a new CVM:

```bash
phala deploy --name <cvm-name> --compose ./docker-compose.yml -e ./.env
```

This takes 1-3 minutes. After it's running, get the public URL:

```bash
phala cvms list
curl https://<app-id>-3000.dstack-pha-<node>.phala.network/health
curl https://<app-id>-3000.dstack-pha-<node>.phala.network/tee/info
```

The `/tee/info` response includes `signerAddress` — this is the TEE-derived signing key. You need it for the contract deployment.

The signer address is deterministic: same Docker image content = same key. But if you rebuild the image with code changes, the signer changes and you need to either redeploy contracts or call `setTeeSigner()` on the existing escrow contract.

To update an existing CVM (e.g. to push new env vars without changing the image):

```bash
phala deploy --cvm-id <cvm-name> --compose ./docker-compose.yml -e ./.env
```

To delete and start fresh:

```bash
phala cvms delete <cvm-name> --yes
```

### 3. Deploy contracts to Base Sepolia

Requires Foundry (`forge`) and a funded deployer wallet on Base Sepolia.

```bash
cd contracts
TEE_SIGNER=<signer-address-from-step-2> \
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "https://base-sepolia.g.alchemy.com/v2/<alchemy-key>" \
  --private-key <deployer-private-key> \
  --broadcast
```

This deploys MockUSDC and TBVHEscrow. The escrow contract is initialized with the TEE signer address — only signatures from that address are accepted for releases and refunds.

Record the deployed addresses and update `.env`:

```
ESCROW_CONTRACT=0x...
USDC_CONTRACT=0x...
```

Then redeploy the backend with the updated env (same image, signer won't change):

```bash
phala deploy --cvm-id <cvm-name> --compose ./docker-compose.yml -e ./.env
```

### 4. Deploy frontend to Vercel

The repo is set up for Vercel to build from the root. The root `vercel.json` tells Vercel to `cd web && npm install --legacy-peer-deps && npx vite build`, outputting to `web/dist`.

The `--legacy-peer-deps` flag is needed because `siwe` declares `ethers` as a peer dependency, and strict peer dep resolution conflicts with the rest of the dependency tree. `ethers` is listed explicitly in `web/package.json` to ensure it's available in the frontend bundle — even though ethers is also a backend dependency in the root `package.json`, Vercel installs `web/` dependencies in isolation, so the frontend can't rely on hoisting from the root `node_modules`.

The frontend needs two env vars on Vercel:

```
VITE_API_URL=https://<app-id>-3000.dstack-pha-<node>.phala.network
VITE_WALLETCONNECT_PROJECT_ID=<walletconnect-project-id>
```

These are the only frontend env vars. Everything else (chain ID, contract addresses, TEE config) is fetched from the backend at runtime via `GET /tee/info`.

The `VITE_API_URL` is compiled into the bundle at build time as `__API_BASE__`. In development it defaults to `/api` (proxied to localhost:3000); in production it's the full Phala backend URL.

After setting env vars, push to the connected GitHub repo and Vercel auto-deploys. Or deploy manually:

```bash
vercel --prod
```

### 5. Wire up SIWE domain

The backend validates SIWE signatures against `SIWE_DOMAIN`. This must match the frontend's origin (e.g. `tbvh-puce.vercel.app`). If you deployed the backend before knowing the Vercel URL, update `SIWE_DOMAIN` in `.env` and redeploy the backend one more time (same image, no signer change).

### Updating the backend after code changes

This is the most involved redeployment flow because the TEE signer address is derived from the Docker image content. When the image changes, the signer changes, and the escrow contract needs to know about it.

**Option A: Update the signer on the existing contract** (no downtime for existing deposits)

```bash
# 1. Build and push new image
docker buildx build --platform linux/amd64 -t <user>/tbvh-tee-core:v6 --load .
docker push <user>/tbvh-tee-core:v6

# 2. Update docker-compose.yml with the new tag, then deploy
phala deploy --cvm-id <cvm-name> --compose ./docker-compose.yml -e ./.env

# 3. Wait for the CVM to come up, then get the new signer
curl https://<app-id>-3000.dstack-pha-<node>.phala.network/tee/info
# → note the new signerAddress

# 4. Update the escrow contract's signer (must be called by the contract owner)
cast send <escrow-address> "setTeeSigner(address)" <new-signer-address> \
  --rpc-url "https://base-sepolia.g.alchemy.com/v2/<alchemy-key>" \
  --private-key <deployer-private-key>
```

After this, the escrow contract accepts signatures from the new signer. Existing unsettled deposits can still be released or refunded — the signature is generated at accept-time, so as long as `setTeeSigner` is called before anyone tries to claim, it works.

**Option B: Fresh deploy** (clean slate — simpler, but loses existing data)

```bash
# 1. Build and push
docker buildx build --platform linux/amd64 -t <user>/tbvh-tee-core:v6 --load .
docker push <user>/tbvh-tee-core:v6

# 2. Delete old CVM, deploy new one
phala cvms delete <cvm-name> --yes
# wait for deletion to complete
phala deploy --name <cvm-name> --compose ./docker-compose.yml -e ./.env

# 3. Get new signer
curl https://<app-id>-3000.dstack-pha-<node>.phala.network/tee/info

# 4. Deploy fresh contracts with the new signer
cd contracts
TEE_SIGNER=<new-signer> forge script script/Deploy.s.sol:Deploy \
  --rpc-url "https://base-sepolia.g.alchemy.com/v2/<alchemy-key>" \
  --private-key <deployer-private-key> --broadcast

# 5. Update .env with new contract addresses, redeploy backend
phala deploy --cvm-id <cvm-name> --compose ./docker-compose.yml -e ./.env

# 6. Update VITE_API_URL on Vercel if the CVM URL changed
```

### Redeployment cheatsheet

| What changed | What to do |
|---|---|
| Backend code | See "Updating the backend after code changes" above. |
| Backend env vars only | `phala deploy --cvm-id ...` with updated `.env`. Same image = same signer. |
| Frontend code | Push to GitHub (auto-deploys) or `vercel --prod`. |
| Frontend env vars | Update on Vercel dashboard, redeploy. |
| Contracts | Redeploy with `forge script`, update `.env` addresses, redeploy backend. |


