import { HeroMidiWave } from "@/components/HeroMidiWave";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingHeroCtas } from "@/components/MarketingHeroCtas";
import { SiteHeader } from "@/components/SiteHeader";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SiteHeader />

      <main>
        <section className="pt-12 sm:pt-24">
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-accent">For producers, songwriters & composers</p>
              <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-gray-900 sm:mt-4 sm:text-5xl lg:text-6xl">
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

        <section className="border-t border-gray-100 bg-surface">
          <div className="mx-auto max-w-5xl space-y-16 px-5 py-16 sm:space-y-24 sm:px-6 sm:py-24">
            <HowItWorks
              eyebrow="How it works for producers"
              steps={[
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
              ]}
            />

            <HowItWorks
              eyebrow="How it works for musicians"
              steps={[
                {
                  number: "01",
                  title: "Select the instruments you play",
                  body: "Tell us what you record live in Settings. That powers job alerts and helps producers find the right players.",
                },
                {
                  number: "02",
                  title: "Browse open gigs",
                  body: "Find jobs for your instruments. Listen to the reference tracks and decide if the part is right for you.",
                },
                {
                  number: "03",
                  title: "Submit your takes",
                  body: "One submission per job, with up to three takes inside it. Free to submit. The producer picks who to pay.",
                },
              ]}
            />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-6 sm:py-24">
          <div className="rounded-2xl bg-accent-muted px-6 py-12 sm:rounded-3xl sm:px-16 sm:py-16">
            <p className="text-sm font-medium text-accent">Why Retrack This exists</p>
            <h2 className="mt-3 max-w-xl text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
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

function HowItWorks({
  eyebrow,
  steps,
}: {
  eyebrow: string;
  steps: Array<{ number: string; title: string; body: string }>;
}) {
  return (
    <div>
      <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">{eyebrow}</h2>
      <div className="mt-10 grid grid-cols-1 gap-12 sm:mt-12 sm:grid-cols-3 sm:gap-16">
        {steps.map((step) => (
          <Step key={step.number} {...step} />
        ))}
      </div>
    </div>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div>
      <span className="text-sm font-semibold text-accent">{number}</span>
      <h3 className="mt-2 text-lg font-medium text-gray-900 sm:mt-3">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500 sm:mt-2">{body}</p>
    </div>
  );
}
