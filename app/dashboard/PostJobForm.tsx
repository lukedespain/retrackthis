"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileUpload } from "@/components/FileUpload";
import { ReferenceTracksPlayer } from "@/components/ReferenceTracksPlayer";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AUDIO_FILE_ACCEPT } from "@/lib/constants";
import { formatCents } from "@/lib/format";
import {
  displayLabelForInstrumentId,
  isTestInstrumentId,
  labelForInstrumentId,
  TEST_INSTRUMENT_ID,
} from "@/lib/instruments";
import { MUSICAL_KEYS } from "@/lib/musicalKeys";
import {
  DEFAULT_DEADLINE_DAYS,
  POST_DEADLINE_MAX_DAYS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  MIN_PRICE_CENTS,
  SLIDER_MIN_USD,
  formatPartDuration,
} from "@/lib/jobPricing";
import { InstrumentTypeahead } from "@/components/InstrumentTypeahead";
import { SongPad } from "@/components/brand/SongPad";
import { JOB_POSTED } from "@/components/MarketingHeroCtas";
import { JobCheckoutEmbed } from "./JobCheckoutEmbed";
import { JobPricingFields } from "./JobPricingFields";

const STEPS = ["Song", "Parts", "Preview", "Pay"];

type ExtraPart = {
  key: string;
  instrumentId: string | null;
  demoFileUrl: string | null;
  backingFileUrl: string | null;
  notes: string;
  durationSeconds: number | null;
  fileDurationSeconds: number | null;
  deadlineDays: number;
  priceDollars: number;
};

function blankPart(): ExtraPart {
  return {
    key: Math.random().toString(36).slice(2),
    instrumentId: null,
    demoFileUrl: null,
    backingFileUrl: null,
    notes: "",
    durationSeconds: null,
    fileDurationSeconds: null,
    deadlineDays: DEFAULT_DEADLINE_DAYS,
    priceDollars: SLIDER_MIN_USD,
  };
}

