import { Dashboard } from "@/components/Dashboard";
import { ThemeToggle } from "@/components/ThemeToggle";

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
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Dashboard />
      </main>
    </div>
  );
}
