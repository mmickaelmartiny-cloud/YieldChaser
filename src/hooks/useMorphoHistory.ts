"use client";

import { useQuery } from "@tanstack/react-query";
import type { VaultHistory } from "@/app/api/morpho-history/route";

export type { VaultHistory };

export function useMorphoHistory(period: "24h" | "7d" | "30d", asset: string) {
  return useQuery<VaultHistory[]>({
    queryKey: ["morpho-history", period, asset],
    queryFn: async () => {
      const res = await fetch(`/api/morpho-history?period=${period}&assets=${asset}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: period !== "24h",
  });
}
