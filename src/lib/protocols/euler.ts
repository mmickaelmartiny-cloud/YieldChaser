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

// Euler v2 EVault addresses per chain.
// Vault addresses can be verified at https://app.euler.finance or via the EVaultFactory logs.
// EVaultFactory on mainnet: 0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e
const VAULTS: Partial<Record<number, { asset: Stablecoin; address: `0x${string}`; decimals: number; label: string }[]>> = {
  [mainnet.id]: [
    // Top vaults by TVL — verified via EVaultFactory (0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e) enumeration
    { asset: "USDC", label: "eUSDC-80", address: "0xAB2726DAf820Aa9270D14Db9B18c8d187cbF2f30", decimals: 6 }, // ~$170M TVL
    { asset: "USDC", label: "eUSDC-70", address: "0x9bD52F2805c6aF014132874124686e7b248c2Cbb", decimals: 6 }, // ~$107M TVL
    { asset: "USDC", label: "eUSDC-64", address: "0x01864aE3c7d5f507cC4c24cA67B4CABbDdA37EcD", decimals: 6 }, // ~$14M TVL
    { asset: "USDT", label: "eUSDT-2",  address: "0x313603FA690301b0CaeEf8069c065862f9162162", decimals: 6 }, // ~$986k TVL
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

    // Track best supply APY per asset across vaults
    const byAsset = new Map<Stablecoin, { label: string; supplyApy: number; borrowApy: number; totalSupplyUsd: number; totalBorrowUsd: number; utilizationRate: number }>();

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

        const existing = byAsset.get(vault.asset);
        if (!existing || supplyApy > existing.supplyApy) {
          byAsset.set(vault.asset, { label: vault.label, supplyApy, borrowApy, totalSupplyUsd, totalBorrowUsd, utilizationRate });
        }
      } catch {
        // Skip vaults that fail (wrong address — check TODO comments above)
      }
    }

    for (const [asset, data] of byAsset) {
      results.push({ protocol: "euler", chainId, asset, updatedAt: new Date(), ...data, label: data.label });
    }

    return results;
  },
};
