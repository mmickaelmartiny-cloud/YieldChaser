import { defineChain } from "viem";
import {
  mainnet,
  base,
  arbitrum,
  optimism,
} from "viem/chains";

export const plasma = defineChain({
  id: 0, // TODO: replace with actual Plasma chain ID
  name: "Plasma",
  nativeCurrency: { name: "USDT", symbol: "USDT", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.plasma.to"] }, // TODO: replace with actual RPC URL
  },
  blockExplorers: {
    default: { name: "Plasma Explorer", url: "https://explorer.plasma.to" }, // TODO: replace with actual explorer URL
  },
});

export const SUPPORTED_CHAINS = [mainnet, base, arbitrum, optimism, plasma] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export const CHAIN_CONFIG: Record<number, { name: string; shortName: string; color: string }> = {
  [mainnet.id]: { name: "Ethereum", shortName: "ETH", color: "#627EEA" },
  [base.id]: { name: "Base", shortName: "Base", color: "#0052FF" },
  [arbitrum.id]: { name: "Arbitrum", shortName: "ARB", color: "#12AAFF" },
  [optimism.id]: { name: "Optimism", shortName: "OP", color: "#FF0420" },
  [plasma.id]: { name: "Plasma", shortName: "PLS", color: "#26A17B" },
};
