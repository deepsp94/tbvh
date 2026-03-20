import { type ReactNode, useState, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { createWagmiConfig, wagmiConfig } from "./wagmi";
import { ConfigProvider } from "./config/ConfigProvider";
import { AuthProvider } from "./auth/AuthProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [chainId, setChainId] = useState<number | null>(null);

  const wConfig = useMemo(
    () => (chainId != null ? createWagmiConfig(chainId) : wagmiConfig),
    [chainId]
  );

  return (
    <ConfigProvider onReady={(c) => setChainId(c.chainId)}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wConfig}>
          <RainbowKitProvider>
            <AuthProvider>{children}</AuthProvider>
          </RainbowKitProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
