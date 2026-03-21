import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { EIP712Domain } from "@shared/types.js";
import { API_BASE } from "../lib/apiBase";

interface ConfigContextValue {
  chainId: number;
  signerAddress: string;
  teeEnabled: boolean;
  contractAddress: string;
  tokenAddress: string;
  domain: EIP712Domain;
  isLoading: boolean;
}

const defaults: ConfigContextValue = {
  chainId: 84532,
  signerAddress: "",
  teeEnabled: false,
  contractAddress: "0x0000000000000000000000000000000000000000",
  tokenAddress: "0x0000000000000000000000000000000000000000",
  domain: { name: "TBVH", version: "1", chainId: 84532, verifyingContract: "0x0000000000000000000000000000000000000000" },
  isLoading: true,
};

const ConfigContext = createContext<ConfigContextValue>(defaults);

export function useConfig() {
  return useContext(ConfigContext);
}

export function ConfigProvider({
  onReady,
  children,
}: {
  onReady: (config: ConfigContextValue) => void;
  children: ReactNode;
}) {
  const [config, setConfig] = useState<ConfigContextValue>(defaults);

  useEffect(() => {
    fetch(`${API_BASE}/tee/info`)
      .then((r) => r.json())
      .then((info) => {
        const c: ConfigContextValue = {
          chainId: info.chainId,
          signerAddress: info.signerAddress,
          teeEnabled: info.enabled,
          contractAddress: info.contractAddress,
          tokenAddress: info.tokenAddress ?? defaults.tokenAddress,
          domain: info.domain,
          isLoading: false,
        };
        setConfig(c);
        onReady(c);
      })
      .catch(() => {
        const c = { ...defaults, isLoading: false };
        setConfig(c);
        onReady(c);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
}
