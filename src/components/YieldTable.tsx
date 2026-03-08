"use client";

import { useYieldRates } from "@/hooks/useYieldRates";
import { CHAIN_CONFIG } from "@/lib/chains";
import type { Protocol, Stablecoin } from "@/types";

interface Props {
  protocols?: Protocol[];
  chainIds?: number[];
  assets?: Stablecoin[];
}

export function YieldTable({ protocols, chainIds, assets }: Props) {
  const { data, isLoading, error } = useYieldRates({ protocols, chainIds, assets });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading rates...</div>;
  if (error) return <div className="text-sm text-destructive">Failed to load rates.</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground">No rates available.</div>;

  const sorted = [...data]
    .filter((r) => isFinite(r.supplyApy) && isFinite(r.borrowApy))
    .sort((a, b) => b.supplyApy - a.supplyApy);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Protocol</th>
            <th className="px-4 py-3 text-left font-medium">Chain</th>
            <th className="px-4 py-3 text-left font-medium">Asset</th>
            <th className="px-4 py-3 text-right font-medium">Supply APY</th>
            <th className="px-4 py-3 text-right font-medium">Borrow APY</th>
            <th className="px-4 py-3 text-right font-medium">Total Supply</th>
            <th className="px-4 py-3 text-right font-medium">Utilization</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((rate, i) => {
            const chain = CHAIN_CONFIG[rate.chainId];
            return (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium capitalize">{rate.protocol}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: chain?.color ?? "#888" }}
                  >
                    {chain?.shortName ?? rate.chainId}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{rate.asset}</td>
                <td className="px-4 py-3 text-right font-medium text-green-600">
                  {rate.supplyApy.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right text-orange-500">
                  {rate.borrowApy.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  ${(rate.totalSupplyUsd / 1e6).toFixed(1)}M
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {(rate.utilizationRate * 100).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
