"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Loader2, Sparkles, Cpu, GitMerge } from "lucide-react";
import { FadeIn } from "@/components/site/fade-in";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Prediction = {
  subcategory: string;
  category: string;
  confidence: number;
  latency_ms: number;
  cost_inr: number;
  error?: string;
  source?: "baseline" | "llm";
  threshold?: number;
};

type Result = { baseline: Prediction; llm: Prediction; hybrid: Prediction };

// A real response saved from the API, shown before anyone types
const SAMPLE: Result = {
  baseline: { subcategory: "Cab/Auto", category: "Travel", confidence: 0.42, latency_ms: 11, cost_inr: 0 },
  llm: { subcategory: "Other", category: "Miscellaneous", confidence: 0.8, latency_ms: 581, cost_inr: 0.0065 },
  hybrid: {
    subcategory: "Other",
    category: "Miscellaneous",
    confidence: 0.8,
    latency_ms: 592,
    cost_inr: 0.0065,
    source: "llm",
    threshold: 0.8,
  },
};

const EXAMPLES = [
  { description: "akasa air tkt client meet", amount: 4800 },
  { description: "chai for team", amount: 120 },
  { description: "xerox 50 pgs", amount: 100 },
  { description: "given to peon", amount: 100 },
  { description: "cab back home after late release", amount: 420 },
];

export function LiveDemo() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<Result | null>(SAMPLE);
  const [isSample, setIsSample] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);

  async function classify(desc = description, amt = amount) {
    if (!desc.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc.trim(), amount: amt ? Number(amt) : null }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      setResult(await res.json());
      setIsSample(false);
      setRunId((n) => n + 1);
    } catch {
      setError("Couldn't reach the API. Is the server running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  function tryExample(ex: (typeof EXAMPLES)[number]) {
    setDescription(ex.description);
    setAmount(String(ex.amount));
    classify(ex.description, String(ex.amount));
  }

  return (
    <section id="demo" className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 pt-32">
      <FadeIn>
        <p className="text-sm font-medium text-primary">Live demo</p>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Type an expense. Watch three models tag it.</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Messy is fine: typos, Hinglish, abbreviations. The hybrid only asks the LLM when the fast model is
          less than 80% sure.
        </p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            classify();
          }}
          className="mt-8 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row"
        >
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. auto fare to client office"
            maxLength={200}
            className="h-11 flex-1 rounded-md bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground/70"
          />
          <div className="flex gap-3">
            <div className="flex h-11 items-center rounded-md border border-border px-3 sm:w-32">
              <span className="num text-sm text-muted-foreground">₹</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="240"
                inputMode="decimal"
                className="num h-full w-full bg-transparent pl-2 text-sm outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              Classify
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.description}
              type="button"
              onClick={() => tryExample(ex)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {ex.description}
            </button>
          ))}
        </div>
      </FadeIn>

      {error && <p className="mt-6 text-sm text-destructive">{error}</p>}
      {isSample && !loading && (
        <p className="mt-8 text-xs text-muted-foreground">
          Sample result for <span className="num text-foreground">&quot;given to peon&quot;</span>. The baseline is
          unsure (42%), so the hybrid hands it to the LLM. Try your own above.
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <ModelCard
          title="Baseline"
          detail="TF-IDF + Logistic Regression"
          icon={<Cpu className="size-4" />}
          prediction={result?.baseline}
          loading={loading}
          runId={runId}
          showThreshold
        />
        <ModelCard
          title="LLM"
          detail="gpt-oss-20b via Groq"
          icon={<Sparkles className="size-4" />}
          prediction={result?.llm}
          loading={loading}
          runId={runId}
        />
        <ModelCard
          title="Hybrid"
          detail="Baseline first, LLM if unsure"
          icon={<GitMerge className="size-4" />}
          prediction={result?.hybrid}
          loading={loading}
          runId={runId}
          highlight
        />
      </div>
    </section>
  );
}

function ModelCard({
  title,
  detail,
  icon,
  prediction,
  loading,
  runId,
  highlight = false,
  showThreshold = false,
}: {
  title: string;
  detail: string;
  icon: React.ReactNode;
  prediction?: Prediction;
  loading: boolean;
  runId: number;
  highlight?: boolean;
  showThreshold?: boolean;
}) {
  const confident = prediction ? prediction.confidence >= 0.8 : false;

  return (
    <div
      className={`relative flex min-h-56 flex-col rounded-xl border bg-card p-5 transition-colors ${
        highlight ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</span>
          {title}
        </div>
        {prediction?.source && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            used {prediction.source === "llm" ? "LLM" : "baseline"}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>

      <div className="mt-auto pt-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-1.5 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : prediction?.error ? (
          <p className="text-sm text-destructive">LLM unavailable right now.</p>
        ) : prediction ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={runId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <p className="text-xs text-muted-foreground">{prediction.category}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight">{prediction.subcategory}</p>

              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Confidence{showThreshold && <span className="text-muted-foreground/70"> · threshold 80%</span>}
                </span>
                <span className="num">{Math.round(prediction.confidence * 100)}%</span>
              </div>
              <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={`h-full rounded-full ${confident ? "bg-success" : "bg-warning"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${prediction.confidence * 100}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
                {showThreshold && (
                  <span className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: "80%" }} />
                )}
              </div>

              <div className="num mt-4 flex justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>{prediction.latency_ms < 10 ? prediction.latency_ms.toFixed(1) : Math.round(prediction.latency_ms)} ms</span>
                <span>₹{prediction.cost_inr.toFixed(4)}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <p className="text-sm text-muted-foreground">Waiting for an expense…</p>
        )}
      </div>
    </div>
  );
}
