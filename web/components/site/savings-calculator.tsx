"use client";

import { useState } from "react";
import summary from "@/data/summary.json";
import { FadeIn } from "@/components/site/fade-in";
import { RangeSlider } from "@/components/site/range-slider";

const MINUTES_TO_FIX = summary.assumptions.minutes_to_fix; // a wrong tag costs more than tagging it yourself

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
// small amounts (the LLM bill) keep their paise so they don't round to ₹0 or ₹1
const inrSmall = (v: number) => (v < 100 ? `₹${v.toFixed(2)}` : inr(v));

export function SavingsCalculator() {
  const [expenses, setExpenses] = useState(summary.assumptions.expenses_per_month);
  const [minutes, setMinutes] = useState(summary.assumptions.minutes_to_tag);
  const [hourlyCost, setHourlyCost] = useState(500);

  const manualHours = (expenses * minutes) / 60;

  const rows = summary.approaches.map((a) => {
    const errorHours = (expenses * (1 - a.subcategory_accuracy) * MINUTES_TO_FIX) / 60;
    const saved = Math.max(0, manualHours - errorHours);
    const llmCost = (a.cost_per_1000_inr * expenses) / 1000;
    return { name: a.name, saved, llmCost, net: saved * hourlyCost - llmCost };
  });
  const hybrid = rows.find((r) => r.name === "Hybrid")!;

  return (
    <section id="savings" className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 pt-24">
      <FadeIn>
        <div className="grid gap-8 rounded-xl border border-border bg-card p-6 sm:p-8 md:grid-cols-[1fr_1.1fr]">
          <div>
            <h3 className="text-xl font-semibold">What would it save your team?</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Every wrong tag still costs {MINUTES_TO_FIX} minutes to find and fix, so accuracy matters, not just
              speed.
            </p>

            <div className="mt-8 space-y-7">
              <RangeSlider
                label="Expenses per month"
                value={expenses}
                min={100}
                max={20000}
                step={100}
                onChange={setExpenses}
                format={(v) => v.toLocaleString("en-IN")}
              />
              <RangeSlider
                label="Minutes to tag one by hand"
                value={minutes}
                min={0.5}
                max={5}
                step={0.5}
                onChange={setMinutes}
                format={(v) => `${v} min`}
              />
              <RangeSlider
                label="Finance staff cost per hour"
                value={hourlyCost}
                min={200}
                max={2000}
                step={50}
                onChange={setHourlyCost}
                format={inr}
              />
            </div>
          </div>

          <div className="flex flex-col rounded-lg bg-muted/50 p-6">
            <p className="text-sm text-muted-foreground">With the hybrid, your team saves</p>
            <p className="stat mt-2 text-5xl font-semibold">
              {hybrid.saved.toFixed(1)}
              <span className="ml-2 text-xl font-medium text-muted-foreground">hrs / month</span>
            </p>
            <p className="num mt-2 text-sm text-muted-foreground">
              ≈ {inr(hybrid.net)} of staff time · LLM bill {inrSmall(hybrid.llmCost)}
            </p>

            <div className="mt-8 space-y-4">
              <p className="text-xs text-muted-foreground">
                Hours saved, out of <span className="tabular-nums">{manualHours.toFixed(1)}</span> spent tagging by hand
              </p>
              {rows.map((r) => {
                const isHybrid = r.name === "Hybrid";
                const width = manualHours > 0 ? (r.saved / manualHours) * 100 : 0;
                return (
                  <div key={r.name}>
                    <div className="flex justify-between text-xs">
                      <span className={isHybrid ? "font-medium" : "text-muted-foreground"}>{r.name}</span>
                      <span className="num">{r.saved.toFixed(1)} hrs</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-background">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                          isHybrid ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
