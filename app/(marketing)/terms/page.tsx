import { LegalPage, LegalSection } from "@/components/LegalPage";

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" updated="August 12, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of RetrackThis
        (retrackthis.com), a marketplace where creators post short demo parts and musicians submit
        recorded takes. By creating an account or using the service, you agree to these Terms.
      </p>

      <LegalSection title="The service">
        <p>
          RetrackThis lets creators post jobs with a demo file, description, price, and deadline.
          Payment is authorized (held) when a job is posted and only captured when the creator
          awards a winning take. Musicians may browse open jobs and submit takes for free. We take
          a platform fee from awarded jobs; the remainder is transferred to the winning musician
          through Stripe Connect.
        </p>
      </LegalSection>

      <LegalSection title="Accounts">
        <p>
          You must provide accurate account information and keep your login secure. You are
          responsible for activity under your account. You must be old enough to form a binding
          contract in your jurisdiction (and at least 18 if you receive payouts).
        </p>
      </LegalSection>

      <LegalSection title="Creators">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You warrant that you have the rights needed to upload demos and to use awarded takes in
            your projects as you describe when posting.
          </li>
          <li>
            You may upload full-song reference files (the part to retrack and a background bed). You
            remain responsible for having the rights to share that material and to use awarded takes
            as described when posting.
          </li>
          <li>
            Escrow holds are released if you cancel an open job, or if a job expires without an
            award after the grace period.
          </li>
          <li>
            Choosing a winner captures your payment and pays the musician (minus the platform fee).
            Chargebacks and disputes on creator payments are your responsibility as the purchaser
            through our platform, subject to Stripe&apos;s and card-network rules.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Musicians">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Submitting a take is free. You keep rights in your performance except that if your take
            is awarded, you grant the creator a license to use that take in the project associated
            with the job (including editing, mixing, and commercial release of that project), unless
            you and the creator agree otherwise in writing.
          </li>
          <li>
            You must only submit real, live human performances. AI-generated, AI-assisted, or
            generative-tool outputs are not allowed. When you submit, you attest to this. We may
            remove takes or suspend accounts that violate this rule.
          </li>
          <li>
            To receive payouts you must complete Stripe Express onboarding and keep payout details
            current. We are not responsible for delays caused by incomplete Stripe verification.
          </li>
          <li>
            Submitting a take does not guarantee selection or payment. Only awarded takes are paid.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Payments">
        <p>
          Payments are processed by Stripe. Authorization, capture, refunds/cancels, and Connect
          transfers follow Stripe&apos;s systems and timelines. Platform fees are set by RetrackThis
          and may change with notice for future jobs. Past awarded jobs keep the fee in effect when
          they were awarded.
        </p>
      </LegalSection>

      <LegalSection title="Content and conduct">
        <p>
          Do not upload unlawful, infringing, or abusive content. Do not attempt to circumvent
          escrow, fees, or security. We may remove content, cancel jobs, withhold payouts that
          violate these Terms or law, or suspend accounts when we reasonably believe there is fraud,
          abuse, or IP issues.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimers">
        <p>
          The service is provided &quot;as is.&quot; We do not guarantee uninterrupted availability,
          that every take will meet your creative needs, or that every musician or creator will
          behave professionally. To the fullest extent allowed by law, RetrackThis is not liable for
          indirect, incidental, or consequential damages, or for amounts exceeding fees we earned on
          the job giving rise to the claim.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update these Terms. Material changes will be reflected by updating the date above
          and, when practical, a notice on the site. Continued use after changes means you accept
          the updated Terms for future activity.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these Terms:{" "}
          <a className="font-medium text-gray-900 underline-offset-2 hover:underline" href="mailto:hello@retrackthis.com">
            hello@retrackthis.com
          </a>
          .
        </p>
        <p className="text-sm text-gray-400">
          These Terms are a practical starting point for a small marketplace, not a substitute for
          advice from your own lawyer.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
