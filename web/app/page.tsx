import { ThemeToggle } from "@/components/theme-toggle";

// Temporary preview page: checks colours, fonts and the theme toggle.
// We'll replace it with the real hero section next.

const stats = [
  { label: "Baseline accuracy", value: "92.3%", note: "free · 0.1 ms" },
  { label: "LLM accuracy", value: "96.2%", note: "₹1.18 per 1,000" },
  { label: "Hybrid accuracy", value: "96.9%", note: "46% of LLM calls" },
];

const swatches = [
  { name: "Background", className: "bg-background" },
  { name: "Card", className: "bg-card" },
  { name: "Muted", className: "bg-muted" },
  { name: "Accent", className: "bg-primary" },
  { name: "Success", className: "bg-success" },
  { name: "Warning", className: "bg-warning" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <nav className="flex items-center justify-between">
        <span className="font-semibold tracking-tight">Expense AI</span>
        <ThemeToggle />
      </nav>

      <section className="py-24">
        <p className="text-sm text-muted-foreground">Design check</p>
        <h1 className="mt-3 text-5xl font-semibold sm:text-6xl">Stop re-tagging expenses.</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          A classifier that tags petty-cash expenses automatically, and knows when to ask for help.
        </p>
        <div className="mt-8 flex gap-3">
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try the demo</button>
          <button className="rounded-md border border-border px-4 py-2 text-sm font-medium">See results</button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="num mt-2 text-4xl font-medium">{s.value}</p>
            <p className="num mt-1 text-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 grid grid-cols-3 gap-4 sm:grid-cols-6">
        {swatches.map((s) => (
          <div key={s.name}>
            <div className={`h-16 rounded-lg border border-border ${s.className}`} />
            <p className="mt-2 text-xs text-muted-foreground">{s.name}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
