"use client";

import { useEffect, useState } from "react";

// Charts draw SVG, which can't always read CSS variables directly.
// This hook reads the current theme colours and updates when light/dark changes.
const TOKENS = ["--primary", "--foreground", "--muted-foreground", "--border", "--card", "--background"] as const;
type Token = (typeof TOKENS)[number];

function read(): Record<Token, string> {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(TOKENS.map((t) => [t, style.getPropertyValue(t).trim()])) as Record<Token, string>;
}

export function useThemeColors() {
  const [colors, setColors] = useState<Record<Token, string> | null>(null);

  useEffect(() => {
    setColors(read());
    const observer = new MutationObserver(() => setColors(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}
