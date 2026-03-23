export const config = {
  port: Number(process.env.PORT) || 3000,
  dbPath: process.env.DB_PATH || "./tbvh.db",
  jwtSecret: getJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  siweDomain: process.env.SIWE_DOMAIN || "localhost:5173",
  defaultModel: process.env.DEFAULT_MODEL || "deepseek/deepseek-chat-v3-0324",
  maxTurns: Number(process.env.MAX_TURNS) || 10,
  phalaApiKey: process.env.PHALA_API_KEY ?? "",
  redpillBaseUrl: process.env.REDPILL_BASE_URL ?? "https://api.red-pill.ai/v1",
  maxNegotiationsPerDay: Number(process.env.MAX_NEGOTIATIONS_PER_DAY) || 10,
  teeMode: process.env.TEE_MODE || "dev",
  teeDevSeed: process.env.TEE_DEV_SEED || "tbvh-dev-seed-do-not-use-in-production",
  chainId: Number(process.env.CHAIN_ID) || 84532,
  escrowContract: process.env.ESCROW_CONTRACT || "0x0000000000000000000000000000000000000000",
  usdcContract: process.env.USDC_CONTRACT || "0x0000000000000000000000000000000000000000",
  rpcUrl: process.env.RPC_URL || `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY ?? ""}`,
  appId: process.env.APP_ID || "",
};

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  // Dev-only fallback (64 hex chars = 32 bytes)
  return "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
}
