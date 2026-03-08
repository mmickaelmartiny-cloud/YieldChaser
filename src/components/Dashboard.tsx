"use client";

import { useMemo, useState } from "react";
import { useYieldRates } from "@/hooks/useYieldRates";
import { YieldTable } from "@/components/YieldTable";
import { VaultTable } from "@/components/VaultTable";
import { RateChart } from "@/components/RateChart";
import { FilterBar, defaultFilters } from "@/components/FilterBar";
import type { FilterState } from "@/components/FilterBar";
import { CHAIN_CONFIG } from "@/lib/chains";
import type { Stablecoin } from "@/types";

const CHAIN_IDS = [1, 8453, 42161, 10];
const ASSETS: Stablecoin[] = ["USDC", "USDT", "DAI", "USDS"];

interface VaultFilterState {
  chains: Set<number>;
  assets: Set<Stablecoin>;
  curators: Set<string>;
}

function defaultVaultFilters(): VaultFilterState {
  return {
    chains: new Set(CHAIN_IDS),
    assets: new Set(ASSETS),
    curators: new Set<string>(), // empty = all
  };
}

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    if (next.size === 1) return set;
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function Chip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="filter-chip"
      style={{
        borderRadius: "var(--radius)",
        ...(active && color
          ? { backgroundColor: color, borderColor: color, color: "white" }
          : active
          ? { borderColor: "var(--primary)", color: "var(--amber-bright)" }
          : {}),
      }}
    >
      {active ? "◆ " : "◇ "}
      {label}
    </button>
  );
}

export function Dashboard() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [vaultFilters, setVaultFilters] = useState<VaultFilterState>(defaultVaultFilters);
  const { data, isLoading, error } = useYieldRates();

  // All metamorpho vaults
  const allVaults = useMemo(
    () => data?.filter((r) => r.protocol === "metamorpho") ?? [],
    [data]
  );

  // Curators present in current chain+asset selection
  const availableCurators = useMemo(() => {
    const set = new Set<string>();
    for (const v of allVaults) {
      if (vaultFilters.chains.has(v.chainId) && vaultFilters.assets.has(v.asset) && v.curator) {
        set.add(v.curator);
      }
    }
    return [...set].sort();
  }, [allVaults, vaultFilters.chains, vaultFilters.assets]);

  // Markets: filtered by main FilterBar
  const filteredMarkets = useMemo(() => {
    if (!data) return data;
    return data.filter(
      (r) =>
        r.protocol !== "metamorpho" &&
        filters.protocols.has(r.protocol) &&
        filters.chains.has(r.chainId) &&
        filters.assets.has(r.asset)
    );
  }, [data, filters]);

  // Vaults: filtered by vault-specific filters
  const filteredVaults = useMemo(() => {
    return allVaults.filter(
      (v) =>
        vaultFilters.chains.has(v.chainId) &&
        vaultFilters.assets.has(v.asset) &&
        (vaultFilters.curators.size === 0 || (v.curator != null && vaultFilters.curators.has(v.curator)))
    );
  }, [allVaults, vaultFilters]);

  return (
    <div className="space-y-8">
      {/* Markets section */}
      <section className="space-y-3">
        <span className="text-xs uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          ── BEST RATES · MARKETS
        </span>
        <FilterBar filters={filters} onChange={setFilters} />
        <YieldTable data={filteredMarkets} isLoading={isLoading} error={error} />
      </section>

      {/* MetaMorpho Vaults section */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
            ── MORPHO VAULTS
          </span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            curated baskets · net APY après frais
          </span>
        </div>

        {/* Vault filters */}
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {/* Chain */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest shrink-0 w-16" style={{ color: "var(--muted-foreground)" }}>
              Chain
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CHAIN_IDS.map((id) => {
                const chain = CHAIN_CONFIG[id];
                return (
                  <Chip
                    key={id}
                    label={chain?.shortName ?? String(id)}
                    active={vaultFilters.chains.has(id)}
                    color={chain?.color}
                    onClick={() => setVaultFilters((f) => ({ ...f, chains: toggle(f.chains, id) }))}
                  />
                );
              })}
            </div>
          </div>

          {/* Asset */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest shrink-0 w-16" style={{ color: "var(--muted-foreground)" }}>
              Asset
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ASSETS.map((a) => (
                <Chip
                  key={a}
                  label={a}
                  active={vaultFilters.assets.has(a)}
                  onClick={() => setVaultFilters((f) => ({ ...f, assets: toggle(f.assets, a) }))}
                />
              ))}
            </div>
          </div>

          {/* Curator */}
          {availableCurators.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest shrink-0 w-16" style={{ color: "var(--muted-foreground)" }}>
                Curator
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableCurators.map((c) => {
                  const active = vaultFilters.curators.has(c);
                  return (
                    <button
                      key={c}
                      className="filter-chip"
                      style={{
                        borderRadius: "var(--radius)",
                        ...(active
                          ? { borderColor: "var(--primary)", color: "var(--amber-bright)" }
                          : {}),
                      }}
                      onClick={() =>
                        setVaultFilters((f) => {
                          const next = new Set(f.curators);
                          if (next.has(c)) next.delete(c);
                          else next.add(c);
                          return { ...f, curators: next };
                        })
                      }
                    >
                      {active ? "◆ " : "◇ "}
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <VaultTable data={filteredVaults} isLoading={isLoading} />
      </section>

      {/* APY History section */}
      <section className="space-y-3">
        <span className="text-xs uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          ── APY HISTORY
        </span>
        <RateChart rates={data?.filter((r) => r.protocol !== "metamorpho")} />
      </section>
    </div>
  );
}
