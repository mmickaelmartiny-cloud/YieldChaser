"use client";

import { useMemo, useState } from "react";
import { useYieldRates } from "@/hooks/useYieldRates";
import { YieldTable } from "@/components/YieldTable";
import { RateChart } from "@/components/RateChart";
import { FilterBar, defaultFilters } from "@/components/FilterBar";
import type { FilterState } from "@/components/FilterBar";

export function Dashboard() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const { data, isLoading, error } = useYieldRates();

  const filtered = useMemo(() => {
    if (!data) return data;
    return data.filter(
      (r) =>
        filters.protocols.has(r.protocol) &&
        filters.chains.has(r.chainId) &&
        filters.assets.has(r.asset)
    );
  }, [data, filters]);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Best Rates</h2>
          <span className="text-xs text-muted-foreground">Auto-refreshes every 60s</span>
        </div>
        <FilterBar filters={filters} onChange={setFilters} />
        <YieldTable data={filtered} isLoading={isLoading} error={error} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">APY History</h2>
        <RateChart rates={data} />
      </section>
    </div>
  );
}
