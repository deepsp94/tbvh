import { SiweMessage } from "siwe";
import { config } from "../config.js";
import { validateNonce } from "./nonce.js";

export interface VerifySiweResult {
  success: boolean;
  address?: string;
  error?: string;
}

export async function verifySiweMessage(
  message: string,
  signature: string
): Promise<VerifySiweResult> {
  try {
    const siweMessage = new SiweMessage(message);

    // Verify the signature
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      return { success: false, error: "Invalid signature" };
    }

    // Verify domain matches
    if (siweMessage.domain !== config.siweDomain) {
      return { success: false, error: `Domain mismatch: expected ${config.siweDomain}` };
    }

    // Verify nonce (and mark as used)
    if (!validateNonce(siweMessage.nonce, siweMessage.address)) {
      return { success: false, error: "Invalid or expired nonce" };
    }

    // Check expiration
    if (siweMessage.expirationTime && new Date(siweMessage.expirationTime) < new Date()) {
      return { success: false, error: "Message expired" };
    }

    // Check not-before time
    if (siweMessage.notBefore && new Date(siweMessage.notBefore) > new Date()) {
      return { success: false, error: "Message not yet valid" };
    }

    return { success: true, address: siweMessage.address.toLowerCase() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
