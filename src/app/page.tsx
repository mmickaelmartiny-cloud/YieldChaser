import { YieldTable } from "@/components/YieldTable";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">YieldChaser</h1>
            <p className="text-sm text-muted-foreground">
              Stablecoin lending yields across DeFi protocols
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Best Rates</h2>
          <span className="text-xs text-muted-foreground">Auto-refreshes every 60s</span>
        </div>

        <YieldTable />
      </main>
    </div>
  );
}
