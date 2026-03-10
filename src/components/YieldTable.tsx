"use client";

import { useState } from "react";
import { CHAIN_CONFIG } from "@/lib/chains";
import type { YieldRate } from "@/types";

interface ColumnState {
  vault: boolean;
  curator: boolean;
  exposure: boolean;
  risk: boolean;
  deposits: boolean;
  liquidity: boolean;
  utilization: boolean;
}

interface Props {
  data: YieldRate[] | undefined;
  isLoading?: boolean;
  error?: Error | null;
  selectedVault?: YieldRate | null;
  onSelect?: (rate: YieldRate | null) => void;
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

type RiskLevel = "low" | "medium" | "high";

const COLLATERAL_RISK: Record<string, RiskLevel> = {
  // Yield-bearing stablecoins → low
  sUSDe: "low", stUSDS: "low", sUSDS: "low", USDS: "low", DAI: "low", USDC: "low", USDT: "low",
  // LSTs / ETH → low
  wstETH: "low", cbETH: "low", rETH: "low", stETH: "low", WETH: "low", superOETHb: "low",
  // HYPE (HyperEVM native) → low
  WHYPE: "low", kHYPE: "low", wstHYPE: "low",
  // BTC → low
  wBTC: "low", cbBTC: "low", WBTC: "low",
  // Gold → low
  xAUT: "low",
  cbXRP: "low",
  // Yield-bearing / structured tokens → medium
  yoUSD: "medium", yoUSd: "medium", THBILL: "medium", thBILL: "medium", syrupUSDC: "medium", syrupUSDT: "medium",
  sUSDAI: "medium", "PT-USDAI": "medium", "PT-sUSDAI": "medium",
};

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
const RISK_LABEL: Record<RiskLevel, string> = { low: "LOW", medium: "MED", high: "HIGH" };
const RISK_COLOR: Record<RiskLevel, string> = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };

const BTC_ETH = new Set(["wBTC", "cbBTC", "WBTC", "wstETH", "cbETH", "rETH", "stETH", "WETH", "cbXRP"]);

type SortCol = "protocol" | "chain" | "asset" | "supplyApy" | "deposits" | "liquidity" | "utilization" | "risk";

function getExposureRisk(exposure: { symbol: string; pct: number }[] | undefined): RiskLevel | null {
  if (!exposure || exposure.length === 0) return null;
  const hasHigh = exposure.some(({ symbol }) => (COLLATERAL_RISK[symbol] ?? "high") === "high");
  if (hasHigh) {
    // If low or medium collaterals cover > 90%, downgrade HIGH to MED
    const safePct = exposure
      .filter(({ symbol }) => RISK_RANK[COLLATERAL_RISK[symbol] ?? "high"] < RISK_RANK["high"])
      .reduce((sum, { pct }) => sum + pct, 0);
    return safePct > 90 ? "medium" : "high";
  }
  return exposure.reduce<RiskLevel>((acc, { symbol }) => {
    const risk = COLLATERAL_RISK[symbol] ?? "high";
    return RISK_RANK[risk] > RISK_RANK[acc] ? risk : acc;
  }, "low");
}

function computeRisk(rate: YieldRate, utilization: number): RiskLevel | null {
  return utilization > 0.9 ? "high" : getExposureRisk(rate.exposure);
}

function getSortValue(rate: YieldRate, col: SortCol): string | number {
  const liq = rate.totalSupplyUsd - rate.totalBorrowUsd;
  const util = rate.totalSupplyUsd > 0 ? rate.totalBorrowUsd / rate.totalSupplyUsd : 0;
  switch (col) {
    case "protocol":     return PROTOCOL_LABELS[rate.protocol] ?? rate.protocol;
    case "chain":        return rate.chainId;
    case "asset":        return rate.asset;
    case "supplyApy":    return rate.supplyApy;
    case "deposits":     return rate.totalSupplyUsd;
    case "liquidity":    return liq;
    case "utilization":  return util;
    case "risk":         return RISK_RANK[computeRisk(rate, util) ?? "low"];
  }
}

function ColToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`col-toggle ${active ? "active" : ""}`} style={{ borderRadius: "var(--radius)" }}>
      {active ? "◆" : "◇"} {label}
    </button>
  );
}

const RISK_TOOLTIP = `🟢 LOW — known collaterals only (stablecoin, BTC, ETH/LST)
🟡 MED — structured/yield-bearing tokens (yoUSd, THBILL, syrupUSDC…)
🔴 HIGH — unknown collateral or utilization > 90%`;

function RiskTooltip() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <span
      className="inline-flex items-center ml-1 cursor-help"
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      <span className="text-[10px] opacity-40">ⓘ</span>
      {pos && (
        <div
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y - 8,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--popover-foreground)",
            fontSize: "11px",
            lineHeight: "1.7",
            padding: "8px 10px",
            whiteSpace: "pre-line",
            width: "280px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            pointerEvents: "none",
          }}
        >
          {RISK_TOOLTIP}
        </div>
      )}
    </span>
  );
}

