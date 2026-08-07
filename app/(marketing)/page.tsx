import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MarketingHeaderActions } from "@/components/MarketingHeaderActions";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-6 sm:py-8">
        <Logo />
        <MarketingHeaderActions />
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:px-6 sm:pb-32 sm:pt-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-accent">For producers, songwriters & composers</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-gray-900 sm:mt-4 sm:text-5xl lg:text-6xl">
              Real musicians. Real takes. You pick your favorite.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-gray-500 sm:mt-6 sm:text-lg">
              Post a demo of the part you need. Working musicians submit their own recorded takes.
              Pick the one you love. Only that musician gets paid.
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
            <h2 className="max-w-md text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
              Money in escrow. Musicians know the gig is real.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600 sm:mt-4 sm:text-base">
              When you post a job, your payment is authorized and held, not charged until you pick a
              winner. Musicians can trust the opportunity is genuine, without the race-to-the-bottom
              dynamics of open bidding platforms.
            </p>
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
