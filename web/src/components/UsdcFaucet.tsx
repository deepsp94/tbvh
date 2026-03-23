import { useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useConfig } from "../config/ConfigProvider";
import { MOCK_USDC_ABI } from "../config/contracts";

export function UsdcFaucet() {
  const { address, isConnected } = useAccount();
  const { tokenAddress } = useConfig();
  const zeroAddr = "0x0000000000000000000000000000000000000000";

  const { data: balance, refetch } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && tokenAddress !== zeroAddr },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Refetch balance after mint with delay for chain propagation
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => refetch(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isConnected || !address || tokenAddress === zeroAddr) return null;

  const formatted = balance != null ? formatUnits(balance as bigint, 6) : "—";

  function handleMint() {
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: MOCK_USDC_ABI,
      functionName: "mint",
      args: [address!, parseUnits("1000", 6)],
    });
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-zinc-400 font-mono">{formatted} USDC</span>
      <button
        onClick={handleMint}
        disabled={isPending || isConfirming}
        className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
      >
        {isPending || isConfirming ? "…" : "Mint"}
      </button>
    </div>
  );
}
