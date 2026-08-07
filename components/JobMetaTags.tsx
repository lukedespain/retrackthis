import { formatCents, formatDeadline } from "@/lib/format";
import { styleForInstrument } from "@/lib/instruments";

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
  bpm,
  showDeadline = true,
}: {
  instrument: string;
  priceCents: number;
  deadline?: string | Date;
  /** null/undefined = flexible (relative) tempo; number = fixed BPM */
  bpm?: number | null;
  showDeadline?: boolean;
}) {
  const instrumentStyle = styleForInstrument(instrument);

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* Instrument: color only — emoji sets aren't unique enough across instruments */}
      <MetaTag className={instrumentStyle.className}>{instrument}</MetaTag>
      <MetaTag emoji="💵" className="bg-emerald-50 text-emerald-800 ring-emerald-600/10">
        {formatCents(priceCents)}
      </MetaTag>
      {showDeadline && deadline && (
        <MetaTag emoji="📅" className="bg-blue-50 text-blue-800 ring-blue-600/10">
          {formatDeadline(deadline)}
        </MetaTag>
      )}
      {bpm === null || bpm === undefined ? (
        <MetaTag emoji="🌊" className="bg-purple-50 text-purple-800 ring-purple-600/10">
          Flexible tempo
        </MetaTag>
      ) : (
        <MetaTag emoji="⏱️" className="bg-purple-50 text-purple-800 ring-purple-600/10">
          {bpm} BPM
        </MetaTag>
      )}
    </div>
  );
}
