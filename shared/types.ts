export interface NonceResponse {
  nonce: string;
  expiresAt: string;
}

export interface VerifyResponse {
  token: string;
  address: string;
  expiresAt: string;
}

export interface JWTPayload {
  sub: string;
  iat: number;
  exp: number;
}
