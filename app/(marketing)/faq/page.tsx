import type { Metadata } from "next";
import Link from "next/link";
import { FaqBrowse, type FaqItem } from "@/components/FaqBrowse";
import { MarketingFooter } from "@/components/MarketingFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SLIDER_MIN_USD } from "@/lib/jobPricing";
import { PLATFORM_FEE_PERCENT } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "FAQ · Retrack This",
  description:
    "How payments, awards, payouts, takes, Part/Bed/Both listening, and the pricing calculator work on Retrack This.",
};

const faqItems: FaqItem[] = [
  {
    id: "what-is",
    question: "What is Retrack This?",
    answer: (
      <>
        <p>
          Retrack This is a marketplace where producers can post a part of their song to replace, or
          &quot;retrack,&quot; such as a vocal guide, scratch guitar, MIDI violin, drum loop, and so
          on.
        </p>
        <p>
          Once the producer uploads the necessary tracks, sets a price, and posts the job, musicians
          all over the world can submit multiple takes for a chance at winning the job.
        </p>
        <p>
          As submissions come in, the producer can listen and favorite takes. Jobs stay open until
          the deadline so musicians get the full window. After the deadline, the producer has 48
          hours to award a musician and close the job.
        </p>
      </>
    ),
  },
  {
    id: "payment",
    question: "How does payment work?",
    answer: (
      <>
        <p>
          When a producer posts a job, they pay the full amount up front on Stripe Checkout (card,
          Apple Pay, and other methods Stripe enables). Funds sit on the platform until a winner is
          paid.
        </p>
        <p>
          If you cancel an open job, or if the job expires without a winner, you get a full refund.
        </p>
        <p>
          When you award a musician after the deadline (or we auto-award your favorite after 48
          hours), they are paid from the funds you paid at checkout, minus the platform fee.
        </p>
      </>
    ),
  },
  {
    id: "pricing-calculator",
    question: "How do I know what to charge?",
    answer: (
      <>
        <p>
          Offers are open, so you choose the budget. If you&apos;re not sure what is fair or expected,
          our pricing calculator suggests a range based on three things:
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Instrument type: some parts cost more to record well</li>
          <li>Recording duration: longer parts usually need a higher offer</li>
          <li>Project deadline: tighter windows nudge the suggested range up</li>
        </ol>
        <p>
          The highlighted band is a typical beginner-to-pro range for that combination. You can stay
          inside it, go lower (though you may get fewer takes), or go higher if the project warrants
          it.
        </p>
        <p>
          The minimum amount you can offer is ${SLIDER_MIN_USD}. Type any amount at or above the
          minimum.
        </p>
      </>
    ),
  },
  {
    id: "deadlines-cancel",
    question: "How do deadlines and canceling work?",
    answer: (
      <>
        <p>
          Pick how many days submissions stay open. The job can’t be awarded early - musicians get
          that full window. After the deadline, you have about 48 hours to award a musician (you can
          favorite takes beforehand). If you have a favorite and don’t award in time, we auto-award
          that favorite. If you have no favorite, the job cancels and you’re refunded.
        </p>
        <p>
          You can cancel an open job anytime before it is awarded. That refunds you in full.
        </p>
      </>
    ),
  },
  {
    id: "award",
    question: "What happens when I award a take?",
    answer: (
      <>
        <p>
          While the job is open, use <span className="font-medium">Favorite</span> on one
          submission (all takes in that submission). Favoriting another replaces the previous
          favorite - only one can be saved at a time, so auto-award stays clean.
        </p>
        <p>
          After the deadline, submissions close and you have 48 hours to{" "}
          <span className="font-medium">Award</span> a musician. That pays them and unlocks masters.
          Payment was already collected when you posted.
        </p>
        <p>Make sure you have compared every take in each submission before you lock in a winner.</p>
      </>
    ),
  },
  {
    id: "part-bed-both",
    question: "What are Part, Bed, and Both?",
    answer: (
      <>
        <p>
          Every job can include two references: the Part (the isolated demo to retrack) and the Bed
          (the rest of the track without that part). The player’s Part / Bed / Both toggle is how you
          hear them clearly.
        </p>
        <p>
          <span className="font-medium text-gray-900">Part</span> soloes the demo so musicians can
          lock pitch, feel, and phrasing.{" "}
          <span className="font-medium text-gray-900">Bed</span> plays the arrangement without the
          guide.{" "}
          <span className="font-medium text-gray-900">Both</span> stacks them so you hear how the part
          sits in the song.
        </p>
        <p>
          Producers use the same idea when reviewing takes: they can hear a submission alone, against
          the bed, or both, so that they can hear how it sounds in context before awarding a
          musician.
        </p>
      </>
    ),
  },
  {
    id: "choose-take",
    question: "How should I choose the right take?",
    answer: (
      <>
        <p>
          Start with Both so you hear the take against the bed, then jump to Part or Bed when
          something feels off. Check pitch, timing, tone, and whether it serves the song rather than
          only sounding impressive soloed.
        </p>
        <p>
          Compare a few finalists back to back at similar volumes. Prefer the take you would keep in
          a real mix, not only the flashiest performance.
        </p>
        <p>
          If notes or MIDI came with the submission, use them as supporting context, not a
          substitute for listening in the player.
        </p>
      </>
    ),
  },
  {
    id: "submit-takes",
    question: "How do musicians submit takes?",
    answer: (
      <>
        <p>
          Browse the open jobs, choose one that fits your instrument, listen using the Part / Bed /
          Both toggle, then submit your recording from the job page. You can submit one time per job,
          and you can upload three takes per submission. Submitting is always free.
        </p>
        <p>
          Upload the audio take (WAV preferred; MP3 is fine). You can attach notes, and on some jobs
          additional files like MIDI. You can come back to your submission and replace your files
          later if you need a better export before the job awards or closes.
        </p>
        <p>
          Before you can submit to a job, you need to set up payouts in Settings so we know where to
          send money if you are selected.
        </p>
      </>
    ),
  },
  {
    id: "payouts",
    question: "How do musician payouts work?",
    answer: (
      <>
        <p>
          After you win, payout goes to the method you set up: Stripe Express where it is supported,
          or PayPal / Wise where Stripe payouts are not available (or if you prefer those).
        </p>
        <p>
          Stripe payouts can move automatically once your Connect account is ready. PayPal and Wise
          are paid manually to the email and name you saved; those services may take their own small
          transfer or currency fees.
        </p>
        <p>
          Set this up and edit it in Settings &gt; Payouts. If possible, use the same email and name
          you are using for Retrack This for your PayPal or Wise account. This will make automatic
          payments easier.
        </p>
      </>
    ),
  },
  {
    id: "fees",
    question: "Is there a platform fee?",
    answer: (
      <>
        <p>
          Yes. Retrack This takes {PLATFORM_FEE_PERCENT}% of the job price when a take is awarded.
          The rest goes to the winning musician.
        </p>
        <p>
          Producers see the full offer amount authorized on their card. The fee comes out of that
          amount at award time; it is not an extra charge on top for the producer.
        </p>
      </>
    ),
  },
  {
    id: "files",
    question: "What file formats should I use?",
    answer: (
      <>
        <p>
          MP3 is fine for producers uploading Part and Bed references. WAV is recommended and
          preferred for musicians uploading and submitting takes.
        </p>
        <p>
          For listening on the site, Retrack This automatically creates an MP3 version of the
          musician&apos;s submissions for lighter streaming previews. Once the job is awarded at the
          deadline, the master files become available for download.
        </p>
      </>
    ),
  },
  {
    id: "who-for",
    question: "Who is this for?",
    answer: (
      <>
        <p>
          On one end, this is for producers, composers and songwriters who need a real recorded part
          to replace their demos or scratch tracks. On the other end, this is for session musicians
          and instrumentalists who want clear, paid briefs with references and competitive payouts.
        </p>
        <p>
          Currently, jobs are scoped to a single part of a song, not a multi-track session. That
          keeps briefs tight and turns around faster for both sides.
        </p>
      </>
    ),
  },
  {
    id: "producer-path",
    question: "What’s the path if I’m posting a job?",
    answer: (
      <>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Write the brief, upload Part (and Bed if you have it), set a price and deadline.</li>
          <li>Pay up front on checkout. Until you pay, the gig stays a private draft.</li>
          <li>While it’s open, musicians submit. Favorite the take you like best - you can switch.</li>
          <li>
            After the deadline, you have 48 hours to award. If you already favorited someone and
            don’t click, we’ll award that favorite. If you have no favorite, the job cancels and
            you’re refunded.
          </li>
          <li>You can cancel an open job anytime before award for a refund.</li>
        </ol>
        <p>
          Jobs don’t close early - musicians get the full window you posted. More detail in the{" "}
          <Link href="/faq#payment">payment</Link> and{" "}
          <Link href="/faq#deadlines-cancel">deadlines</Link> answers above.
        </p>
      </>
    ),
  },
  {
    id: "musician-path",
    question: "What’s the path if I’m submitting takes?",
    answer: (
      <>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Create an account and set up payouts in Settings (Stripe, or PayPal / Wise).</li>
          <li>Browse open jobs. Listen with Part / Bed / Both, then submit for free.</li>
          <li>One submission per job (up to three takes). You can replace files while the job is open.</li>
          <li>
            Your submission stays <span className="font-medium">Pending</span> until the job ends.
          </li>
          <li>
            If you win, it shows <span className="font-medium">Awarded</span>, you get paid, and
            masters unlock. If someone else wins: Not selected. If the gig is cancelled: Job
            cancelled.
          </li>
        </ol>
        <p>
          Submitting never costs money. Only awarded takes are paid. See{" "}
          <Link href="/faq#payouts">payouts</Link> for how money reaches you.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    question: "Still have a question?",
    answer: (
      <>
        <p>
          Email{" "}
          <a href="mailto:hello@retrackthis.com">hello@retrackthis.com</a>
          {" "}and we will help. For the legal details, see{" "}
          <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy</Link>.
        </p>
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 pb-16 sm:px-6 sm:pb-24">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Questions.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500 sm:text-base">
          We know this is a unique idea for a marketplace, so let&apos;s talk about how it works.
        </p>

        <FaqBrowse items={faqItems} />
      </main>

      <MarketingFooter />
    </div>
  );
}
