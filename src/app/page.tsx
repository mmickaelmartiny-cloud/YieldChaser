import { Dashboard } from "@/components/Dashboard";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Terminal command bar */}
      <header className="border-b border-border sticky top-0 z-50 bg-background">
        <div className="px-6 py-3 flex items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-baseline gap-3 shrink-0">
            <span
              className="text-2xl font-bold tracking-widest uppercase select-none"
              style={{
                fontFamily: "var(--font-courier), 'Courier New', serif",
                color: "var(--primary)",
                textShadow: "var(--amber-glow)",
                letterSpacing: "0.2em",
              }}
            >
              YIELD
            </span>
            <span
              className="text-2xl font-bold tracking-widest uppercase select-none"
              style={{
                fontFamily: "var(--font-courier), 'Courier New', serif",
                color: "var(--foreground)",
                letterSpacing: "0.2em",
              }}
            >
              CHASER
            </span>
            <span
              className="cursor-blink ml-1 text-lg"
              style={{ color: "var(--cursor-color)" }}
            >
              ▮
            </span>
          </div>

          {/* Status line */}
          <div
            className="hidden md:flex items-center gap-2 text-xs overflow-hidden flex-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span style={{ color: "var(--primary)" }}>›</span>
            <span>stablecoin lending yields</span>
            <span className="opacity-30 mx-1">·</span>
            <span style={{ color: "var(--primary)" }}>›</span>
            <span>aave · morpho · euler</span>
            <span className="opacity-30 mx-1">·</span>
            <span style={{ color: "var(--primary)" }}>›</span>
            <span>eth · base · arb · op</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <span
              className="hidden sm:block text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              ⟳ 60s
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="px-6 py-6 max-w-[1600px] mx-auto">
        <Dashboard />
      </main>
    </div>
  );
}
