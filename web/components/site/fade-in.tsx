"use client";

import { InView } from "@/components/motion-primitives/in-view";

// Sections fade in and rise 8px on scroll (design brief motion rules)
export function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <InView
      once
      viewOptions={{ margin: "0px 0px -80px 0px" }}
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
    >
      {children}
    </InView>
  );
}
