"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-16 h-6" />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="col-toggle"
      style={{ borderRadius: "var(--radius)" }}
      aria-label="Toggle theme"
    >
      {isDark ? "◑ INK" : "◐ CRT"}
    </button>
  );
}
