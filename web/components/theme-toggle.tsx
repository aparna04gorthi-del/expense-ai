"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  // After the page loads, read the theme the startup script applied
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark mode"
      className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {isDark === null ? <span className="size-4" /> : isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
