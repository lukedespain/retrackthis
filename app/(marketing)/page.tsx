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
    title: "Pick who to pay",
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

        {/* Continues the hero visual: two role “tracks” instead of a generic 3-up grid */}
        <section className="relative border-t border-gray-100">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(91,75,255,0.04),transparent_55%)]" />

          <RoleTrack
            role="Producers"
            kicker="Post · review · pay"
            tone="light"
            steps={PRODUCER_STEPS}
          />
          <RoleTrack
            role="Musicians"
            kicker="Browse · submit · earn"
            tone="soft"
            steps={MUSICIAN_STEPS}
            align="end"
          />
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

function RoleTrack({
  role,
  kicker,
  steps,
  tone,
  align = "start",
}: {
  role: string;
  kicker: string;
  steps: ReadonlyArray<{ number: string; title: string; body: string }>;
  tone: "light" | "soft";
  align?: "start" | "end";
}) {
  return (
    <div
      className={`relative border-t border-gray-100 ${
        tone === "soft" ? "bg-[var(--panel-soft)]" : "bg-white"
      }`}
    >
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-20">
        <div
          className={`flex flex-col gap-8 sm:gap-10 lg:gap-14 ${
            align === "end" ? "lg:flex-row-reverse" : "lg:flex-row"
          }`}
        >
          <div className={`shrink-0 lg:w-56 ${align === "end" ? "lg:text-right" : ""}`}>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{kicker}</p>
            <h3 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:mt-3 sm:text-5xl">
              {role}
            </h3>
          </div>

          <ol className="how-track relative min-w-0 flex-1 space-y-0">
            {steps.map((step, index) => (
              <li
                key={step.number}
                className="how-track-step relative grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pb-10 last:pb-0 sm:gap-x-6 sm:pb-12"
              >
                <div className="relative flex flex-col items-center">
                  <span
                    className={`how-track-dot relative z-[1] flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white sm:h-11 sm:w-11 ${
                      tone === "soft"
                        ? "shadow-[0_0_0_6px_var(--panel-soft)]"
                        : "shadow-[0_0_0_6px_var(--page)]"
                    }`}
                  >
                    {step.number}
                  </span>
                  {index < steps.length - 1 ? (
                    <span
                      aria-hidden
                      className="absolute top-10 bottom-0 w-px bg-gradient-to-b from-accent/50 to-accent/10 sm:top-11"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 pt-1.5 sm:pt-2">
                  <h4 className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">
                    {step.title}
                  </h4>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500 sm:text-[15px]">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
