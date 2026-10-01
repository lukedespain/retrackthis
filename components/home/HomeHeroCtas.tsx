"use client";

import Link from "next/link";
import { FIND_WORK_HREF, requestPostJob } from "@/components/MarketingHeroCtas";

/** Opens the post-a-job popup. Guests finish the job, then create an account on Pay. */
export function HomeHeroCtas() {
  return (
    <div className="ctas">
      <button type="button" className="btn primary" onClick={requestPostJob}>
        Post a job
      </button>
      <Link href={FIND_WORK_HREF} className="btn outline">
        Find work
      </Link>
    </div>
  );
}
