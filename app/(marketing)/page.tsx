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
                Post a demo of the part you need retracked. Working musicians submit their best take.
                Pick the one that works best for you.
              </p>
              <MarketingHeroCtas />
            </div>
          </div>

          <HeroMidiWave />
        </section>

        {/* Continues the hero visual: two role columns side by side */}
        <section className="border-t border-gray-100">
          <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-20">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
              <RoleColumn role="Producers" kicker="Post · review · select" steps={PRODUCER_STEPS} />
              <RoleColumn role="Musicians" kicker="Browse · submit · earn" steps={MUSICIAN_STEPS} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-24">
          <div className="rounded-2xl bg-accent-muted px-5 py-10 sm:rounded-3xl sm:px-16 sm:py-16">
            <h2 className="max-w-xl text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
              Music is losing its humanism. We&apos;re building a place to get it back.
            </h2>
            <div className="mt-4 max-w-2xl space-y-4 text-sm leading-relaxed text-gray-600 sm:mt-5 sm:text-base">
              <p>
                Generative AI is trained on what&apos;s already been made. It can remix the past, but it
                can&apos;t feel a demo the way a musician can: the pocket, the breath, the thing you meant
                between the notes. When demos get fed into tools like Suno, and when players are asked to
                chase AI-shaped parts, the soul gets sanded off.
              </p>
              <p>
                Retrack This is for the opposite of that. Producers, songwriters, and composers post the
                part they need. Real musicians listen, play it on real instruments, and send back takes
                that actually respond to the music. Only the take you pick gets paid. People with skills
                get work. People writing music get human performances again.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
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
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">{kicker}</p>
      <h3 className="mt-1 font-serif text-4xl text-stone-900 sm:text-5xl">{role}</h3>
      <hr className="mt-6 border-t border-[#e6ddd0] sm:mt-8" />

      <ol className="mt-8 space-y-8 sm:mt-10 sm:space-y-10">
        {steps.map((step) => (
          <li key={step.number} className="grid grid-cols-[2.5rem_1fr] gap-x-4 sm:grid-cols-[3rem_1fr]">
            <span className="font-serif text-3xl leading-none text-rust sm:text-4xl">{step.number}</span>
            <div className="min-w-0">
              <h4 className="text-lg font-semibold tracking-tight text-stone-900 sm:text-xl">
                {step.title}
              </h4>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500 sm:text-[15px]">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
