export const schema = `
-- Nonces for SIWE (short-lived, cleaned up periodically)
CREATE TABLE IF NOT EXISTS nonces (
  nonce TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_nonces_expires ON nonces(expires_at);

-- Instances table
CREATE TABLE IF NOT EXISTS instances (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'created',

  -- Buyer (set on creation)
  buyer_address TEXT NOT NULL,
  buyer_requirement TEXT NOT NULL,
  buyer_prompt TEXT,
  max_payment REAL NOT NULL,

  -- Seller (set on commit)
  seller_address TEXT,
  seller_info TEXT,
  seller_proof TEXT,
  seller_prompt TEXT,

  -- Negotiation config
  model TEXT NOT NULL DEFAULT 'deepseek/deepseek-chat-v3-0324',
  max_turns INTEGER NOT NULL DEFAULT 10,

  -- Outcome
  outcome TEXT,
  final_price REAL,
  outcome_reasoning TEXT,

  -- Timestamps
  created_at TEXT NOT NULL,
  committed_at TEXT,
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_instances_buyer ON instances(buyer_address);
CREATE INDEX IF NOT EXISTS idx_instances_seller ON instances(seller_address);
CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);

-- Messages table (internal to TEE, never exposed to humans)
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id TEXT NOT NULL REFERENCES instances(id),
  turn INTEGER NOT NULL,
  agent TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_instance ON messages(instance_id);
`;
