"use client";

import { motion } from "motion/react";

// Adapted from Watermelon UI's "adaptive-slider" (ui.watermelon.sh, MIT):
// same technique (animated track over a native range input, so keyboard and
// screen readers still work), restyled to the calm design brief.

type RangeSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
};

export function RangeSlider({ label, value, min, max, step, onChange, format }: RangeSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm text-muted-foreground">{label}</label>
        <span className="num text-sm font-medium">{format(value)}</span>
      </div>
      <div className="relative mt-3 h-6">
        {/* track */}
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-muted" />
        {/* filled part */}
        <motion.div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
        />
        {/* thumb */}
        <motion.div
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-card shadow-sm"
          animate={{ left: `${pct}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
        />
        {/* the real input sits on top, invisible, and handles mouse, touch and keyboard */}
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}
