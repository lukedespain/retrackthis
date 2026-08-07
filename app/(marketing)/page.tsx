import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
        <Logo />
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pb-32 pt-16 sm:pt-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-accent">For producers, songwriters & composers</p>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.1] tracking-tight text-gray-900 sm:text-6xl">
              Real musicians. Real takes. You pick your favorite.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-500">
              Post a demo of the part you need. Working musicians submit their own recorded takes.
              Pick the one you love — only that musician gets paid.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/sign-up">
                <Button>Post a job</Button>
              </Link>
              <Link href="/sign-up">
                <Button variant="secondary">Find work</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-gray-100 bg-surface">
          <div className="mx-auto max-w-5xl px-6 py-24">
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">How it works</h2>
            <div className="mt-12 grid grid-cols-1 gap-16 sm:grid-cols-3">
              <Step
                number="01"
                title="Post the part"
                body="Upload a demo — even just a MIDI scratch track — describe what you need, set a price, and your payment is held in escrow."
              />
              <Step
                number="02"
                title="Musicians submit takes"
                body="Real musicians record and upload their own version of the part. Free to try — no cost to submit."
              />
              <Step
                number="03"
                title="Pick your favorite"
                body="Listen to every take, choose the one that fits, and that musician gets paid instantly."
              />
            </div>
          </div>
        </section>

        {/* Value prop */}
        <section className="mx-auto max-w-5xl px-6 py-24">
          <div className="rounded-3xl bg-accent-muted px-8 py-16 sm:px-16">
            <h2 className="max-w-md text-2xl font-semibold tracking-tight text-gray-900">
              Money in escrow. Musicians know the gig is real.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-gray-600">
              When you post a job, your payment is authorized and held — not charged until you pick a
              winner. Musicians can trust the opportunity is genuine, without the race-to-the-bottom
              dynamics of open bidding platforms.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-10">
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
      <h3 className="mt-3 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
    </div>
  );
}
