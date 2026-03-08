"use client";

import { useQuery } from "@tanstack/react-query";
import type { Protocol, Stablecoin, YieldRate } from "@/types";

interface UseYieldRatesOptions {
  protocols?: Protocol[];
  chainIds?: number[];
  assets?: Stablecoin[];
}

async function fetchYieldRates(options: UseYieldRatesOptions): Promise<YieldRate[]> {
  const params = new URLSearchParams();
  if (options.protocols) params.set("protocols", options.protocols.join(","));
  if (options.chainIds) params.set("chains", options.chainIds.join(","));
  if (options.assets) params.set("assets", options.assets.join(","));

  const res = await fetch(`/api/rates?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch yield rates");
  return res.json();
}

export function useYieldRates(options: UseYieldRatesOptions = {}) {
  return useQuery({
    queryKey: ["yieldRates", options],
    queryFn: () => fetchYieldRates(options),
    refetchInterval: 60_000, // refresh every 60 seconds
    staleTime: 30_000,
  });
}
