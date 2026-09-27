import { SiteNav } from "@/components/site/site-nav";
import { Hero } from "@/components/site/hero";
import { KeyStats } from "@/components/site/key-stats";
import { LiveDemo } from "@/components/site/live-demo";
import { Results } from "@/components/site/results";
import { SavingsCalculator } from "@/components/site/savings-calculator";
import { HowItWorks } from "@/components/site/how-it-works";
import { SiteFooter } from "@/components/site/site-footer";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1 pb-32">
        <Hero />
        <KeyStats />
        <LiveDemo />
        <Results />
        <SavingsCalculator />
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  );
}
