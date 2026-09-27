import { SiteNav } from "@/components/site/site-nav";
import { Hero } from "@/components/site/hero";
import { KeyStats } from "@/components/site/key-stats";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1 pb-32">
        <Hero />
        <KeyStats />
      </main>
    </>
  );
}
