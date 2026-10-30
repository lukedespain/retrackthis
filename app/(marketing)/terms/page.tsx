import { LegalPage, LegalSection } from "@/components/LegalPage";

const list = "list-disc space-y-2 pl-5";

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" updated="October 11, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) are an agreement between you and RetrackThis
        (&quot;RetrackThis,&quot; &quot;we,&quot; &quot;us&quot;) and govern your use of
        retrackthis.com and related services (the &quot;Service&quot;). By creating an account,
        posting a job, submitting a take, or otherwise using the Service, you agree to these Terms.
        If you do not agree, do not use the Service.
      </p>

      <LegalSection title="1. Definitions">
        <ul className={list}>
          <li>
            A <strong>Producer</strong> is a user who posts a job. A <strong>Musician</strong> is a
            user who submits a take. One account may act as both.
          </li>
          <li>
            A <strong>Job</strong> is a request to record a part, with a price and a deadline.
          </li>
          <li>
            <strong>Producer Materials</strong> are everything a Producer supplies with a Job,
            including demos, reference files, background beds, descriptions, and the underlying
            song, melody, lyrics, arrangement, and ideas.
          </li>
          <li>
            A <strong>Take</strong> is a recording a Musician submits to a Job. A{" "}
            <strong>Picked Take</strong> is a Take that is picked, by the Producer or automatically
            under Section 4, and for which payment is released to the Musician.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. The Service">
        <p>
          RetrackThis is a marketplace that connects Producers and Musicians. We are not a party to
          the agreement between a Producer and a Musician for a Take, we do not employ Musicians,
          and we do not guarantee the quality, timing, or outcome of any Job or Take.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts">
        <ul className={list}>
          <li>
            You must give accurate information and keep your login secure. You are responsible for
            all activity under your account.
          </li>
          <li>
            You must be old enough to form a binding contract where you live, and at least 18 to
            receive payouts.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Jobs, picks, and refunds">
        <ul className={list}>
          <li>
            A Producer pays the full Job price up front through Stripe Checkout when posting a Job.
          </li>
          <li>
            Each Musician may submit once to a Job, with up to two Takes. Submitting is free and
            does not guarantee selection or payment. Only Picked Takes are paid.
          </li>
          <li>
            A Producer may mark a favorite before the deadline and may change it until picking. The
            Producer picks after the deadline. If the Producer does not pick within 48 hours after
            the deadline, the saved favorite is picked automatically.
          </li>
          <li>
            The Job price is refunded to the Producer if the Producer cancels an open Job before a
            pick, or if the Job closes without a pick (for example, no Takes or no favorite).
          </li>
          <li>When a Take is picked, the Musician is paid the Job price minus the platform fee.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Producer Materials">
        <ul className={list}>
          <li>
            Producers keep all rights in their Producer Materials. Nothing in these Terms, and no
            Take, gives any Musician or other person any right in them, whether or not a Take is
            picked.
          </li>
          <li>
            A Producer grants Musicians who access a Job a limited, non-exclusive, revocable right
            to use its Producer Materials only to record and submit a Take for that Job.
          </li>
          <li>
            Demos may be heard without an account. Hearing them grants no right to use them. No one
            may copy, record, download, share, release, or reuse Producer Materials, or any song or
            idea in them, except to submit a Take to that Job.
          </li>
          <li>
            Producers represent that they own or have permission to use and share their Producer
            Materials, and to have Takes recorded and used as described in these Terms.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Ownership of Picked Takes">
        <ul className={list}>
          <li>
            <strong>Assignment.</strong> When payment for a Picked Take is released to the Musician,
            the Musician assigns to the Producer all right, title, and interest worldwide in that
            Take, including the sound recording and all copyrights and other rights in the
            performance, for the full term of those rights. The Producer may use, edit, mix, sample,
            release, license, and otherwise exploit the Picked Take in any project and any medium,
            now known or later developed, without further permission or payment. This is a full
            buyout.
          </li>
          <li>
            <strong>Full payment.</strong> The Job price paid to the Musician is full compensation
            for the Picked Take. No royalties, backend, residuals, or other payments are owed by the
            Producer or RetrackThis.
          </li>
          <li>
            <strong>Credit.</strong> Credit is optional and at the Producer&apos;s choice. To the
            extent the law allows, the Musician waives, and agrees not to assert, any moral rights
            or similar rights in the Picked Take, including any right to be credited or to object to
            changes. The Producer may use the Musician&apos;s name to credit the Take, but not to
            suggest the Musician endorses anything.
          </li>
          <li>
            <strong>Backup license.</strong> If any part of the assignment cannot be made under
            applicable law, the Musician grants the Producer an exclusive, perpetual, irrevocable,
            worldwide, royalty-free, transferable license to that part with the same scope.
          </li>
          <li>
            <strong>Further steps.</strong> The Musician will sign any reasonable document the
            Producer requests to confirm the Producer&apos;s ownership of a Picked Take.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Takes that are not picked">
        <ul className={list}>
          <li>
            No rights in a Take pass to a Producer unless it becomes a Picked Take. If a Job is
            canceled or closes without a pick, no rights in any of its Takes pass to the Producer.
          </li>
          <li>
            A Producer may listen to Takes submitted to their Job only to decide which to pick. A
            Producer may not download, record, copy, keep, or use any Take that is not their Picked
            Take, or any part of one, in any form.
          </li>
          <li>
            A Musician keeps their recording of a Take that is not picked. Because it is built on
            the Producer Materials, the Musician may not release, sell, license, or otherwise use it
            outside the Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Musician promises">
        <ul className={list}>
          <li>
            Each Take is a real, live human performance by you. AI-generated, AI-assisted, or
            generative-tool output is not allowed, and you confirm this each time you submit.
          </li>
          <li>
            Each Take is your own work, you are free to assign it, and it contains no samples, loops,
            or other material you do not have the right to transfer.
          </li>
          <li>
            You are responsible for completing Stripe payout setup, keeping payout details current,
            and paying any taxes on what you earn. We are not responsible for delays caused by
            incomplete payout setup.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Payments and fees">
        <ul className={list}>
          <li>
            Payments, refunds, and payouts are processed by Stripe and are subject to Stripe&apos;s
            terms, systems, and timelines.
          </li>
          <li>
            RetrackThis sets the platform fee and may change it from time to time. The fee that
            applies to a Job is the one in effect when the Job is picked.
          </li>
          <li>
            Producers are responsible for chargebacks and payment disputes on their payments,
            subject to Stripe and card-network rules.
          </li>
          <li>You may not arrange to pay or be paid for a Job outside the Service to avoid fees.</li>
        </ul>
      </LegalSection>

      <LegalSection title="10. Our license to operate the Service">
        <p>
          You grant RetrackThis a non-exclusive, worldwide, royalty-free license to host, store,
          copy, stream, and display content you upload, only as needed to operate the Service. This
          license ends when the content is removed from the Service, except for backups kept for a
          limited time and records we must keep by law.
        </p>
      </LegalSection>

      <LegalSection title="11. Conduct and enforcement">
        <ul className={list}>
          <li>
            Do not upload unlawful, infringing, or abusive content, or try to bypass payments, fees,
            or security.
          </li>
          <li>
            We may remove content, cancel Jobs, withhold or reverse payouts, and suspend or close
            accounts when we reasonably believe these Terms or the law have been broken, including
            for fraud, abuse, or intellectual property violations.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="12. Disclaimers and limitation of liability">
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available,&quot; without
          warranties of any kind. We do not guarantee uninterrupted availability, that any Take will
          meet your needs, or that any user will act professionally or follow these Terms. To the
          fullest extent the law allows, RetrackThis is not liable for indirect, incidental,
          special, or consequential damages, or for any amount greater than the fees we earned on
          the Job giving rise to the claim.
        </p>
      </LegalSection>

      <LegalSection title="13. Indemnity">
        <p>
          You agree to defend and hold harmless RetrackThis from claims, losses, and costs arising
          from content you upload, your breach of these Terms, or your violation of anyone
          else&apos;s rights.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes">
        <p>
          We may update these Terms. When we do, we will update the date above. Continued use of the
          Service after an update means you accept the updated Terms. Updates do not change the
          ownership of any Take picked before the update.
        </p>
      </LegalSection>

      <LegalSection title="15. General">
        <p>
          If any part of these Terms is found unenforceable, the rest stays in effect. Not enforcing
          a provision is not a waiver of it. Sections 5 through 7, 12, and 13 continue to apply after
          you stop using the Service or close your account.
        </p>
      </LegalSection>

      <LegalSection title="16. Contact">
        <p>
          Questions about these Terms:{" "}
          <a className="font-medium text-gray-900 underline-offset-2 hover:underline" href="mailto:hello@retrackthis.com">
            hello@retrackthis.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
