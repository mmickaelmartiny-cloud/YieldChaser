import { mainnet } from "viem/chains";
import type { Protocol, ProtocolAdapter, Stablecoin, YieldRate } from "@/types";

// Euler v2 EVault ABI — each vault is a self-contained ERC-4626 lending market.
// interestRate() returns the borrow rate per second in 1e27 (RAY) precision.
// interestFee() returns the protocol fee fraction with CONFIG_SCALE = 10_000 (100%).
const EVAULT_ABI = [
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalBorrows",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "interestRate",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }], // borrow rate per second, 1e27 precision
  },
  {
    name: "interestFee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }], // fee in basis points, max 10_000 = 100%
  },
  {
    name: "asset",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const RAY = BigInt("1000000000000000000000000000"); // 1e27
const INTEREST_FEE_SCALE = 10_000; // CONFIG_SCALE in EVK
const SECONDS_PER_YEAR = 365 * 24 * 3600;

function rayRateToApy(ratePerSecond: bigint): number {
  const r = Number(ratePerSecond) / Number(RAY);
  return (Math.pow(1 + r, SECONDS_PER_YEAR) - 1) * 100;
}

// Euler v2 EVault addresses — enumerated via EVaultFactory.getProxyListSlice()
// Factory on mainnet: 0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e (GenericFactory ABI)
// Only vaults with >$100k TVL are listed; sorted by TVL descending.
const VAULTS: Partial<Record<number, { asset: Stablecoin; address: `0x${string}`; decimals: number; label: string }[]>> = {
  [mainnet.id]: [
    { asset: "USDC", label: "eUSDC-80", address: "0xAB2726DAf820Aa9270D14Db9B18c8d187cbF2f30", decimals: 6 }, // $170M
    { asset: "USDC", label: "eUSDC-70", address: "0x9bD52F2805c6aF014132874124686e7b248c2Cbb", decimals: 6 }, // $108M
    { asset: "USDC", label: "eUSDC-64", address: "0x01864aE3c7d5f507cC4c24cA67B4CABbDdA37EcD", decimals: 6 }, // $14M
    { asset: "USDC", label: "eUSDC-47", address: "0x481D4909D7ca2eb27c4975f08dCE07DBeF0d3Fa7", decimals: 6 }, // $3.2M
    { asset: "USDC", label: "eUSDC-22", address: "0xe0a80d35bB6618CBA260120b279d357978c42BCE", decimals: 6 }, // $2.7M
    { asset: "USDC", label: "eUSDC-2",  address: "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9", decimals: 6 }, // $2.3M
    { asset: "USDC", label: "eUSDC-95", address: "0x7fAb04FF2717d9A6B71A51c56c29697179597D40", decimals: 6 }, // $1.4M
    { asset: "USDC", label: "eUSDC-58", address: "0xC42d337861878baa4dC820D9E6B6C667C2b57e8A", decimals: 6 }, // $1.3M
    { asset: "USDC", label: "eUSDC-98", address: "0x63bA834bFf27Dd1d80533a56cA27Aa058AAA1130", decimals: 6 }, // $1.1M
    { asset: "USDT", label: "eUSDT-2",  address: "0x313603FA690301b0CaeEf8069c065862f9162162", decimals: 6 }, // $986k
    { asset: "USDT", label: "eUSDT-9",  address: "0x7c280DBDEf569e96c7919251bD2B0edF0734C5A8", decimals: 6 }, // $410k
  ],
};

export const eulerAdapter: ProtocolAdapter = {
  protocol: "euler" as Protocol,
  supportedChains: [mainnet.id],
  supportedAssets: ["USDC", "USDT"],

  async fetchRates(chainId: number, assets: Stablecoin[]): Promise<YieldRate[]> {
    const { getClient } = await import("@/lib/rpc/clients");
    const vaults = VAULTS[chainId];
    if (!vaults) return [];

    const client = getClient(chainId);
    const results: YieldRate[] = [];

    for (const vault of vaults) {
      if (!assets.includes(vault.asset)) continue;

      try {
        const [totalAssets, totalBorrows, interestRate, interestFee] = await Promise.all([
          client.readContract({ address: vault.address, abi: EVAULT_ABI, functionName: "totalAssets" }),
          client.readContract({ address: vault.address, abi: EVAULT_ABI, functionName: "totalBorrows" }),
          client.readContract({ address: vault.address, abi: EVAULT_ABI, functionName: "interestRate" }),
          client.readContract({ address: vault.address, abi: EVAULT_ABI, functionName: "interestFee" }),
        ]);

        if (totalAssets === 0n) continue;

        const utilizationRate = Number(totalBorrows) / Number(totalAssets);
        const feeScalar = 1 - interestFee / INTEREST_FEE_SCALE;

        // supplyRate = borrowRate × utilization × (1 − fee)
        const supplyRatePerSecond = BigInt(Math.floor(
          (Number(interestRate) / Number(RAY)) * utilizationRate * feeScalar * Number(RAY)
        ));

        const supplyApy = rayRateToApy(supplyRatePerSecond);
        const borrowApy = rayRateToApy(interestRate);

        const scale = Math.pow(10, vault.decimals);
        const totalSupplyUsd = Number(totalAssets) / scale;
        const totalBorrowUsd = Number(totalBorrows) / scale;

        results.push({
          protocol: "euler",
          chainId,
          asset: vault.asset,
          label: vault.label,
          supplyApy,
          borrowApy,
          totalSupplyUsd,
          totalBorrowUsd,
          utilizationRate,
          updatedAt: new Date(),
        });
      } catch {
        // Skip vaults that fail
      }
    }

    return results;
  },
};
