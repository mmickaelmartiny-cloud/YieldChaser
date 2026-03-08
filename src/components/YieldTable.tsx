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

const PROTOCOL_COLORS: Record<string, string> = {
  aave: "#C46AAE",
  morpho: "#4D8AFF",
  euler: "#E8743A",
  compound: "#00D395",
  metamorpho: "#4D8AFF",
};

const PROTOCOL_LABELS: Record<string, string> = {
  aave: "aave",
  morpho: "morpho",
  euler: "euler",
  compound: "compound",
  metamorpho: "morpho",
};

function ColToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`col-toggle ${active ? "active" : ""}`} style={{ borderRadius: "var(--radius)" }}>
      {active ? "◆" : "◇"} {label}
    </button>
  );
}

function fmt(usd: number) {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
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

  if (isLoading) {
    return (
      <div className="text-xs uppercase tracking-widest py-8" style={{ color: "var(--muted-foreground)" }}>
        ⟳ fetching rates...
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-xs uppercase tracking-widest py-4" style={{ color: "var(--destructive)" }}>
        ✕ failed to load rates
      </div>
    );
  }
  if (!data?.length) {
    return (
      <div className="text-xs uppercase tracking-widest py-4" style={{ color: "var(--muted-foreground)" }}>
        — no rates available
      </div>
    );
  }

  const sorted = [...data]
    .filter((r) => isFinite(r.supplyApy) && isFinite(r.borrowApy))
    .sort((a, b) => b.supplyApy - a.supplyApy);

  return (
    <div className="space-y-3">
      {/* Column toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-widest w-16 shrink-0" style={{ color: "var(--muted-foreground)" }}>
          Columns
        </span>
        <ColToggle label="Vault"       active={cols.vault}        onClick={() => toggle("vault")} />
        <ColToggle label="Curator"     active={cols.curator}      onClick={() => toggle("curator")} />
        <ColToggle label="Deposits"    active={cols.deposits}     onClick={() => toggle("deposits")} />
        <ColToggle label="Liquidity"   active={cols.liquidity}    onClick={() => toggle("liquidity")} />
        <ColToggle label="Borrow APY"  active={cols.borrowApy}    onClick={() => toggle("borrowApy")} />
        <ColToggle label="Utilization" active={cols.utilization}  onClick={() => toggle("utilization")} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
              <Th align="left">Protocol</Th>
              <Th align="left">Chain</Th>
              <Th align="left">Asset</Th>
              {cols.vault      && <Th align="left">Vault</Th>}
              {cols.curator    && <Th align="left">Curator</Th>}
              <Th align="right">Supply APY</Th>
              {cols.borrowApy  && <Th align="right">Borrow APY</Th>}
              {cols.deposits   && <Th align="right">Deposits</Th>}
              {cols.liquidity  && <Th align="right">Liquidity</Th>}
              {cols.utilization && <Th align="right">Utilization</Th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((rate, i) => {
              const chain = CHAIN_CONFIG[rate.chainId];
              const liquidityUsd = rate.totalSupplyUsd - rate.totalBorrowUsd;
              const protocolColor = PROTOCOL_COLORS[rate.protocol] ?? "var(--foreground)";
              return (
                <tr
                  key={i}
                  className="yield-row"
                  style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <td className="px-4 py-2 font-medium uppercase tracking-wider" style={{ color: protocolColor }}>
                    {PROTOCOL_LABELS[rate.protocol] ?? rate.protocol}
                  </td>

                  <td className="px-4 py-2" style={{ color: chain?.color ?? "var(--muted-foreground)" }}>
                    {chain?.shortName ?? rate.chainId}
                  </td>

                  <td className="px-4 py-2 font-medium" style={{ color: "var(--foreground)" }}>
                    {rate.asset}
                  </td>

                  {cols.vault && (
                    <td className="px-4 py-2 max-w-[160px] truncate text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {rate.label}
                    </td>
                  )}

                  {cols.curator && (
                    <td className="px-4 py-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {rate.curator ?? "—"}
                    </td>
                  )}

                  <td className="px-4 py-2 text-right font-medium apy-glow">
                    {rate.supplyApy.toFixed(2)}%
                  </td>

                  {cols.borrowApy && (
                    <td className="px-4 py-2 text-right" style={{ color: "var(--borrow-color)" }}>
                      {rate.protocol === "metamorpho" ? "—" : `${rate.borrowApy.toFixed(2)}%`}
                    </td>
                  )}

                  {cols.deposits && (
                    <td className="px-4 py-2 text-right tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                      {fmt(rate.totalSupplyUsd)}
                    </td>
                  )}

                  {cols.liquidity && (
                    <td className="px-4 py-2 text-right tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                      {fmt(liquidityUsd)}
                    </td>
                  )}

                  {cols.utilization && (
                    <td className="px-4 py-2 text-right tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                      {rate.protocol === "metamorpho" ? "—" : `${(rate.utilizationRate * 100).toFixed(1)}%`}
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
