import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { keccak256, toHex, parseUnits } from "viem";
import { MOCK_USDC_ABI, TBVH_ESCROW_ABI } from "../config/contracts";

function instanceIdToBytes32(uuid: string): `0x${string}` {
  return keccak256(toHex(uuid));
}

export function useEscrow(
  instanceId: string,
  escrowAddress: `0x${string}`,
  tokenAddress: `0x${string}`
) {
  const { address } = useAccount();
  const bytes32Id = instanceIdToBytes32(instanceId);

  // Read deposit state
  const { data: depositData, refetch: refetchDeposit } = useReadContract({
    address: escrowAddress,
    abi: TBVH_ESCROW_ABI,
    functionName: "deposits",
    args: [bytes32Id],
  });

  const deposit = depositData
    ? {
        buyer: depositData[0] as string,
        amount: depositData[1] as bigint,
        depositedAt: depositData[2] as bigint,
        settled: depositData[3] as boolean,
      }
    : null;

  const hasDeposit = deposit && deposit.buyer !== "0x0000000000000000000000000000000000000000";

  // Read USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: MOCK_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, escrowAddress] : undefined,
    query: { enabled: !!address },
  });

  // Write operations
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  function approve(amount: number) {
    const wei = parseUnits(String(amount), 6);
    writeContract({
      address: tokenAddress,
      abi: MOCK_USDC_ABI,
      functionName: "approve",
      args: [escrowAddress, wei],
    });
  }

  function depositFunds(amount: number) {
    const wei = parseUnits(String(amount), 6);
    writeContract({
      address: escrowAddress,
      abi: TBVH_ESCROW_ABI,
      functionName: "deposit",
      args: [bytes32Id, wei],
    });
  }

  function release(
    seller: `0x${string}`,
    outcome: string,
    finalPrice: bigint,
    timestamp: bigint,
    signature: `0x${string}`
  ) {
    writeContract({
      address: escrowAddress,
      abi: TBVH_ESCROW_ABI,
      functionName: "release",
      args: [bytes32Id, seller, outcome, finalPrice, timestamp, signature],
    });
  }

  function refundWithSig(
    seller: `0x${string}`,
    outcome: string,
    finalPrice: bigint,
    timestamp: bigint,
    signature: `0x${string}`
  ) {
    writeContract({
      address: escrowAddress,
      abi: TBVH_ESCROW_ABI,
      functionName: "refundWithSignature",
      args: [bytes32Id, seller, outcome, finalPrice, timestamp, signature],
    });
  }

  function refund() {
    writeContract({
      address: escrowAddress,
      abi: TBVH_ESCROW_ABI,
      functionName: "refund",
      args: [bytes32Id],
    });
  }

  function mint() {
    if (!address) return;
    writeContract({
      address: tokenAddress,
      abi: MOCK_USDC_ABI,
      functionName: "mint",
      args: [address, parseUnits("1000", 6)],
    });
  }

  function refetchAll() {
    refetchDeposit();
    refetchBalance();
    refetchAllowance();
  }

  return {
    deposit: hasDeposit ? deposit : null,
    usdcBalance: usdcBalance as bigint | undefined,
    allowance: allowance as bigint | undefined,
    approve,
    depositFunds,
    release,
    refundWithSig,
    refund,
    mint,
    refetchAll,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
    bytes32Id,
  };
}
