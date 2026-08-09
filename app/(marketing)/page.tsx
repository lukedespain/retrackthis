import Link from "next/link";
import { HeroMidiWave } from "@/components/HeroMidiWave";
import { Logo } from "@/components/Logo";
import { MarketingHeaderActions } from "@/components/MarketingHeaderActions";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-6 sm:py-8">
        <Logo />
        <MarketingHeaderActions />
      </header>

      <main>
        <section className="pt-12 sm:pt-24">
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-accent">For producers, songwriters & composers</p>
              <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-gray-900 sm:mt-4 sm:text-5xl lg:text-6xl">
                Real demos. Real takes. Real music.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-gray-500 sm:mt-6 sm:text-lg">
                Post a demo of the part you need retracked. Working musicians submit their best take.
                Pick the one that works best for you.
              </p>
              <div className="mt-8 flex flex-col gap-2 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-3">
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">Post a job</Button>
                </Link>
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Find work
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <HeroMidiWave />
        </section>

        <section className="border-t border-gray-100 bg-surface">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 sm:py-24">
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">How it works</h2>
            <div className="mt-10 grid grid-cols-1 gap-12 sm:mt-12 sm:grid-cols-3 sm:gap-16">
              <Step
                number="01"
                title="Post the part"
                body="Upload a demo (even just a MIDI scratch track), describe what you need, set a price, and your payment is held in escrow."
              />
              <Step
                number="02"
                title="Musicians submit takes"
                body="Real musicians record and upload their own version of the part. Free to try, no cost to submit."
              />
              <Step
                number="03"
                title="Pick your favorite"
                body="Listen to every take, choose the one that fits, and that musician gets paid instantly."
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-6 sm:py-24">
          <div className="rounded-2xl bg-accent-muted px-6 py-12 sm:rounded-3xl sm:px-16 sm:py-16">
            <p className="text-sm font-medium text-accent">Why RetrackThis exists</p>
            <h2 className="mt-3 max-w-xl text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
              Music is losing its humanism. We&apos;re building a place to get it back.
            </h2>
            <div className="mt-4 max-w-2xl space-y-4 text-sm leading-relaxed text-gray-600 sm:mt-5 sm:text-base">
              <p>
                Generative AI is trained on what&apos;s already been made. It can remix the past, but it
                can&apos;t feel a demo the way a musician can — the pocket, the breath, the thing you meant
                between the notes. When demos get fed into tools like Suno, and when players are asked to
                chase AI-shaped parts, the soul gets sanded off.
              </p>
              <p>
                RetrackThis is for the opposite of that. Producers, songwriters, and composers post the
                part they need. Real musicians listen, play it on real instruments, and send back takes
                that actually respond to the music. Only the take you pick gets paid. People with skills
                get work. People writing music get human performances again.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-10">
          <Logo />
          <p className="text-sm text-gray-400">Real musicians, no AI performances.</p>
        </div>
      </footer>
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
