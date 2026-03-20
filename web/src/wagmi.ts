import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";
import { http } from "wagmi";

export function createWagmiConfig(chainId: number) {
  // Extensible later — for now only baseSepolia
  const chain = chainId === 84532 ? baseSepolia : baseSepolia;
  return getDefaultConfig({
    appName: "TBVH",
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
    chains: [chain],
    transports: {
      [chain.id]: http(),
    },
  });
}

export const wagmiConfig = createWagmiConfig(84532);
