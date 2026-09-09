"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CreatorView } from "@/app/dashboard/CreatorView";
import { SiteHeader } from "@/components/SiteHeader";
import { Spinner } from "@/components/ui/Spinner";

type CreatorInfo = { id: string; name: string; email: string };

export default function AdminProducerPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <SiteHeader />
          <main className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
            <div className="flex justify-center py-24">
              <Spinner />
            </div>
          </main>
        </div>
      }
    >
      <AdminProducerPreviewInner />
    </Suspense>
  );
}

function AdminProducerPreviewInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const creatorId = String(params.creatorId ?? "");
  const focusJobId = searchParams.get("job");
  const [creator, setCreator] = useState<CreatorInfo | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/creators/${creatorId}/jobs`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Could not load producer preview");
        if (!cancelled) setCreator(body.creator);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load preview");
          setCreator(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-2 sm:px-6 sm:pb-24 sm:pt-4">
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Preview as producer · view only
          </p>
          <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/90">
            You&apos;re seeing this member&apos;s My jobs experience. Listening works; edit, cancel,
            and award stay disabled.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/admin?tab=jobs" className="font-medium text-amber-900 underline-offset-2 hover:underline dark:text-amber-200">
              ← Back to Admin jobs
            </Link>
            {creator && (
              <span className="text-amber-800/80 dark:text-amber-300/80">
                {creator.name} · {creator.email}
              </span>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {creator === undefined && (
          <div className="flex justify-center py-24">
            <Spinner />
          </div>
        )}

        {creator && (
          <CreatorView
            hideHeading
            hidePostButton
            readOnly
            jobsUrl={`/api/admin/creators/${creatorId}/jobs`}
            initialExpandedJobId={focusJobId}
          />
        )}
      </main>
    </div>
  );
}
