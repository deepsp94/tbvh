import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";
import { http } from "wagmi";

export const wagmiConfig = getDefaultConfig({
  appName: "TBVH",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
});
