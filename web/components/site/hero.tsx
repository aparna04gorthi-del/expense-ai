import { TextEffect } from "@/components/motion-primitives/text-effect";
import { FadeIn } from "@/components/site/fade-in";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft accent glow. We'll swap this for your Haikei blob later. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary opacity-[0.12] blur-3xl dark:opacity-[0.18]"
      />

      <div className="relative mx-auto w-full max-w-5xl px-6 pb-20 pt-28 sm:pt-36">
        <FadeIn>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            ML project · baseline vs LLM vs hybrid
          </p>
        </FadeIn>

        <TextEffect
          as="h1"
          per="word"
          preset="fade-in-blur"
          speedReveal={1.1}
          className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] sm:text-7xl"
        >
          Stop re-tagging expenses.
        </TextEffect>

        <FadeIn delay={0.3}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            A classifier that tags petty-cash expenses automatically, and knows when it&apos;s unsure
            enough to ask a bigger model for help.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#demo"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Try the demo
            </a>
            <a
              href="#results"
              className="rounded-md border border-border bg-card/60 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              See results
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
