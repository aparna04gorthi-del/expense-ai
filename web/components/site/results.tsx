import summary from "@/data/summary.json";
import { FadeIn } from "@/components/site/fade-in";
import { TradeoffChart } from "@/components/site/tradeoff-chart";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const ms = (v: number) => (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v).toString());

export function Results() {
  const rows = summary.approaches;

  return (
    <section id="results" className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 pt-32">
      <FadeIn>
        <p className="text-sm font-medium text-primary">Results</p>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">LLM accuracy, at half the LLM calls.</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Tested on 130 hand-checked expenses written in a different style from the training data. The baseline
          alone gets most of the way; a few LLM calls on its unsure cases close the gap.
        </p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mt-10">
          <TradeoffChart />
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Approach</th>
                <th className="px-5 py-3 text-right font-medium">Category</th>
                <th className="px-5 py-3 text-right font-medium">Subcategory</th>
                <th className="px-5 py-3 text-right font-medium">Sent to LLM</th>
                <th className="px-5 py-3 text-right font-medium">₹ / 1k</th>
                <th className="px-5 py-3 text-right font-medium">Latency</th>
                <th className="px-5 py-3 text-right font-medium">Hrs saved / mo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isHybrid = r.name === "Hybrid";
                return (
                  <tr key={r.name} className={`border-b border-border last:border-0 ${isHybrid ? "bg-primary/[0.04]" : ""}`}>
                    <td className="px-5 py-4">
                      <p className={`font-medium ${isHybrid ? "text-primary" : ""}`}>{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.detail}</p>
                    </td>
                    <td className="num px-5 py-4 text-right">{pct(r.category_accuracy)}</td>
                    <td className="num px-5 py-4 text-right">{pct(r.subcategory_accuracy)}</td>
                    <td className="num px-5 py-4 text-right">{(r.share_to_llm * 100).toFixed(0)}%</td>
                    <td className="num px-5 py-4 text-right">₹{r.cost_per_1000_inr.toFixed(2)}</td>
                    <td className="num px-5 py-4 text-right">{ms(r.latency_ms)} ms</td>
                    <td className="num px-5 py-4 text-right">{r.hours_saved_per_month.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-border p-5">
            <p className="font-medium">A few calls do most of the work</p>
            <p className="mt-1.5 text-muted-foreground">
              Sending just 5% of expenses to the LLM lifts category accuracy from 92.3% to 95.4%.
            </p>
          </div>
          <div className="rounded-xl border border-border p-5">
            <p className="font-medium">Trust the small model&apos;s doubt</p>
            <p className="mt-1.5 text-muted-foreground">
              The baseline&apos;s confidence predicts its mistakes well. The LLM said 90%+ even when wrong, so it
              can&apos;t decide routing.
            </p>
          </div>
          <div className="rounded-xl border border-border p-5">
            <p className="font-medium">Honest caveats</p>
            <p className="mt-1.5 text-muted-foreground">
              130 rows is small: one row is 0.8 points, so hybrid vs LLM is a tie. The threshold was tuned on this
              same set.
            </p>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
