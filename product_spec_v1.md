# TBVH Product Specification
## TEE-Based Verifiable Handoff for Prediction Market Information Exchange

**Version**: 1.0
**Date**: 2026-01-11
**Target Audience**: Senior Engineering Team
**Reference**: `formal_tbvh_v0.md`

---

## 1. Executive Summary

### What We're Building

A secure information marketplace that solves the disclosure-expropriation paradox for prediction market traders. Buyers need privileged information to trade effectively, but sellers can't prove their information's value without revealing it—thereby losing its value. TBVH uses TEE technology and AI agents to enable safe information exchange.

**Core Innovation**: AI agents negotiate on behalf of buyers and sellers inside a Trusted Execution Environment (Phala Network), where information can be validated without premature disclosure. If the deal succeeds, the buyer receives the information. If it fails, the seller's information is deleted.

### Key Terms

**Instance**: A single buyer-seller interaction session within the TBVH program. When a buyer creates an instance and a seller commits to it, the two parties' AI agents negotiate within that instance. Multiple instances can run concurrently within the same TBVH program deployment. An instance is NOT a separate TEE deployment—it's a logical session within the single deployed program.

### Key Outcomes

1. **For Sellers**: Monetize privileged information without identity exposure
2. **For Buyers**: Verify information quality and source credibility before payment
3. **For Markets**: Enable information flow from experts to traders, improving price discovery

### V0 Scope

This version focuses on the core negotiation mechanism: AI agents interacting inside a TEE. The following are explicitly deferred to future versions:
- **On-chain settlement**: Smart contracts, escrow, atomic swaps
- **TEE attestation proofs**: Cryptographic verification of TEE state
- **Identity management**: Verifiable credentials, selective disclosure, PKI integration

For V0, payment and identity verification happen outside the system (manually or via existing tools).

---

## 2. System Architecture

### 2.1 High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     PHALA CLOUD (TEE)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         TBVH Docker Container (Single Deployment)       │ │
│  │                                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │  │  Instance    │  │  Instance    │  │  Instance    │  │ │
│  │  │   #1234      │  │   #1235      │  │   #1236      │  │ │
│  │  │              │  │              │  │              │  │ │
│  │  │  A_B ↔ A_S   │  │  A_B ↔ A_S   │  │  A_B ↔ A_S   │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │ │
│  │                                                          │ │
│  │  - Instance Management                                  │ │
│  │  - AI Agent Orchestration                               │ │
│  │  - Session State Management                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
    ┌────▼─────┐                             ┌────▼─────┐
    │  BUYER   │                             │  SELLER  │
    │  CLIENT  │                             │  CLIENT  │
    │          │                             │          │
    │ - Create │                             │ - Browse │
    │   Instance                             │   Instances
    │ - Configure│                           │ - Submit │
    │   Agent    │                           │   Info   │
    │ - Set Budget                           │ - Configure
    │ - Monitor  │                           │   Agent  │
    └───────────┘                             └───────────┘
```

### 2.2 Component Responsibilities

**TBVH Docker Container** (deployed on Phala Cloud)
- Hosts all buyer-seller interaction instances
- Manages instance lifecycle (create, activate, terminate)
- Orchestrates AI agent communication
- Handles information deletion on rejection

**Buyer Client**
- Instance creation interface
- Agent configuration (R_B, π_B)
- Budget and parameter setting
- Instance monitoring

**Seller Client**
- Instance discovery and browsing
- Information submission (I_S, P_S)
- Agent configuration (π_S)

**Settlement Layer** (Future Version)
- Smart contracts for escrow and atomic swaps
- On-chain verification of TEE attestation
- For V0, payment happens outside the system

---

## 3. Technical Stack

### 3.1 Required Technologies

**TEE Infrastructure**
- **Phala Cloud**: Deploy Docker container to Phala's confidential computing environment
- **Containerization**: Docker for TBVH program packaging and deployment

**AI/ML**
- **LLM Provider**: Phala Cloud Confidential AI API
  - Runs AI inference inside GPU TEE with hardware attestation
  - OpenAI-compatible interface (base URL: `https://api.redpill.ai/v1`)
  - Supported models:
    - DeepSeek V3 0324 (`deepseek/deepseek-chat-v3-0324`) - 163K context
    - Qwen2.5 VL 72B Instruct (`qwen/qwen2.5-vl-72b-instruct`) - 65K context
    - Google Gemma 3 27B (`google/gemma-3-27b-it`) - 53K context
    - DeepSeek R1 0528 (`deepseek/deepseek-r1-0528`) - 163K context (reasoning)
  - Cryptographic verification available via TEE attestation
  - See: https://docs.phala.com/phala-cloud/confidential-ai/confidential-model/confidential-ai-api
- **Token Management**: Budget tracking and limits per instance (pay-per-request pricing)

**Backend Services**
- **API Gateway**: RESTful or GraphQL for client interactions
- **Database**: Instance metadata, user accounts (off-chain)
  - PostgreSQL or similar for relational data
  - Consider privacy: minimal PII storage
