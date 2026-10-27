// Marks a job posted from the Retrack This Bridge DAW plugin: a small plug badge
// on the instrument icon, and "Sent from Logic Pro" after "Posted by".

export function PlugIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 3v4M15 3v4" />
      <path d="M7 7h10v4a5 5 0 01-10 0z" />
      <path d="M12 16v2a3 3 0 003 3h2" />
    </svg>
  );
}

/** Corner badge for .job-ico. */
export function BridgeDot({ from }: { from: string }) {
  const label = `Posted from ${from} with Retrack This Bridge`;
  return (
    <span className="bridge-dot" title={label} aria-label={label} role="img">
      <PlugIcon size={11} />
    </span>
  );
}

/** Follows "Posted by …". */
export function SentFrom({ from }: { from: string }) {
  return (
    <span className="sent-from" title="Posted with the Retrack This Bridge plugin">
      <span aria-hidden="true">·</span>
      <PlugIcon size={13} />
      Sent from {from}
    </span>
  );
}
