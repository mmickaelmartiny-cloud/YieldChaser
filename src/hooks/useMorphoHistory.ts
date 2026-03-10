"use client";

import { useQuery } from "@tanstack/react-query";
import type { VaultHistory } from "@/app/api/morpho-history/route";
import type { YieldRate } from "@/types";

export type { VaultHistory };

export function useMorphoHistory(
  period: "24h" | "7d" | "30d",
  asset: string,
  selectedVault?: YieldRate | null
) {
  const address = selectedVault?.protocol === "metamorpho" ? selectedVault.address : undefined;
  const chainId = selectedVault?.protocol === "metamorpho" ? selectedVault.chainId : undefined;

  return useQuery<VaultHistory[]>({
    queryKey: ["morpho-history", period, asset, address ?? "all", chainId],
    queryFn: async () => {
      const params = new URLSearchParams({ period, assets: asset });
      if (address) params.set("address", address);
      if (chainId !== undefined) params.set("chainId", String(chainId));
      const res = await fetch(`/api/morpho-history?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: period !== "24h",
  });
}
