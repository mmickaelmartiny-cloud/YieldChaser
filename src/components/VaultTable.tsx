"use client";

import { CHAIN_CONFIG } from "@/lib/chains";
import type { YieldRate } from "@/types";

interface Props {
  data: YieldRate[] | undefined;
  isLoading?: boolean;
}

function fmt(usd: number) {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

function Th({ children, align }: { children: React.ReactNode; align: "left" | "right" }) {
  return (
    <th
      className={`px-4 py-2 font-medium uppercase tracking-widest text-${align} text-xs`}
      style={{ color: "var(--muted-foreground)" }}
    >
      {children}
    </th>
  );
}

export function VaultTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="text-xs uppercase tracking-widest py-8" style={{ color: "var(--muted-foreground)" }}>
        ⟳ fetching vaults...
      </div>
    );
  }

  const vaults = (data ?? [])
    .filter((r) => r.protocol === "metamorpho")
    .sort((a, b) => b.supplyApy - a.supplyApy);

  if (!vaults.length) {
    return (
      <div className="text-xs uppercase tracking-widest py-4" style={{ color: "var(--muted-foreground)" }}>
        — no vaults available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
            <Th align="left">Vault</Th>
            <Th align="left">Chain</Th>
            <Th align="left">Asset</Th>
            <Th align="left">Curator</Th>
            <Th align="right">Net APY</Th>
            <Th align="right">Deposits</Th>
          </tr>
        </thead>
        <tbody>
          {vaults.map((v, i) => {
            const chain = CHAIN_CONFIG[v.chainId];
            return (
              <tr
                key={i}
                className="yield-row"
                style={{ borderBottom: i < vaults.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <td className="px-4 py-2 font-medium" style={{ color: "var(--foreground)" }}>
                  {v.label}
                </td>
                <td className="px-4 py-2" style={{ color: chain?.color ?? "var(--muted-foreground)" }}>
                  {chain?.shortName ?? v.chainId}
                </td>
                <td className="px-4 py-2 font-medium" style={{ color: "var(--foreground)" }}>
                  {v.asset}
                </td>
                <td className="px-4 py-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {v.curator ?? "—"}
                </td>
                <td className="px-4 py-2 text-right font-medium apy-glow">
                  {v.supplyApy.toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-right tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                  {fmt(v.totalSupplyUsd)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
