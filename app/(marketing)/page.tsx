import { HeroFlow } from "@/components/home/HeroFlow";
import { HomeHeroCtas } from "@/components/home/HomeHeroCtas";
import { MissionSection } from "@/components/home/MissionSection";
import { OpenNow } from "@/components/home/OpenNow";
import { MarketingFooter } from "@/components/MarketingFooter";
import { SiteHeader } from "@/components/SiteHeader";

const PRODUCER_STEPS = [
  {
    title: "Post the part",
    body: "Upload the part you need retracked, set a budget, and pay up front.",
  },
  {
    title: "Review takes",
    body: "Listen to all of the submissions and favorite the one you love.",
  },
  {
    title: "Pick a winner",
    body: "Pick within 48 hours of the deadline, or your favorite wins. No favorite? Full refund.",
  },
] as const;

const MUSICIAN_STEPS = [
  {
    title: "Find work",
    body: "Find gigs for your instruments. Listen to the reference tracks and decide if the part is right for you.",
  },
  {
    title: "Send your take",
    body: "One submission per job, up to two takes. Always free.",
  },
  {
    title: "Get paid",
    body: "If you're picked, the payout lands in your account. Set it up once.",
  },
] as const;

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main className="wrap">
        <section className="hero">
          <h1>
            Retrack your demo with <em>real</em> musicians
          </h1>
          <p className="hero-sub">
            Post the part you need. Real musicians send back their take. Pick the one that feels
            right.
          </p>
          <HomeHeroCtas />
          <HeroFlow />
        </section>

        <section className="tracks">
          <Track kick="For producers" title="Post · review · pick" steps={PRODUCER_STEPS} />
          <Track kick="For musicians" title="Browse · submit · earn" steps={MUSICIAN_STEPS} />
        </section>

        <OpenNow />

        <MissionSection />
      </main>

      <MarketingFooter />
    </>
  );
}

function Track({
  kick,
  title,
  steps,
}: {
  kick: string;
  title: string;
  steps: ReadonlyArray<{ title: string; body: string }>;
}) {
  return (
    <article className="track">
      <span className="kick">{kick}</span>
      <h2>{title}</h2>
      <div className="steps">
        {steps.map((step, i) => (
          <div key={step.title} className="stp">
            <span className="n">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
