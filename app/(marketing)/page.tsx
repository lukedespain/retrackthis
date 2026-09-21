import { HeroMidiWave } from "@/components/HeroMidiWave";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingHeroCtas } from "@/components/MarketingHeroCtas";
import { SiteHeader } from "@/components/SiteHeader";

const PRODUCER_STEPS = [
  {
    number: "01",
    title: "Post the part",
    body: "Upload a demo of the part you need retracked, describe the gig, set a price, and pay up front at checkout.",
  },
  {
    number: "02",
    title: "Review submissions",
    body: "Working musicians send takes for free. Listen to everyone who submitted and compare options on your job.",
  },
  {
    number: "03",
    title: "Select a submission",
    body: "Choose the take that fits. That musician gets paid from the funds you already paid. Cancel anytime before awarding for a full refund.",
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

        {/* Producers + Musicians: stacked on mobile, side-by-side from tablet up */}
        <section className="relative border-t border-gray-100">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(91,75,255,0.04),transparent_55%)]" />
          <div className="mx-auto grid max-w-5xl md:grid-cols-2 md:gap-10 md:px-6 md:py-16 lg:gap-14 lg:py-20">
            <RoleTrack
              role="Producers"
              kicker="Post · review · select"
              steps={PRODUCER_STEPS}
              className="border-t border-gray-100 px-5 py-10 first:border-t-0 md:border-t-0 md:px-0 md:py-0"
            />
            <RoleTrack
              role="Musicians"
              kicker="Browse · submit · earn"
              steps={MUSICIAN_STEPS}
              className="border-t border-gray-100 bg-[var(--panel-soft)] px-5 py-10 md:border-t-0 md:bg-transparent md:px-0 md:py-0"
            />
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

function RoleTrack({
  role,
  kicker,
  steps,
  className = "",
}: {
  role: string;
  kicker: string;
  steps: ReadonlyArray<{ number: string; title: string; body: string }>;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{kicker}</p>
        <h3 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:mt-3 sm:text-4xl">
          {role}
        </h3>
      </div>

      <ol className="how-track relative mt-8 space-y-0 sm:mt-10">
        {steps.map((step, index) => (
          <li
            key={step.number}
            className="how-track-step relative grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pb-8 last:pb-0 sm:gap-x-5 sm:pb-10"
          >
            <div className="relative flex flex-col items-center">
              <span className="how-track-dot relative z-[1] flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white shadow-[0_0_0_6px_var(--page)] dark:text-[#111827] sm:h-10 sm:w-10">
                {step.number}
              </span>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute top-9 bottom-0 w-px bg-gradient-to-b from-accent/50 to-accent/10 sm:top-10"
                />
              ) : null}
            </div>
            <div className="min-w-0 pt-1 sm:pt-1.5">
              <h4 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                {step.title}
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500 sm:mt-2 sm:text-[15px]">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
