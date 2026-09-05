import { LegalPage, LegalSection } from "@/components/LegalPage";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 12, 2026">
      <p>
        This Privacy Policy explains what RetrackThis (retrackthis.com) collects and how we use it
        when you browse, create an account, post jobs, or submit takes.
      </p>

      <LegalSection title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-gray-800">Account data:</span> email, name, and
            authentication details managed through Supabase Auth.
          </li>
          <li>
            <span className="font-medium text-gray-800">Job and take content:</span> titles,
            descriptions, demo audio, take audio, notes, instrument tags, tempo, prices, and related
            metadata you submit.
          </li>
          <li>
            <span className="font-medium text-gray-800">Payment data:</span> payment and payout
            processing is handled by Stripe. We store Stripe identifiers and payment status needed to
            run escrow and awards. We do not store full card numbers on our servers.
          </li>
          <li>
            <span className="font-medium text-gray-800">Usage data:</span> basic technical logs such
            as IP address, device/browser info, and pages requested, as provided by our hosting
            provider (for example Vercel) for security and reliability.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use information">
        <ul className="list-disc space-y-2 pl-5">
          <li>Operate the marketplace (posting jobs, submitting takes, awarding winners).</li>
          <li>Process authorizations, captures, refunds, and musician payouts via Stripe.</li>
          <li>Enforce our human-performance rules and Terms of Service.</li>
          <li>Secure the service, prevent fraud, and debug outages.</li>
          <li>
            Send email alerts you can turn off (new matching jobs, new takes on your jobs, award/cancel
            outcomes) based on the preferences you set in Settings.
          </li>
          <li>Communicate about your account, jobs, or important service changes.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Sharing">
        <p>We share data only as needed to run the product:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-gray-800">Stripe</span> for payments and Connect
            payouts.
          </li>
          <li>
            <span className="font-medium text-gray-800">Supabase</span> for authentication, database,
            and audio file storage.
          </li>
          <li>
            <span className="font-medium text-gray-800">Hosting/infrastructure</span> providers that
            process requests for the site.
          </li>
          <li>When required by law, or to protect rights, safety, and the integrity of the service.</li>
        </ul>
        <p className="mt-3">
          Creators can hear takes submitted to their jobs. Awarded takes may be downloaded by the
          creator. We do not sell your personal information.
        </p>
      </LegalSection>

      <LegalSection title="Retention">
        <p>
          We keep account, job, take, and payment records as long as needed to operate the service,
          handle disputes, and meet legal/accounting requirements. You can ask us to delete your
          account; some records may remain where we must retain them (for example payment history).
        </p>
      </LegalSection>

      <LegalSection title="Cookies and sessions">
        <p>
          We use session cookies / auth cookies so you can stay signed in. We do not run a separate
          advertising tracker network on the marketing site today.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can update your profile name, manage payout details in Stripe Express, and contact us
          to request access or deletion of account data we control. Stripe and Supabase also process
          data under their own policies for the services they provide.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          RetrackThis is not directed at children under 13, and we do not knowingly collect personal
          information from them.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy and will change the date above when we do. Continued use after
          an update means you acknowledge the revised policy.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Privacy questions:{" "}
          <a className="font-medium text-gray-900 underline-offset-2 hover:underline" href="mailto:hello@retrackthis.com">
            hello@retrackthis.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
