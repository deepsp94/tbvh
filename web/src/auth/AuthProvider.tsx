import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useAccount, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import type { NonceResponse, VerifyResponse } from "@shared/types";

interface AuthContextValue {
  jwt: string | null;
  address: string | null;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  jwt: null,
  address: null,
  isAuthenticated: false,
  signIn: async () => {},
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const STORAGE_KEY = "tbvh_jwt";

function getStoredJwt(): string | null {
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return token;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function getAddressFromJwt(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [jwt, setJwt] = useState<string | null>(getStoredJwt);
  const { address: walletAddress, isDisconnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const address = getAddressFromJwt(jwt);
  const isAuthenticated = jwt !== null;

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setJwt(null);
  }, []);

  // Clear auth on wallet disconnect
  useEffect(() => {
    if (isDisconnected && jwt) {
      signOut();
    }
  }, [isDisconnected, jwt, signOut]);

  const signIn = useCallback(async () => {
    if (!walletAddress) return;

    // 1. Get nonce
    const nonceRes = await fetch(
      `/api/auth/nonce?address=${walletAddress}`
    );
    const { nonce } = (await nonceRes.json()) as NonceResponse;

    // 2. Create SIWE message
    const siweMessage = new SiweMessage({
      domain: window.location.host,
      address: walletAddress,
      statement: "Sign in to TBVH",
      uri: window.location.origin,
      version: "1",
      chainId: 84532,
      nonce,
    });
    const message = siweMessage.prepareMessage();

    // 3. Sign with wallet
    const signature = await signMessageAsync({ message });

    // 4. Verify on backend
    const verifyRes = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });

    if (!verifyRes.ok) {
      throw new Error("Verification failed");
    }

    const { token } = (await verifyRes.json()) as VerifyResponse;

    // 5. Store JWT
    localStorage.setItem(STORAGE_KEY, token);
    setJwt(token);
  }, [walletAddress, signMessageAsync]);

  return (
    <AuthContext.Provider
      value={{ jwt, address, isAuthenticated, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