function ModalFrame({
  step,
  title,
  onClose,
  footer,
  children,
}: {
  step: number;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="scrim on" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-job-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mh">
          <div className="prog" aria-label={`Step ${step} of 4`}>
            {STEPS.map((name, i) => (
              <i key={name}>
                <b style={{ width: i < step ? "100%" : "0%" }} />
              </i>
            ))}
          </div>
          <div className="mh-row">
            <h2 className="mh-title" id="post-job-title">
              {title}
            </h2>
            <button type="button" className="icon" aria-label="Close" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mb">{children}</div>
        {footer ? <div className="mf">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export function PostJobForm({ onPosted, onCancel }: { onPosted: () => void; onCancel: () => void }) {
  const [priceDollars, setPriceDollars] = useState(SLIDER_MIN_USD);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutAmountCents, setCheckoutAmountCents] = useState<number | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  async function discardDraft() {
    if (pendingJobId) {
      await fetch(`/api/jobs/${pendingJobId}/cancel`, { method: "POST" }).catch(() => {});
    }
    setClientSecret(null);
    setCheckoutAmountCents(null);
    setPendingJobId(null);
    onCancel();
  }

  if (clientSecret) {
    return (
      <ModalFrame step={4} title="Pay" onClose={discardDraft}>
        <JobCheckoutEmbed
          clientSecret={clientSecret}
          amountLabel={checkoutAmountCents != null ? formatCents(checkoutAmountCents) : undefined}
          onSaveForLater={() => {
            setClientSecret(null);
            setCheckoutAmountCents(null);
            setPendingJobId(null);
            window.dispatchEvent(new Event(JOB_POSTED));
            onPosted();
          }}
          onDiscard={discardDraft}
        />
      </ModalFrame>
    );
  }

  return (
      <PostJobFormInner
        priceDollars={priceDollars}
        onPriceChange={setPriceDollars}
        onPosted={onPosted}
        onCancel={onCancel}
        onCheckoutReady={({ clientSecret: secret, jobId, amountCents }) => {
          setClientSecret(secret);
          setPendingJobId(jobId);
          setCheckoutAmountCents(amountCents);
        }}
      />
  );
}

type PostJobFormInnerProps = {
  priceDollars: number;
  onPriceChange: (n: number) => void;
  onPosted: () => void;
  onCancel: () => void;
  onCheckoutReady: (opts: { clientSecret: string; jobId: string; amountCents: number }) => void;
};

function PostJobFormInner({
  priceDollars,
  onPriceChange,
  onPosted,
  onCancel,
  onCheckoutReady,
}: PostJobFormInnerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoFileUrl, setDemoFileUrl] = useState<string | null>(null);
  const [backingFileUrl, setBackingFileUrl] = useState<string | null>(null);
  const [fixedTempo, setFixedTempo] = useState(true);
  const [instrumentId, setInstrumentId] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [partFileSeconds, setPartFileSeconds] = useState<number | null>(null);
  const durationUserSetRef = useRef(false);
  const [editLen, setEditLen] = useState(false);
  const [more, setMore] = useState<ExtraPart[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [deadlineText, setDeadlineText] = useState(String(DEFAULT_DEADLINE_DAYS));
  const [availableIds, setAvailableIds] = useState<Set<string>>(new Set());
  const [networkLoaded, setNetworkLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const isTestJob = isTestInstrumentId(instrumentId);
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setIsAdmin(Boolean(body?.profile?.isAdmin)))
      .catch(() => setIsAdmin(false));
  }, []);

  const handlePriceChange = useCallback(
    (n: number) => {
      onPriceChange(n);
    },
    [onPriceChange]
  );

  const handleDurationChange = useCallback((seconds: number) => {
    durationUserSetRef.current = true;
    setDurationSeconds(seconds);
  }, []);

  useEffect(() => {
    fetch("/api/instruments")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const ids = new Set<string>((body?.available ?? []).map((item: { id: string }) => item.id));
        setAvailableIds(ids);
      })
      .catch(() => setAvailableIds(new Set()))
      .finally(() => setNetworkLoaded(true));
  }, []);

  const showNetworkGap =
    Boolean(instrumentId) && !isTestJob && networkLoaded && !availableIds.has(instrumentId!);

  function collectInviteEmails() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid invite email, or leave it blank.");
    }
    return [email];
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step !== 4) {
      continueStep();
      return;
    }
    setError(null);

    if (!instrumentId) {
      setError("Pick an instrument for this job.");
      return;
    }

    if (!demoFileUrl) {
      setError("Upload the part being retracked (e.g. vocal demo only).");
      return;
    }

    if (
      durationSeconds == null ||
      durationSeconds < MIN_DURATION_SECONDS ||
      durationSeconds > MAX_DURATION_SECONDS
    ) {
      setError("Set how long the musician will play (part length).");
      return;
    }

    if (!Number.isFinite(priceDollars) || priceDollars < SLIDER_MIN_USD) {
      setError(`Price must be at least $${SLIDER_MIN_USD}.`);
      return;
    }

    const deadlineCheck = Number(deadlineText);
    if (
      !Number.isFinite(deadlineCheck) ||
      deadlineCheck < 1 ||
      deadlineCheck > POST_DEADLINE_MAX_DAYS
    ) {
      setError(`Deadline must be between 1 and ${POST_DEADLINE_MAX_DAYS} days.`);
      return;
    }
    for (const part of more) {
      if (!part.instrumentId || !part.demoFileUrl || !part.notes.trim()) {
        setError("Each part needs an instrument, a Part file, and notes.");
        return;
      }
      if (
        part.durationSeconds == null ||
        part.durationSeconds < MIN_DURATION_SECONDS ||
        part.priceDollars < SLIDER_MIN_USD
      ) {
        setError("Each part needs a length and a budget.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const form = new FormData(e.currentTarget);
      const price = Number(form.get("price"));
      const deadlineDays = Math.min(
        POST_DEADLINE_MAX_DAYS,
        Math.max(1, Math.round(Number(deadlineText)))
      );
      const bpmRaw = form.get("bpm");
      const musicalKeyRaw = String(form.get("musicalKey") ?? "").trim();
      const invites = collectInviteEmails();

      const firstPart = {
        instrumentId,
        description: form.get("description"),
        demoFileUrl,
        backingFileUrl,
        priceCents: Math.round(price * 100),
        durationSeconds,
        deadline: new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString(),
      };
      const payload =
        more.length > 0
          ? {
              title: form.get("title"),
              musicalKey: musicalKeyRaw || null,
              bpm: fixedTempo ? Number(bpmRaw) : null,
              inviteEmails: invites,
              parts: [
                firstPart,
                ...more.map((part) => ({
                  instrumentId: part.instrumentId,
                  description: part.notes,
                  demoFileUrl: part.demoFileUrl,
                  backingFileUrl: part.backingFileUrl,
                  priceCents: Math.round(part.priceDollars * 100),
                  durationSeconds: part.durationSeconds,
                  deadline: new Date(
                    Date.now() + part.deadlineDays * 24 * 60 * 60 * 1000
                  ).toISOString(),
                })),
              ],
            }
          : {
              title: form.get("title"),
              instrumentId,
              instrument: labelForInstrumentId(instrumentId),
              description: form.get("description"),
              demoFileUrl,
              backingFileUrl,
              priceCents: Math.round(price * 100),
              durationSeconds,
              musicalKey: musicalKeyRaw || null,
              bpm: fixedTempo ? Number(bpmRaw) : null,
              deadline: new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString(),
              inviteEmails: invites,
            };
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      if (body?.clientSecret && typeof body.clientSecret === "string" && body.id) {
        onCheckoutReady({
          clientSecret: body.clientSecret,
          jobId: body.id,
          amountCents:
            body.amountCents ??
            Math.round(price * 100) +
              more.reduce((sum, part) => sum + Math.round(part.priceDollars * 100), 0),
        });
        return;
      }

      window.dispatchEvent(new Event(JOB_POSTED));
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function field(name: string) {
    if (!formRef.current) return "";
    return String(new FormData(formRef.current).get(name) ?? "").trim();
  }

  function stepValid(n: number) {
    if (n === 1) {
      if (!field("title")) return false;
      if (fixedTempo && !(Number(field("bpm")) > 0)) return false;
      return true;
    }
    if (n === 2) {
      if (!instrumentId || !demoFileUrl || !field("description")) return false;
      if (
        durationSeconds == null ||
        durationSeconds < MIN_DURATION_SECONDS ||
        durationSeconds > MAX_DURATION_SECONDS
      ) {
        return false;
      }
      const days = Number(deadlineText);
      if (!Number.isFinite(days) || days < 1 || days > POST_DEADLINE_MAX_DAYS) return false;
      if (!Number.isFinite(priceDollars) || priceDollars < SLIDER_MIN_USD) return false;
      return more.every(
        (part) =>
          Boolean(part.instrumentId && part.demoFileUrl && part.notes.trim()) &&
          part.durationSeconds != null &&
          part.durationSeconds >= MIN_DURATION_SECONDS &&
          part.priceDollars >= SLIDER_MIN_USD &&
          part.deadlineDays >= 1 &&
          part.deadlineDays <= POST_DEADLINE_MAX_DAYS
      );
    }
    return true;
  }

  function continueStep() {
    if (!stepValid(step)) {
      setTried(true);
      return;
    }
    setTried(false);
    setStep((n) => Math.min(4, n + 1));
  }

  const previewTitle = step >= 3 ? field("title") : "";
  const previewKey = step >= 3 ? field("musicalKey") : "";
  const previewBpm = step >= 3 && fixedTempo ? field("bpm") : "";

  return (
    <ModalFrame
      step={step}
      title={STEPS[step - 1]}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn text" onClick={onCancel}>
            Save & exit
          </button>
          <div className="mf-right">
            {step > 1 ? (
              <button
                type="button"
                className="icon"
                aria-label="Back"
                style={{ width: 44, height: 44, background: "var(--soft)" }}
                onClick={() => {
                  setTried(false);
                  setStep((n) => n - 1);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            ) : null}
            {step < 4 ? (
              <button
                type="button"
                className="btn primary"
                onClick={continueStep}
              >
                Continue
              </button>
            ) : (
              <button type="submit" form="post-job-form" className="btn primary" disabled={submitting}>
                {submitting
                  ? "Paying"
                  : isTestJob
                    ? "Post test job"
                    : `Pay $${priceDollars + more.reduce((sum, part) => sum + part.priceDollars, 0)}`}
              </button>
            )}
          </div>
        </>
      }
    >
    <form id="post-job-form" ref={formRef} onSubmit={handleSubmit}>
      <SongPad hidden={step !== 1} musicalKey={musicalKey} fixedTempo={fixedTempo}>
          <Input
            label="Title"
            name="title"
            placeholder="Song title"
            required
            className="[&_input]:!h-16 [&_input]:!rounded-2xl [&_input]:!px-[18px] [&_input]:!text-[26px] [&_input]:!font-medium [&_input]:tracking-[-0.025em]"
          />

          <div className="grid2">
            <div className="fld">
              <label className="lbl" htmlFor="musicalKey">Key</label>
              <div className="sel">
                <select
                  id="musicalKey"
                  name="musicalKey"
                  className="in"
                  value={musicalKey}
                  onChange={(e) => setMusicalKey(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Not set</option>
                  {MUSICAL_KEYS.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.label}
                    </option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
            <div className="fld">
              <div className="lbl-row">
                <label className="lbl" htmlFor="f-bpm">Tempo{fixedTempo ? <span className="req">*</span> : null}</label>
                <label className="check">
                  <input type="checkbox" checked={!fixedTempo} onChange={() => setFixedTempo((v) => !v)} /> Not fixed
                </label>
              </div>
              <div className={`suffix${fixedTempo ? "" : " off"}`}>
                <input
                  id="f-bpm"
                  name="bpm"
                  className="in"
                  inputMode="numeric"
                  defaultValue="120"
                  placeholder={fixedTempo ? "120" : "—"}
                  disabled={!fixedTempo || submitting}
                  required={fixedTempo}
                />
                <span>BPM</span>
              </div>
            </div>
          </div>
          {tried && step === 1 && !stepValid(1) ? (
            <Alert variant="error">Add a title{fixedTempo ? " and a tempo" : ""} to continue.</Alert>
          ) : null}
      </SongPad>

      <div className="stack" hidden={step !== 2}>
        <section className="pcard open">
          <div className="pcard-head">
            <span className="pnum">Part 1</span>
          </div>
          <div className="fld">
            <label className="lbl">
              Instrument<span className="req">*</span>
            </label>
            <InstrumentTypeahead
              variant="combo"
              selectedId={isTestJob ? null : instrumentId}
              onChange={setInstrumentId}
              disabled={submitting}
            />
          </div>
          <div className="fld">
            <div className="tiles">
              <FileUpload
                tile
                required
                label="Part"
                kind="demo"
                accept={AUDIO_FILE_ACCEPT}
                onClear={() => {
                  setDemoFileUrl(null);
                  setPartFileSeconds(null);
                  if (!durationUserSetRef.current) setDurationSeconds(null);
                }}
                onUploaded={(url, meta) => {
                  setDemoFileUrl(url);
                  if (typeof meta?.fileDurationSeconds === "number") {
                    setPartFileSeconds(meta.fileDurationSeconds);
                  }
                  const measured = meta?.durationSeconds;
                  if (
                    !durationUserSetRef.current &&
                    typeof measured === "number" &&
                    measured >= MIN_DURATION_SECONDS &&
                    measured <= MAX_DURATION_SECONDS
                  ) {
                    setDurationSeconds(Math.round(measured));
                  }
                }}
              />
              <FileUpload
                tile
                label="Bed"
                kind="demo-backing"
                accept={AUDIO_FILE_ACCEPT}
                onClear={() => setBackingFileUrl(null)}
                onUploaded={setBackingFileUrl}
              />
            </div>
          </div>
          {demoFileUrl ? (
            <ReferenceTracksPlayer partSrc={demoFileUrl} backingSrc={backingFileUrl} allowDownload={false} />
          ) : null}
          {durationSeconds ? (
            <div className="plays">
              <span className="dot" />
              {instrumentId && !isTestJob ? labelForInstrumentId(instrumentId) : "Part"} plays{" "}
              {editLen ? (
                <input
                  className="in xs"
                  inputMode="numeric"
                  defaultValue={formatPartDuration(durationSeconds)}
                  onBlur={(e) => {
                    const [m, s] = e.target.value.split(":");
                    const total = (Number(m) || 0) * 60 + (Number(s) || 0);
                    if (total >= MIN_DURATION_SECONDS && total <= MAX_DURATION_SECONDS) {
                      durationUserSetRef.current = true;
                      setDurationSeconds(Math.round(total));
                    }
                    setEditLen(false);
                  }}
                />
              ) : (
                <b>{formatPartDuration(durationSeconds)}</b>
              )}
              {partFileSeconds ? <span className="of">of {formatPartDuration(partFileSeconds)}</span> : null}
              <i
                className="tip"
                tabIndex={0}
                data-tip="Just the time this part plays, not the whole song. We use it to suggest a budget."
              >
                i
              </i>
              {!editLen ? (
                <button type="button" className="link" onClick={() => setEditLen(true)}>
                  Edit
                </button>
              ) : null}
            </div>
          ) : null}
          <Textarea
            label="Notes"
            name="description"
            required
            rows={2}
            placeholder="Feel, references, anything they should know"
          />
          {isAdmin && (
            <button
              type="button"
              onClick={() => setInstrumentId(isTestJob ? null : TEST_INSTRUMENT_ID)}
              disabled={submitting}
              aria-pressed={isTestJob}
              className="chip"
              style={isTestJob ? { background: "var(--ink)", color: "#fff" } : undefined}
            >
              Test (admins only)
            </button>
          )}
          {isTestJob && (
            <Alert variant="warning">
              This is a test job. It goes live with no payment, only admins can see it, and it never sends emails.
            </Alert>
          )}
          {showNetworkGap && instrumentId && (
            <Alert variant="warning">
              Nobody in the network currently plays {displayLabelForInstrumentId(instrumentId)}. You can still post.
            </Alert>
          )}
          <JobPricingFields
            variant="part"
            instrumentId={instrumentId}
            durationSeconds={durationSeconds}
            onDurationChange={handleDurationChange}
            deadlineText={deadlineText}
            onDeadlineTextChange={setDeadlineText}
            priceDollars={priceDollars}
            onPriceChange={handlePriceChange}
            disabled={submitting}
          />
          {tried && step === 2 && !stepValid(2) ? (
            <Alert variant="error">Add the instrument, the part to retrack, notes, the length, and a deadline.</Alert>
          ) : null}
        </section>
        {more.map((part, index) => (
          <ExtraPartCard
            key={part.key}
            index={index + 2}
            part={part}
            disabled={submitting}
            onChange={(patch) =>
              setMore((list) => list.map((item) => (item.key === part.key ? { ...item, ...patch } : item)))
            }
            onRemove={() => setMore((list) => list.filter((item) => item.key !== part.key))}
          />
        ))}
        <button
          type="button"
          className="add"
          onClick={() => setMore((list) => [...list, blankPart()])}
        >
          + Add another part
        </button>
      </div>

      <div className="stack" hidden={step !== 3}>
        <div className="jcard">
          <div className="jhead">
            <div>
              <div className="jtitle">{previewTitle || "Untitled"}</div>
              <div className="pills">
                <span className="pill money">${priceDollars}</span>
                {instrumentId ? <span className="pill">{displayLabelForInstrumentId(instrumentId)}</span> : null}
                {previewKey ? <span className="pill">{previewKey}</span> : null}
                {previewBpm ? <span className="pill">{previewBpm} BPM</span> : <span className="pill quiet">Free tempo</span>}
                {durationSeconds ? <span className="pill quiet">{durationSeconds}s part</span> : null}
                <span className="pill">{deadlineText || "7"} days</span>
              </div>
            </div>
          </div>
          {demoFileUrl ? (
            <div className="jbody">
              <ReferenceTracksPlayer partSrc={demoFileUrl} backingSrc={backingFileUrl} allowDownload={false} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="stack" hidden={step !== 4}>
        <div className="sum">
          <div className="sum-total">
            <span>{isTestJob ? "Test job, no charge" : "Due now"}</span>
            <b>
              {isTestJob
                ? "$0"
                : `$${priceDollars + more.reduce((sum, part) => sum + part.priceDollars, 0)}`}
            </b>
          </div>
        </div>
        <p className="hint">
          {isTestJob
            ? "This posts immediately. No card, no emails, and only admins can see it."
            : more.length > 0
              ? "One charge covers every part. Each part is its own job. Cancel a part before you pick a winner and that part is refunded."
              : "A secure Stripe checkout opens next. Card, Apple Pay, Link, and more. Cancel before a winner is paid for a full refund."}
        </p>
        <Input
          label="Invite someone (optional)"
          name="inviteEmail"
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="musician@email.com"
          autoComplete="email"
          disabled={submitting}
          hint="We'll email them a link to submit on this job."
        />
        {error && <Alert variant="error">{error}</Alert>}
      </div>
    </form>
    </ModalFrame>
  );
}

function ExtraPartCard({
  index,
  part,
  disabled,
  onChange,
  onRemove,
}: {
  index: number;
  part: ExtraPart;
  disabled: boolean;
  onChange: (patch: Partial<ExtraPart>) => void;
  onRemove: () => void;
}) {
  return (
    <section className="pcard open">
      <div className="pcard-head">
        <span className="pnum">Part {index}</span>
        <button type="button" className="btn text" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="fld">
        <label className="lbl">
          Instrument<span className="req">*</span>
        </label>
        <InstrumentTypeahead
          variant="combo"
          selectedId={part.instrumentId}
          onChange={(id) => onChange({ instrumentId: id })}
          disabled={disabled}
        />
      </div>
      <div className="fld">
        <div className="tiles">
          <FileUpload
            tile
            required
            label="Part"
            kind="demo"
            accept={AUDIO_FILE_ACCEPT}
            onClear={() => onChange({ demoFileUrl: null, fileDurationSeconds: null })}
            onUploaded={(url, meta) => {
              const measured = meta?.durationSeconds;
              onChange({
                demoFileUrl: url,
                fileDurationSeconds: meta?.fileDurationSeconds ?? null,
                ...(typeof measured === "number" &&
                measured >= MIN_DURATION_SECONDS &&
                measured <= MAX_DURATION_SECONDS &&
                part.durationSeconds == null
                  ? { durationSeconds: Math.round(measured) }
                  : {}),
              });
            }}
          />
          <FileUpload
            tile
            label="Bed"
            kind="demo-backing"
            accept={AUDIO_FILE_ACCEPT}
            onClear={() => onChange({ backingFileUrl: null })}
            onUploaded={(url) => onChange({ backingFileUrl: url })}
          />
        </div>
      </div>
      {part.durationSeconds ? (
        <div className="plays">
          <span className="dot" />
          {part.instrumentId ? labelForInstrumentId(part.instrumentId) : "Part"} plays{" "}
          <b>{formatPartDuration(part.durationSeconds)}</b>
          {part.fileDurationSeconds ? (
            <span className="of">of {formatPartDuration(part.fileDurationSeconds)}</span>
          ) : null}
        </div>
      ) : null}
      <Textarea
        label="Notes"
        name={`notes-${part.key}`}
        required
        rows={2}
        value={part.notes}
        placeholder="Feel, references, anything they should know"
        onChange={(e) => onChange({ notes: e.target.value })}
      />
      <JobPricingFields
        variant="part"
        instrumentId={part.instrumentId}
        durationSeconds={part.durationSeconds}
        onDurationChange={(seconds) => onChange({ durationSeconds: seconds })}
        deadlineText={String(part.deadlineDays)}
        onDeadlineTextChange={(value) => onChange({ deadlineDays: Number(value) || 1 })}
        priceDollars={part.priceDollars}
        onPriceChange={(n) => onChange({ priceDollars: n })}
        disabled={disabled}
      />
    </section>
  );
}