- **Message Queue**: For async operations (notifications)
  - Redis/RabbitMQ for task queuing

**Frontend**
- **Web Application**: React, Next.js, or similar modern framework
- **File Upload**: Secure handling of I_S, P_S documents

**Future Version Technologies** (not in V0)
- Smart contracts for escrow and settlement
- On-chain attestation verification
- Verifiable credentials and selective disclosure
- Wallet integration for on-chain payments

### 3.2 Technology Constraints

**Critical Requirements**:
1. All AI inference MUST occur within TEE—Phala Cloud's Confidential AI API runs models in GPU TEE, ensuring I_S never leaves the secure environment
2. Instance data MUST be isolated (no cross-instance data leakage)
3. Information (I_S) MUST be deleted on session rejection

---

## 4. Core Components

### 4.1 TBVH Docker Container (On Phala Cloud)

**Primary Artifact**: Docker container deployed to Phala Cloud

**Responsibilities**:
- Instance lifecycle management
- Agent orchestration (buyer ↔ seller)
- Budget enforcement
- Proof request handling
- Secure state management

**Key Modules**:

**Instance Manager**
- `createInstance(R_B, π_B, P_max, L, T) -> I_id`
- `activateInstance(I_id, seller_data) -> session`
- `terminateInstance(I_id, outcome) -> result`
- Instance state machine: CREATED → ACTIVE → NEGOTIATING → TERMINATED

**Agent Orchestrator**
- Instantiate buyer agent with π_B
- Instantiate seller agent with π_S
- Manage message passing between agents
- Enforce turn limits and timeout T
- Track proof request count against limit L

**Budget Manager**
- Track P_max for the session
- Validate agent payment decisions ≤ P_max

**Secure Deletion**
- On REJECT: delete I_S, P_S, conversation logs from memory
- No data persists post-termination except outcome metadata

**Technical Notes**:
- Minimize persistent storage; sessions are ephemeral
- Log only non-sensitive metadata (I_id, timestamps, outcomes)

### 4.2 Buyer Client

**Artifact**: Web application + backend API

**Key Features**:

**Instance Creation Flow**
1. User drafts R_B (text editor, file upload, or AI-assisted)
2. User configures π_B:
   - Evaluation criteria
   - Acceptance thresholds
   - Proof validation requirements
3. User sets P_max, L, T
4. Submit to TBVH program → receive I_id
5. Publish I_id to discovery marketplace

**Agent Configuration UI**
- Template-based prompt builder for π_B
- Preview/test mode (simulate agent behavior)

**Monitoring Dashboard**
- Active instance status
- Notifications (proof requests, agent decisions)
- Conversation log viewer (post-session, if available)

**Technical Considerations**:
- API to TBVH program for instance creation and monitoring
- WebSocket or polling for real-time updates

### 4.3 Seller Client

**Artifact**: Web application + backend API

**Key Features**:

**Instance Discovery**
- Browse active instances (filter by topic, budget, deadline)
- View R_B and π_B for each instance
- Assess fit: "Can I meet these requirements?"

**Information Submission Flow**
1. User uploads I_S (text, files, structured data)
2. User uploads P_S (supporting evidence, credentials)
3. User configures π_S:
   - Presentation strategy
   - Minimum acceptable payment
   - Rejection criteria
4. Commit to instance I_id → triggers session activation

**Technical Considerations**:
- Secure file upload (encryption in transit)
- Integration with TBVH program API

### 4.4 Supporting Services

**Discovery Marketplace**
- API: `listInstances(filters) -> Instance[]`
- Search/filter by topic, budget, deadline

**Notification Service**
- Proof request alerts to seller
- Agent decision alerts to buyer
- Multi-channel: email, push, webhook

### 4.5 Settlement Layer (Future Version)

The following will be developed in future versions:
- **Escrow Contract**: Lock buyer funds, release on accept, refund on reject
- **Information Transfer Contract**: Atomic swap of payment and encrypted information
- **Attestation Verifier**: On-chain verification of TEE attestation proofs

For V0, payment and information transfer happen outside the system after agent negotiation completes.

---

## 5. Data Models

### 5.1 Core Entities

**Instance** (stored in database)
```
{
  id: string (I_id),
  buyer_id: string,
  seller_id: string | null,
  status: enum (CREATED, ACTIVE, NEGOTIATING, ACCEPTED, REJECTED),
  created_at: timestamp,
  activated_at: timestamp | null,
  terminated_at: timestamp | null,

  // Buyer config (public)
  requirement: text (R_B),
  buyer_agent_prompt: text (π_B),
  budget: number (P_max),
  proof_limit: number (L),
  session_timeout: number (T),
  buyer_model: string,

  // Seller config (private, only in TEE during session)
  seller_agent_prompt: text (π_S) | null,
  seller_model: string | null,

  // Outcome
  final_payment: number | null,

  // Metadata
  proof_requests_used: number,
  session_duration: number | null
}
```

