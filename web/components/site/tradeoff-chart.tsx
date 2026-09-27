"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import summary from "@/data/summary.json";
import { useThemeColors } from "@/components/site/use-theme-colors";

type Metric = "category_accuracy" | "subcategory_accuracy";

// Threshold sweep from ml/hybrid.py: each point = one threshold setting
const points = summary.hybrid_sweep
  .map((p) => ({
    threshold: p.threshold,
    share: p.share_to_llm * 100,
    category_accuracy: p.category_accuracy * 100,
    subcategory_accuracy: p.subcategory_accuracy * 100,
    cost: p.cost_per_1000_inr,
  }))
  // keep one point per share value (thresholds 0 and 0.05 both send 0%)
  .filter((p, i, arr) => arr.findIndex((q) => q.share === p.share) === i);

const chosenThreshold = summary.approaches.find((a) => a.name === "Hybrid")!.share_to_llm * 100;

type Point = (typeof points)[number];

function TooltipBox({ active, payload, metric }: { active?: boolean; payload?: { payload: Point }[]; metric: Metric }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">Threshold {p.threshold.toFixed(2)}</p>
      <div className="num mt-1.5 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-muted-foreground">
        <span>Sent to LLM</span>
        <span className="text-right text-foreground">{p.share.toFixed(0)}%</span>
        <span>Accuracy</span>
        <span className="text-right text-foreground">{p[metric].toFixed(1)}%</span>
        <span>Cost / 1k</span>
        <span className="text-right text-foreground">₹{p.cost.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function TradeoffChart() {
  const colors = useThemeColors();
  const [metric, setMetric] = useState<Metric>("category_accuracy");

  const first = points[0];
  const last = points[points.length - 1];
  const chosen = points.find((p) => Math.abs(p.share - chosenThreshold) < 0.01) ?? last;

  const labels = [
    { p: first, text: "Baseline only", anchor: "start" as const, dx: 10, position: "bottom" as const },
    { p: chosen, text: "Hybrid", anchor: "middle" as const, dx: 0, position: "top" as const },
    { p: last, text: "LLM only", anchor: "end" as const, dx: -10, position: "top" as const },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Accuracy vs. how much you send to the LLM</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Each point is one hybrid threshold. Hover to see its cost.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          {(
            [
              ["category_accuracy", "Category"],
              ["subcategory_accuracy", "Subcategory"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              className={`rounded px-3 py-1 transition-colors ${
                metric === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 h-72">
        {colors && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 28, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid vertical={false} stroke={colors["--border"]} />
              <XAxis
                dataKey="share"
                type="number"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: colors["--muted-foreground"], fontSize: 12 }}
                axisLine={{ stroke: colors["--border"] }}
                tickLine={false}
                label={{
                  value: "Expenses sent to the LLM",
                  position: "insideBottom",
                  offset: -4,
                  fill: colors["--muted-foreground"],
                  fontSize: 12,
                }}
                height={44}
              />
              <YAxis
                domain={[84, 100]}
                ticks={[85, 90, 95, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: colors["--muted-foreground"], fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                content={<TooltipBox metric={metric} />}
                cursor={{ stroke: colors["--muted-foreground"], strokeDasharray: "3 3" }}
              />
              <Line
                type="linear"
                dataKey={metric}
                stroke={colors["--primary"]}
                strokeWidth={2}
                dot={{ r: 2.5, fill: colors["--primary"], stroke: "none" }}
                activeDot={{ r: 5, stroke: colors["--card"], strokeWidth: 2, fill: colors["--primary"] }}
                animationDuration={800}
              />
              {labels.map(({ p, text, anchor, dx, position }) => (
                <ReferenceDot
                  key={text}
                  x={p.share}
                  y={p[metric]}
                  r={5}
                  fill={colors["--primary"]}
                  stroke={colors["--card"]}
                  strokeWidth={2}
                  label={{
                    value: `${text} · ${p[metric].toFixed(1)}%`,
                    position,
                    offset: 12,
                    fill: colors["--foreground"],
                    fontSize: 12,
                    textAnchor: anchor,
                    dx,
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
