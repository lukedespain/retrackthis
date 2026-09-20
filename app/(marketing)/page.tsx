import { HeroMidiWave } from "@/components/HeroMidiWave";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingHeroCtas } from "@/components/MarketingHeroCtas";
import { SiteHeader } from "@/components/SiteHeader";

const PRODUCER_STEPS = [
  {
    number: "01",
    title: "Post the part",
    body: "Upload a demo of the part you need retracked, describe the gig, set a price, and your payment is held until you choose a take.",
  },
  {
    number: "02",
    title: "Review submissions",
    body: "Working musicians send takes for free. Listen to everyone who submitted and compare options on your job.",
  },
  {
    number: "03",
    title: "Select a submission",
    body: "Choose the take that fits. That musician gets paid. You can cancel anytime before awarding for a full release of the hold.",
  },
] as const;

const MUSICIAN_STEPS = [
  {
    number: "01",
    title: "Browse open gigs",
    body: "Find jobs for your instruments. Listen to the reference tracks and decide if the part is right for you.",
  },
  {
    number: "02",
    title: "Submit your takes",
    body: "One submission per job, with up to three takes inside it. Free to submit. The producer picks who to pay.",
  },
  {
    number: "03",
    title: "Earn when you win",
    body: "If your take gets picked, you get paid. Set up payouts once, then cash out whenever a producer awards you.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SiteHeader />

      <main>
        <section className="pt-12 sm:pt-24">
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Retrack your demo with real musicians.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-gray-500 sm:mt-6 sm:text-lg">
                Post a demo of the part you need. Real musicians send back their take. Pick the one
                that feels right.
              </p>
              <MarketingHeroCtas />
            </div>
          </div>

          <HeroMidiWave />
        </section>

        {/* Continues the hero visual: two role columns side by side */}
        <section className="border-t border-gray-100">
          <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-20">
            {/* Below lg: each role stacked as its own self-contained column */}
            <div className="grid grid-cols-1 gap-12 lg:hidden">
              <RoleColumn role="Producers" kicker="Post · review · select" steps={PRODUCER_STEPS} />
              <RoleColumn role="Musicians" kicker="Browse · submit · earn" steps={MUSICIAN_STEPS} />
            </div>

            {/* At lg+: headers side by side, steps in a row-synced grid so 01/02/03 line up */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-2 gap-x-16">
                <RoleHeader role="Producers" kicker="Post · review · select" />
                <RoleHeader role="Musicians" kicker="Browse · submit · earn" />
              </div>
              <div className="mt-10 grid grid-cols-2 gap-x-16 gap-y-10">
                {PRODUCER_STEPS.map((step, index) => (
                  <StepItem key={`producers-${step.number}`} step={step} style={{ gridRow: index + 1, gridColumn: 1 }} />
                ))}
                {MUSICIAN_STEPS.map((step, index) => (
                  <StepItem key={`musicians-${step.number}`} step={step} style={{ gridRow: index + 1, gridColumn: 2 }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-24">
          <div className="rounded-2xl bg-accent-muted px-5 py-10 sm:rounded-3xl sm:px-16 sm:py-16">
            <h2 className="max-w-xl text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
              Music is losing its humanism. We&apos;re building a place to keep it.
            </h2>
            <div className="mt-4 max-w-2xl space-y-4 text-sm leading-relaxed text-gray-600 sm:mt-5 sm:text-base">
              <p>
                Real musicians take your demo and elevate it, adding the emotion and soul of a real
                performance. Post the part, get takes back, and pick the one that brings your song to
                life. It&apos;s a place for producers and musicians to find each other and make something
                better together.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

function RoleHeader({ role, kicker }: { role: string; kicker: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{kicker}</p>
      <h3 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{role}</h3>
      <hr className="mt-6 border-t border-gray-100 sm:mt-8" />
    </div>
  );
}

function StepItem({
  step,
  style,
}: {
  step: { number: string; title: string; body: string };
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className="grid grid-cols-[2.5rem_1fr] gap-x-4 sm:grid-cols-[3rem_1fr]">
      <span className="text-2xl font-semibold leading-none text-accent sm:text-3xl">{step.number}</span>
      <div className="min-w-0">
        <h4 className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">{step.title}</h4>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500 sm:text-[15px]">{step.body}</p>
      </div>
    </div>
  );
}

function RoleColumn({
  role,
  kicker,
  steps,
}: {
  role: string;
  kicker: string;
  steps: ReadonlyArray<{ number: string; title: string; body: string }>;
}) {
  return (
    <div>
      <RoleHeader role={role} kicker={kicker} />
      <ol className="mt-8 space-y-8 sm:mt-10 sm:space-y-10">
        {steps.map((step) => (
          <li key={step.number}>
            <StepItem step={step} />
          </li>
        ))}
      </ol>
    </div>
  );
}
