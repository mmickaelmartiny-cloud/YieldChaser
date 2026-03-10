export type Stablecoin = "USDC" | "USDT" | "DAI" | "USDS";

export type Protocol = "aave" | "morpho" | "euler" | "compound" | "metamorpho";

export interface YieldRate {
  protocol: Protocol;
  chainId: number;
  asset: Stablecoin;
  label: string;          // vault/market name (e.g. "eUSDC-80", "USDC/wstETH 86%")
  curator?: string;       // MetaMorpho vault / risk curator (Morpho only)
  exposure?: { symbol: string; pct: number }[]; // top collaterals sorted by allocation %
  supplyApy: number;      // annual percentage yield (e.g. 0.05 = 5%)
  borrowApy: number;
  totalSupplyUsd: number;
  totalBorrowUsd: number;
  utilizationRate: number;
  updatedAt: Date;
}

export interface ProtocolAdapter {
  protocol: Protocol;
  supportedChains: number[];
  supportedAssets: Stablecoin[];
  fetchRates(chainId: number, assets: Stablecoin[]): Promise<YieldRate[]>;
}
