import { ArrowRight, ArrowDown, Cpu, Sparkles, Tag, FileText } from "lucide-react";
import summary from "@/data/summary.json";
import { FadeIn } from "@/components/site/fade-in";

const threshold = 0.8; // same as the API
const pctLabel = `${Math.round(threshold * 100)}%`;

function Node({
  icon,
  title,
  detail,
  accent = false,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`h-full rounded-lg border bg-card p-4 ${accent ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className={accent ? "text-primary" : "text-muted-foreground"}>{icon}</span>
        {title}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function HArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
      <ArrowRight className="size-4" />
      {label && <span className="num whitespace-nowrap text-[10px]">{label}</span>}
    </div>
  );
}

function VArrow({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
      <ArrowDown className="size-4" />
      {label && <span className="num text-[10px]">{label}</span>}
    </div>
  );
}

const steps = [
  {
    n: "01",
    title: "A dataset that didn't exist",
    body: "No public data on Indian petty-cash expenses, so I defined 8 categories and 28 subcategories, then had an LLM write 3,434 labelled entries in five styles: quick phone notes, Hinglish, typos, vague, and formal.",
  },
  {
    n: "02",
    title: "Three approaches, one test",
    body: "A TF-IDF + logistic regression baseline (word and character n-grams to survive typos), an LLM given the exact taxonomy, and a hybrid that only calls the LLM when the baseline is unsure.",
  },
  {
    n: "03",
    title: "Testing on unfamiliar writing",
    body: `On test data from the same generator, the baseline scored ${(summary.synthetic_test_baseline.category_accuracy * 100).toFixed(1)}%. On 130 hand-checked expenses in a different style it dropped to ${(summary.approaches[0].category_accuracy * 100).toFixed(1)}%. The second number is the honest one, so every result on this page uses it.`,
  },
];

const stack = ["Python", "scikit-learn", "Groq · gpt-oss-20b", "FastAPI", "Next.js", "Tailwind", "Motion", "Recharts"];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 pt-32">
      <FadeIn>
        <p className="text-sm font-medium text-primary">How it works</p>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Fast by default. Smart when it matters.</h2>
      </FadeIn>

      {/* Pipeline diagram: a grid on desktop so boxes line up, a simple list on phones */}
      <FadeIn delay={0.1}>
        <div className="mt-10 rounded-xl border border-border bg-muted/30 p-4 sm:p-6">
          {/* Desktop */}
          <div className="hidden grid-cols-[1fr_5.5rem_1fr_5.5rem_1fr] items-stretch md:grid">
            {/* row 1 */}
            <Node icon={<FileText className="size-4" />} title="Expense" detail={`"auto se client office" · ₹180`} />
            <HArrow />
            <Node
              icon={<Cpu className="size-4" />}
              title="Baseline"
              detail="TF-IDF + logistic regression. Under 1 ms, free, gives a confidence score."
            />
            <HArrow label={`≥ ${pctLabel} sure`} />
            <Node icon={<Tag className="size-4" />} title="Tag it" detail="Most expenses stop here: no API call, no cost." accent />

            {/* row 2: the branch down from the baseline */}
            <div className="col-start-3 flex flex-col items-center py-2 text-muted-foreground">
              <div className="h-3 w-px bg-border" />
              <ArrowDown className="size-4" />
              <span className="num mt-0.5 text-[10px]">&lt; {pctLabel} sure</span>
            </div>
            <div className="col-span-2" />

            {/* row 3 */}
            <div className="col-start-3">
              <Node
                icon={<Sparkles className="size-4" />}
                title="Ask the LLM"
                detail="Only the unsure ones. Gets the full taxonomy, returns a subcategory as JSON."
              />
            </div>
            <HArrow />
            <Node icon={<Tag className="size-4" />} title="Tag it" detail="The LLM's answer replaces the baseline's guess." />
          </div>

          {/* Phone */}
          <div className="flex flex-col md:hidden">
            <Node icon={<FileText className="size-4" />} title="Expense" detail={`"auto se client office" · ₹180`} />
            <VArrow />
            <Node
              icon={<Cpu className="size-4" />}
              title="Baseline"
              detail="TF-IDF + logistic regression. Under 1 ms, free, gives a confidence score."
            />
            <VArrow label={`≥ ${pctLabel} sure`} />
            <Node icon={<Tag className="size-4" />} title="Tag it" detail="Most expenses stop here: no API call, no cost." accent />
            <p className="num py-3 text-center text-[10px] text-muted-foreground">otherwise, &lt; {pctLabel} sure ↓</p>
            <Node
              icon={<Sparkles className="size-4" />}
              title="Ask the LLM"
              detail="Only the unsure ones. Gets the full taxonomy, returns a subcategory as JSON."
            />
            <VArrow />
            <Node icon={<Tag className="size-4" />} title="Tag it" detail="The LLM's answer replaces the baseline's guess." />
          </div>

          <p className="num mt-5 text-[10px] text-muted-foreground">
            On the test set, {(summary.approaches[2].share_to_llm * 100).toFixed(0)}% of expenses went to the LLM
          </p>
        </div>
      </FadeIn>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {steps.map((s, i) => (
          <FadeIn key={s.n} delay={i * 0.08}>
            <p className="num text-xs text-primary">{s.n}</p>
            <h3 className="mt-2 font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.1}>
        <div className="mt-12 flex flex-wrap gap-2">
          {stack.map((t) => (
            <span key={t} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}
