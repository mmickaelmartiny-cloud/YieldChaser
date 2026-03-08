"use client";

import { useMemo, useState } from "react";
import { useYieldRates } from "@/hooks/useYieldRates";
import { YieldTable } from "@/components/YieldTable";
import { VaultTable } from "@/components/VaultTable";
import { RateChart } from "@/components/RateChart";
import { FilterBar, defaultFilters } from "@/components/FilterBar";
import type { FilterState } from "@/components/FilterBar";

export function Dashboard() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const { data, isLoading, error } = useYieldRates();

  // Markets: aave / morpho (Blue) / euler / compound — filtered by all filters
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

  // MetaMorpho vaults — filtered by chain + asset only
  const filteredVaults = useMemo(() => {
    if (!data) return data;
    return data.filter(
      (r) =>
        r.protocol === "metamorpho" &&
        filters.chains.has(r.chainId) &&
        filters.assets.has(r.asset)
    );
  }, [data, filters]);

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
