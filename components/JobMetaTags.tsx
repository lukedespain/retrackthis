import { formatCents, formatDeadline } from "@/lib/format";
import { emojiForInstrument } from "@/lib/instruments";

function MetaTag({
  emoji,
  children,
  className,
}: {
  emoji?: string;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {emoji ? <span aria-hidden="true">{emoji}</span> : null}
      <span>{children}</span>
    </span>
  );
}

export function JobMetaTags({
  instrument,
  priceCents,
  deadline,
  takeCount,
  showDeadline = true,
}: {
  instrument: string;
  priceCents: number;
  deadline?: string | Date;
  takeCount?: number;
  showDeadline?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <MetaTag
        emoji={emojiForInstrument(instrument)}
        className="bg-white text-gray-900 ring-gray-900/15 dark:ring-white/15"
      >
        {instrument}
      </MetaTag>
      <MetaTag emoji="💵" className="bg-emerald-50 text-emerald-800 ring-emerald-600/10">
        {formatCents(priceCents)}
      </MetaTag>
      {showDeadline && deadline && (
        <MetaTag emoji="📅" className="bg-blue-50 text-blue-800 ring-blue-600/10">
          {formatDeadline(deadline)}
        </MetaTag>
      )}
      {typeof takeCount === "number" && (
        <MetaTag
          emoji="🎧"
          className={
            takeCount > 0
              ? "bg-violet-50 text-violet-800 ring-violet-600/10 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-400/20"
              : "bg-gray-50 text-gray-500 ring-gray-500/10 dark:bg-gray-900 dark:text-gray-400"
          }
        >
          {takeCount === 0 ? "No takes yet" : takeCount === 1 ? "1 take" : `${takeCount} takes`}
        </MetaTag>
      )}
    </div>
  );
}

/** Tempo lives in expanded detail — not on the collapsed card preview. */
export function TempoTag({ bpm }: { bpm?: number | null }) {
  if (bpm === null || bpm === undefined) {
    return (
      <MetaTag emoji="🌊" className="bg-white text-gray-900 ring-gray-900/15 dark:ring-white/15">
        Flexible tempo
      </MetaTag>
    );
  }
  return (
    <MetaTag emoji="⏱️" className="bg-white text-gray-900 ring-gray-900/15 dark:ring-white/15">
      {bpm} BPM
    </MetaTag>
  );
}
