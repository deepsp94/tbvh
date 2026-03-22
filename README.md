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
docs/                   Deployment guides
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

**TBVHEscrow** — Holds USDC deposits keyed by negotiation ID. Supports three settlement paths:

- `release()` — seller claims payment with a TEE-signed ACCEPT outcome
- `refundWithSignature()` — buyer reclaims funds with a TEE-signed REJECT outcome
- `refund()` — buyer reclaims after a 7-day timeout (no signature needed)

**MockUSDC** — ERC-20 with a public `mint()` for testnet use.

## Development

```bash
# Backend
npm install
npm run dev          # starts on :3000

# Frontend
cd web
npm install
npm run dev          # starts on :5173

# Contracts
cd contracts
forge build
forge test
```


