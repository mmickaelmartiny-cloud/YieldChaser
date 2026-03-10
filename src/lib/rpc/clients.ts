import { createPublicClient, http } from "viem";
import { mainnet, base, arbitrum, optimism } from "viem/chains";
import { plasma, hyperEvm } from "@/lib/chains";

// Public RPC endpoints — replace with private RPC URLs via env vars for production
export const rpcClients = {
  [mainnet.id]: createPublicClient({ chain: mainnet, transport: http(process.env.RPC_MAINNET ?? "https://ethereum.publicnode.com") }),
  [base.id]: createPublicClient({ chain: base, transport: http(process.env.RPC_BASE ?? "https://base.publicnode.com") }),
  [arbitrum.id]: createPublicClient({ chain: arbitrum, transport: http(process.env.RPC_ARBITRUM ?? "https://arbitrum-one.publicnode.com") }),
  [optimism.id]: createPublicClient({ chain: optimism, transport: http(process.env.RPC_OPTIMISM ?? "https://optimism.publicnode.com") }),
  [hyperEvm.id]: createPublicClient({ chain: hyperEvm, transport: http(process.env.RPC_HYPEREVM ?? "https://rpc.hyperliquid.xyz/evm", { timeout: 10_000 }) }),
  [plasma.id]: createPublicClient({ chain: plasma, transport: http() }),
} as const;

export function getClient(chainId: number) {
  const client = rpcClients[chainId as keyof typeof rpcClients];
  if (!client) throw new Error(`No RPC client for chain ${chainId}`);
  return client;
}
