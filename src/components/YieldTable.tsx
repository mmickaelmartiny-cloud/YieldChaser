"use client";

import { useState } from "react";
import { CHAIN_CONFIG } from "@/lib/chains";
import type { YieldRate } from "@/types";

interface ColumnState {
  vault: boolean;
  curator: boolean;
  deposits: boolean;
  liquidity: boolean;
  borrowApy: boolean;
  utilization: boolean;
}

interface Props {
  data: YieldRate[] | undefined;
  isLoading?: boolean;
  error?: Error | null;
}

function ColToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-foreground text-background border-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function YieldTable({ data, isLoading, error }: Props) {
  const [cols, setCols] = useState<ColumnState>({
    vault: false,
    curator: false,
    deposits: true,
    liquidity: false,
    borrowApy: true,
    utilization: true,
  });

  const toggle = (key: keyof ColumnState) =>
    setCols((prev) => ({ ...prev, [key]: !prev[key] }));

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading rates...</div>;
  if (error) return <div className="text-sm text-destructive">Failed to load rates.</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground">No rates available.</div>;

  const sorted = [...data]
    .filter((r) => isFinite(r.supplyApy) && isFinite(r.borrowApy))
    .sort((a, b) => b.supplyApy - a.supplyApy);

  return (
    <div className="space-y-3">
      {/* Column toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium w-16 shrink-0">Columns</span>
        <ColToggle label="Vault" active={cols.vault} onClick={() => toggle("vault")} />
        <ColToggle label="Curator" active={cols.curator} onClick={() => toggle("curator")} />
        <ColToggle label="Deposits" active={cols.deposits} onClick={() => toggle("deposits")} />
        <ColToggle label="Liquidity" active={cols.liquidity} onClick={() => toggle("liquidity")} />
        <ColToggle label="Borrow APY" active={cols.borrowApy} onClick={() => toggle("borrowApy")} />
        <ColToggle label="Utilization" active={cols.utilization} onClick={() => toggle("utilization")} />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Protocol</th>
              <th className="px-4 py-3 text-left font-medium">Chain</th>
              <th className="px-4 py-3 text-left font-medium">Asset</th>
              {cols.vault && <th className="px-4 py-3 text-left font-medium">Vault</th>}
              {cols.curator && <th className="px-4 py-3 text-left font-medium">Curator</th>}
              <th className="px-4 py-3 text-right font-medium">Supply APY</th>
              {cols.borrowApy && <th className="px-4 py-3 text-right font-medium">Borrow APY</th>}
              {cols.deposits && <th className="px-4 py-3 text-right font-medium">Deposits</th>}
              {cols.liquidity && <th className="px-4 py-3 text-right font-medium">Liquidity</th>}
              {cols.utilization && <th className="px-4 py-3 text-right font-medium">Utilization</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((rate, i) => {
              const chain = CHAIN_CONFIG[rate.chainId];
              const liquidityUsd = rate.totalSupplyUsd - rate.totalBorrowUsd;
              return (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium capitalize">{rate.protocol}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: chain?.color ?? "#888" }}
                    >
                      {chain?.shortName ?? rate.chainId}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{rate.asset}</td>
                  {cols.vault && (
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{rate.label}</td>
                  )}
                  {cols.curator && (
                    <td className="px-4 py-3 text-muted-foreground text-xs">{rate.curator ?? "—"}</td>
                  )}
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    {rate.supplyApy.toFixed(2)}%
                  </td>
                  {cols.borrowApy && (
                    <td className="px-4 py-3 text-right text-orange-500">
                      {rate.borrowApy.toFixed(2)}%
                    </td>
                  )}
                  {cols.deposits && (
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      ${(rate.totalSupplyUsd / 1e6).toFixed(1)}M
                    </td>
                  )}
                  {cols.liquidity && (
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      ${(liquidityUsd / 1e6).toFixed(1)}M
                    </td>
                  )}
                  {cols.utilization && (
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {(rate.utilizationRate * 100).toFixed(1)}%
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