**Agent Message** (ephemeral, only exists during session in TEE)
```
{
  instance_id: string,
  sender: enum (BUYER_AGENT, SELLER_AGENT),
  timestamp: timestamp,
  content: text,
  message_type: enum (PRESENTATION, QUESTION, PROOF_REQUEST, RESPONSE)
}
```

**Proof Request** (logged for accountability)
```
{
  instance_id: string,
  request_number: number (1..L),
  requested_at: timestamp,
  description: text,
  fulfilled: boolean
}
```

### 5.2 Data Flow

**Instance Creation** (Buyer → TEE)
```
Buyer Client
  → API: POST /instances {R_B, π_B, P_max, L, T}
  → Database: Store instance (status=CREATED)
  → Phala: createInstance() via RPC
  ← I_id
```

**Seller Commitment** (Seller → TEE)
```
Seller Client
  → API: POST /instances/{I_id}/commit {I_S, P_S, π_S}
  → Phala: activateInstance(I_id, seller_data) via RPC
  ← session_started
  → Database: Update instance (status=ACTIVE, seller_id=...)
```

**Agent Negotiation** (Internal to TEE)
```
TEE Program:
  1. Load buyer & seller data into isolated memory
  2. Instantiate A_B with π_B, A_S with π_S
  3. Message loop: A_B ↔ A_S
  4. On proof request: notify seller via webhook
  5. On timeout or decision: terminate session
```

**Session Outcome**
```
TEE Program:
  → If ACCEPT: Return I_S to buyer, record final payment amount
  → If REJECT: Delete I_S, notify both parties
  → Database: Update instance status and outcome
```

---

## 6. API Specifications

### 6.1 Client-Facing API

**Buyer Endpoints**
```
POST /instances
  Request: {R_B, π_B, P_max, L, T, buyer_model}
  Response: {I_id}

GET /instances/{I_id}
  Response: Instance object

GET /instances?status=CREATED&buyer_id={id}
  Response: Instance[]

DELETE /instances/{I_id}
  (Cancel before seller commits)
```

**Seller Endpoints**
```
GET /instances?status=CREATED
  Response: Instance[] (discoverable instances)

POST /instances/{I_id}/commit
  Request: {I_S, P_S, π_S, seller_model}
  Response: {session_id}

POST /instances/{I_id}/proofs
  Request: {proof_data}
  (Respond to proof request during active session)
```

### 6.2 TBVH Program Interface

The TBVH Docker container exposes these methods:

```
createInstance(R_B, π_B, P_max, L, T, buyer_model) -> I_id

activateInstance(I_id, seller_data) -> session_id

getInstanceStatus(I_id) -> {status, proof_requests_used, time_remaining}

submitProof(I_id, proof_data) -> proof_accepted

terminateInstance(I_id) -> {outcome, payment}
```

### 6.3 Webhook/Event System

**Events Emitted by TBVH Program**:
- `instance.created` → notify marketplace
- `instance.activated` → notify buyer
- `proof.requested` → notify seller
- `session.timeout` → notify both parties
- `decision.made` → notify both parties

---

## 7. Security Requirements

### 7.1 Core Security Properties

**Critical Invariants**:
1. **Isolation**: Instance I_id data MUST NOT be accessible to instance I_id'
2. **Confidentiality**: I_S never leaves TEE unless buyer accepts
3. **Integrity**: Agent prompts (π_B, π_S) cannot be modified mid-session
4. **Deletion**: I_S MUST be deleted on rejection

### 7.2 Resource Limits

**Rate Limiting**:
- Max instances per buyer per day
- Max instances per seller per day
- Global instance creation rate limit

**Resource Limits**:
- Max I_S size: 100 MB
- Max session duration: 60 minutes
- Max agent messages per session: 1000
- Max LLM tokens per session: 100k

### 7.3 Future Security Features (Not in V0)

The following security features will be developed in future versions:
- **TEE Attestation**: Cryptographic proofs of TEE state and program integrity
- **On-chain verification**: Smart contract verification of attestation quotes
- **Credential verification**: W3C Verifiable Credentials, selective disclosure, PKI
- **Payment security**: Escrow contracts, atomic swaps, reentrancy guards

---

## 8. Out of Scope (V0)

The following are explicitly NOT in scope for this version:

1. **On-chain settlement**: Smart contracts, escrow, atomic swaps
2. **TEE attestation**: Cryptographic proofs of TEE state
3. **Identity management**: Verifiable credentials, selective disclosure, PKI
4. **Multi-party**: Only 1 buyer, 1 seller per instance (no auctions, syndication)
5. **Reputation**: No persistent seller identity or rating system
6. **Dispute resolution**: No mechanism for "information was false" claims
7. **Prediction market integration**: No direct API integration with Polymarket, Manifold, etc.
8. **Partial disclosure**: All-or-nothing information release (no tiered access)
9. **Mobile apps**: Web only for V0

These features are deferred to future versions.

---

**End of Specification**

This document provides the architectural foundation and requirements for TBVH V0. The focus is on the core negotiation mechanism: AI agents interacting inside a TEE (Docker container on Phala Cloud). Implementation details are left to the engineering team's discretion within these constraints.