function fmt(usd: number) {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

export function YieldTable({ data, isLoading, error, selectedVault, onSelect }: Props) {
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "supplyApy", dir: "desc" });

  const handleSort = (col: SortCol) =>
    setSort((prev) => ({ col, dir: prev.col === col && prev.dir === "desc" ? "asc" : "desc" }));

  const [cols, setCols] = useState<ColumnState>({
    vault: false,
    curator: false,
    exposure: true,
    risk: true,
    deposits: true,
    liquidity: false,
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
    .sort((a, b) => {
      const av = getSortValue(a, sort.col);
      const bv = getSortValue(b, sort.col);
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });

  return (
    <div className="space-y-3">
      {/* Column toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-widest w-16 shrink-0" style={{ color: "var(--muted-foreground)" }}>
          Columns
        </span>
        <ColToggle label="Vault"       active={cols.vault}        onClick={() => toggle("vault")} />
        <ColToggle label="Curator"     active={cols.curator}      onClick={() => toggle("curator")} />
        <ColToggle label="Exposure"    active={cols.exposure}     onClick={() => toggle("exposure")} />
        <ColToggle label="Risk"        active={cols.risk}         onClick={() => toggle("risk")} />
        <ColToggle label="Deposits"    active={cols.deposits}     onClick={() => toggle("deposits")} />
        <ColToggle label="Liquidity"   active={cols.liquidity}    onClick={() => toggle("liquidity")} />
        <ColToggle label="Utilization" active={cols.utilization}  onClick={() => toggle("utilization")} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
              <Th align="left"  sortCol="protocol"    sort={sort} onSort={handleSort}>Protocol</Th>
              <Th align="left"  sortCol="chain"       sort={sort} onSort={handleSort}>Chain</Th>
              <Th align="left"  sortCol="asset"       sort={sort} onSort={handleSort}>Asset</Th>
              {cols.vault      && <Th align="left">Vault</Th>}
              {cols.curator    && <Th align="left">Curator</Th>}
              {cols.exposure   && <Th align="left">Exposure</Th>}
              {cols.risk       && <Th align="left"  sortCol="risk"        sort={sort} onSort={handleSort}>Risk<RiskTooltip /></Th>}
              <Th align="right"   sortCol="supplyApy"  sort={sort} onSort={handleSort}>Supply APY</Th>
              {cols.deposits   && <Th align="right" sortCol="deposits"   sort={sort} onSort={handleSort}>Deposits</Th>}
              {cols.liquidity  && <Th align="right" sortCol="liquidity"  sort={sort} onSort={handleSort}>Liquidity</Th>}
              {cols.utilization && <Th align="right" sortCol="utilization" sort={sort} onSort={handleSort}>Utilization</Th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((rate, i) => {
              const chain = CHAIN_CONFIG[rate.chainId];
              const liquidityUsd = rate.totalSupplyUsd - rate.totalBorrowUsd;
              const utilization = rate.totalSupplyUsd > 0 ? (rate.totalSupplyUsd - liquidityUsd) / rate.totalSupplyUsd : 0;
              const risk = computeRisk(rate, utilization);
              const protocolColor = PROTOCOL_COLORS[rate.protocol] ?? "var(--foreground)";
              const isSelectable = rate.protocol === "metamorpho" && !!rate.address;
              const isSelected = isSelectable && selectedVault?.address === rate.address && selectedVault?.chainId === rate.chainId;
              return (
                <tr
                  key={i}
                  className="yield-row"
                  style={{
                    borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: isSelectable ? "pointer" : undefined,
                    background: isSelected ? "rgba(77, 138, 255, 0.08)" : undefined,
                  }}
                  onClick={isSelectable ? () => onSelect?.(isSelected ? null : rate) : undefined}
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

                  {cols.exposure && (
                    <td className="px-4 py-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {rate.exposure && rate.exposure.length > 0
                        ? rate.exposure.map((e) => `${e.symbol} ${e.pct}%`).join(", ")
                        : "—"}
                    </td>
                  )}

                  {cols.risk && (
                    <td className="px-4 py-2 text-xs font-medium tracking-wider">
                      {risk
                        ? <span style={{ color: RISK_COLOR[risk] }}>{RISK_LABEL[risk]}</span>
                        : <span style={{ color: "var(--muted-foreground)" }}>—</span>}
                    </td>
                  )}

                  <td className="px-4 py-2 text-right font-medium apy-glow">
                    {rate.supplyApy.toFixed(2)}%
                  </td>


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
                      {`${(utilization * 100).toFixed(1)}%`}
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

function Th({
  children, align, sortCol, sort, onSort,
}: {
  children: React.ReactNode;
  align: "left" | "right";
  sortCol?: SortCol;
  sort?: { col: SortCol; dir: "asc" | "desc" };
  onSort?: (col: SortCol) => void;
}) {
  const active = sortCol && sort?.col === sortCol;
  return (
    <th
      className={`px-4 py-2 font-medium uppercase tracking-widest text-${align} text-xs ${sortCol ? "cursor-pointer select-none hover:opacity-80" : ""}`}
      style={{ color: active ? "var(--foreground)" : "var(--muted-foreground)" }}
      onClick={sortCol && onSort ? () => onSort(sortCol) : undefined}
    >
      {children}
      {sortCol && (
        <span className="ml-1 opacity-60">{active ? (sort?.dir === "asc" ? "▲" : "▼") : "⇅"}</span>
      )}
    </th>
  );
}
