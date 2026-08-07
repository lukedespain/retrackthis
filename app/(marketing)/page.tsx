import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <header className="flex items-center justify-between py-8">
        <span className="text-lg font-semibold tracking-tight">retrackthis</span>
        <Link href="/sign-in">
          <Button variant="ghost">Sign in</Button>
        </Link>
      </header>

      <section className="flex flex-col items-start gap-6 py-24">
        <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-tight text-gray-900">
          Real musicians. Real takes. You pick your favorite.
        </h1>
        <p className="max-w-xl text-lg text-gray-500">
          Post a demo of the part you need — a bass line, a guitar solo, a string arrangement.
          Working musicians submit their own recorded takes. Pick the one you love, and only
          that musician gets paid.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/sign-up">
            <Button>Post a job</Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="secondary">Find work</Button>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-10 border-t border-gray-100 py-20 sm:grid-cols-3">
        <Step
          number="01"
          title="Post the part"
          body="Upload a demo — even just a MIDI scratch track — describe what you need, and set a price."
        />
        <Step
          number="02"
          title="Musicians submit takes"
          body="Real musicians record and upload their own version of the part. No cost to try."
        />
        <Step
          number="03"
          title="Pick your favorite"
          body="Listen to every take, choose the one that fits, and that musician gets paid instantly."
        />
      </section>

      <footer className="border-t border-gray-100 py-10 text-sm text-gray-400">
        retrackthis.com — real musicians, no AI performances.
      </footer>
    </main>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div>
      <div className="text-sm font-medium text-accent">{number}</div>
      <h3 className="mt-2 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{body}</p>
    </div>
  );
}
