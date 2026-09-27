import summary from "@/data/summary.json";
import { CountUp } from "@/components/site/count-up";
import { FadeIn } from "@/components/site/fade-in";

const hybrid = summary.approaches.find((a) => a.name === "Hybrid")!;
const llm = summary.approaches.find((a) => a.name === "LLM")!;

const stats = [
  {
    label: "Category accuracy",
    value: hybrid.category_accuracy * 100,
    decimals: 1,
    suffix: "%",
    note: "Hybrid · on 130 hand-checked expenses",
  },
  {
    label: "Cost per 1,000 expenses",
    value: hybrid.cost_per_1000_inr,
    decimals: 2,
    prefix: "₹",
    note: `vs ₹${llm.cost_per_1000_inr.toFixed(2)} for LLM-only`,
  },
  {
    label: "Hours saved per month",
    value: hybrid.hours_saved_per_month,
    decimals: 1,
    note: `of ${summary.manual_hours_per_month} hrs spent tagging by hand`,
  },
];

export function KeyStats() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.08}>
            <div className="h-full rounded-xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <CountUp
                value={s.value}
                decimals={s.decimals}
                prefix={s.prefix}
                suffix={s.suffix}
                className="stat mt-3 block text-5xl font-semibold"
              />
              <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
