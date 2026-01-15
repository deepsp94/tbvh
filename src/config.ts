export const config = {
  // Auth
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
  jwtExpiresIn: "24h",
  nonceExpiresMs: 5 * 60 * 1000, // 5 minutes
  siweDomain: process.env.SIWE_DOMAIN || "localhost:3000",

  // Database
  dbPath: process.env.DB_PATH || "./tbvh.db",

  // API
  phalaApiKey: process.env.PHALA_API_KEY!,
  phalaApiBase: "https://api.redpill.ai/v1",
  defaultModel: "deepseek/deepseek-chat-v3-0324",

  // Negotiation
  maxTurns: 10,
};
