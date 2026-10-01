"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const OPEN_POST_JOB = "rt-open-post-job";
export const JOB_POSTED = "rt-job-posted";

/** Opens the Post a job popup for everyone. Account is asked on the Pay step. */
export function requestPostJob() {
  window.dispatchEvent(new Event(OPEN_POST_JOB));
}

export const POST_JOB_HREF = "/producers?tab=post";
export const SIGN_UP_TO_POST_HREF = `/sign-up?next=${encodeURIComponent(POST_JOB_HREF)}`;
export const FIND_WORK_HREF = "/musicians";

/** Homepage CTAs. Post a job opens the popup; guests create an account on Pay. */
export function MarketingHeroCtas() {
  return (
    <div className="mt-8 flex flex-col gap-2 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-3">
      <Button className="w-full sm:w-auto" onClick={requestPostJob}>
        Post a job
      </Button>
      <Link href={FIND_WORK_HREF} className="w-full sm:w-auto">
        <Button variant="outline" className="w-full sm:w-auto">
          Find work
        </Button>
      </Link>
    </div>
  );
}
