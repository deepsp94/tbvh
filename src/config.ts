export const config = {
  port: Number(process.env.PORT) || 3000,
  dbPath: process.env.DB_PATH || "./tbvh.db",
  jwtSecret: getJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  siweDomain: process.env.SIWE_DOMAIN || "localhost:5173",
  defaultModel: process.env.DEFAULT_MODEL || "deepseek/deepseek-chat-v3-0324",
  maxTurns: Number(process.env.MAX_TURNS) || 10,
};

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  // Dev-only fallback (64 hex chars = 32 bytes)
  return "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
}
