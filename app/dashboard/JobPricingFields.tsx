"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FieldInfo } from "@/components/ui/FieldInfo";
import { Input } from "@/components/ui/Input";
import {
  MAX_DEADLINE_DAYS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  roundToTen,
  SLIDER_MIN_USD,
  suggestJobPrice,
} from "@/lib/jobPricing";

function secondsToParts(total: number) {
  const s = Math.max(0, Math.round(total));
  return { minutes: Math.floor(s / 60), seconds: s % 60 };
}

function parseDigits(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function JobPricingFields({
  instrumentId,
  durationSeconds,
  onDurationChange,
  deadlineText,
  onDeadlineTextChange,
  priceDollars,
  onPriceChange,
  disabled = false,
}: {
  instrumentId: string | null;
  durationSeconds: number | null;
  onDurationChange: (seconds: number) => void;
  deadlineText: string;
  onDeadlineTextChange: (value: string) => void;
  priceDollars: number;
  onPriceChange: (n: number) => void;
  disabled?: boolean;
}) {
  const [minutesText, setMinutesText] = useState("");
  const [secondsText, setSecondsText] = useState("");
  const [priceText, setPriceText] = useState(String(priceDollars));
  const [priceFocused, setPriceFocused] = useState(false);
  const priceDirtyRef = useRef(false);
  const lastAutoKeyRef = useRef<string>("");
  const onPriceChangeRef = useRef(onPriceChange);
  onPriceChangeRef.current = onPriceChange;

  const deadlineDaysParsed = Number(deadlineText);
  const deadlineDays =
    deadlineText.trim() !== "" && Number.isFinite(deadlineDaysParsed)
      ? Math.min(MAX_DEADLINE_DAYS, Math.max(1, Math.round(deadlineDaysParsed)))
      : MAX_DEADLINE_DAYS;
  const deadlineOutOfRange =
    deadlineText.trim() !== "" &&
    (!Number.isFinite(deadlineDaysParsed) ||
      deadlineDaysParsed < 1 ||
      deadlineDaysParsed > MAX_DEADLINE_DAYS);

  const suggestion = useMemo(() => {
    if (!durationSeconds) return null;
    return suggestJobPrice({ instrumentId, durationSeconds, deadlineDays });
  }, [instrumentId, durationSeconds, deadlineDays]);

  function syncMmSsText(total: number) {
    const parts = secondsToParts(total);
    setMinutesText(String(parts.minutes));
    setSecondsText(String(parts.seconds));
  }

  function autoSetPriceIfNeeded(
    nextInstrumentId: string | null,
    nextDuration: number | null,
    nextDeadlineDays: number
  ) {
    if (!nextInstrumentId || !nextDuration) return;
    const key = `${nextInstrumentId}:${nextDuration}:${nextDeadlineDays}`;
    if (key === lastAutoKeyRef.current) return;
    lastAutoKeyRef.current = key;
    if (priceDirtyRef.current) return;
    const next = suggestJobPrice({
      instrumentId: nextInstrumentId,
      durationSeconds: nextDuration,
      deadlineDays: nextDeadlineDays,
    });
    onPriceChangeRef.current(next.defaultPrice);
  }

  useEffect(() => {
    if (durationSeconds == null) return;
    syncMmSsText(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    autoSetPriceIfNeeded(instrumentId, durationSeconds, deadlineDays);
  }, [instrumentId, durationSeconds, deadlineDays]);

  useEffect(() => {
    if (priceFocused) return;
    setPriceText(String(priceDollars));
  }, [priceDollars, priceFocused]);

  function applyDuration(total: number) {
    const clamped = Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, Math.round(total)));
    syncMmSsText(clamped);
    onDurationChange(clamped);
    autoSetPriceIfNeeded(instrumentId, clamped, deadlineDays);
  }

  function commitMmSs() {
    const m = Math.max(0, Math.floor(parseDigits(minutesText) ?? 0));
    let s = Math.max(0, Math.floor(parseDigits(secondsText) ?? 0));
    if (s > 59) s = 59;
    applyDuration(m * 60 + s);
  }

  function setPriceFromUser(raw: number) {
    priceDirtyRef.current = true;
    if (!Number.isFinite(raw)) return;
    onPriceChange(Math.round(raw));
  }

  function setPriceFromSlider(raw: number) {
    priceDirtyRef.current = true;
    if (!Number.isFinite(raw)) return;
    onPriceChange(roundToTen(raw));
  }

  function snapOfferToRange(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, roundToTen(n)));
  }

  const priceBelowMin =
    priceText.trim() === "" ||
    !Number.isFinite(priceDollars) ||
    priceDollars < SLIDER_MIN_USD;

  const recMin = suggestion?.recommendedMin ?? null;
  const recMax = suggestion?.recommendedMax ?? null;
  const sliderValue =
    recMin != null && recMax != null
      ? snapOfferToRange(
          Number.isFinite(priceDollars) && priceDollars > 0 ? priceDollars : recMin,
          recMin,
          recMax
        )
      : 0;

  const tip =
    suggestion &&
    Number.isFinite(priceDollars) &&
    priceDollars >= SLIDER_MIN_USD &&
    priceDollars < suggestion.recommendedMin
      ? "Below the typical range, so you may get fewer takes."
      : suggestion &&
          Number.isFinite(priceDollars) &&
          priceDollars > suggestion.recommendedMax
        ? "Above the typical range, which usually means a stronger incentive."
        : null;

  return (
    <div className="sm:col-span-2 space-y-5">
      <div className="space-y-2 sm:max-w-xs">
        <p className="inline-flex items-center text-sm font-medium text-gray-900">
          Part length
          <FieldInfo>
            How long the musician will actually play (not the full song length if the Part has
            silence). When we can tell from the Part file, we fill this in; otherwise enter a close
            guess.
          </FieldInfo>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Minutes"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={minutesText}
            disabled={disabled}
            placeholder="0"
            onChange={(e) => {
              const next = e.target.value.replace(/[^\d]/g, "");
              setMinutesText(next);
            }}
            onBlur={commitMmSs}
          />
          <Input
            label="Seconds"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={secondsText}
            disabled={disabled}
            placeholder="0"
            onChange={(e) => {
              const next = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
              setSecondsText(next);
            }}
            onBlur={commitMmSs}
          />
          </div>
        </div>

      <div className="max-w-xs">
        <Input
          label="Days until submission closes"
          name="deadlineDays"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={deadlineText}
          disabled={disabled}
          required
          info={`Maximum ${MAX_DEADLINE_DAYS} days. Card holds can only stay open for a limited time, so jobs cap at a week. If you do not pick a winner by then, the job closes and the hold is released.`}
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d]/g, "");
            if (next === "") {
              onDeadlineTextChange("");
              return;
            }
            const n = Number(next);
            if (Number.isFinite(n) && n > MAX_DEADLINE_DAYS) {
              onDeadlineTextChange(String(MAX_DEADLINE_DAYS));
              return;
            }
            onDeadlineTextChange(next);
          }}
          onBlur={() => {
            if (deadlineText.trim() === "") {
              onDeadlineTextChange("1");
              return;
            }
            const n = Number(deadlineText);
            if (!Number.isFinite(n) || n < 1) {
              onDeadlineTextChange("1");
              return;
            }
            onDeadlineTextChange(String(Math.min(MAX_DEADLINE_DAYS, Math.round(n))));
          }}
        />
        {deadlineOutOfRange && (
          <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
            Deadline must be between 1 and {MAX_DEADLINE_DAYS} days.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <p className="inline-flex items-center text-sm font-medium text-gray-900">
            Your offer
            <FieldInfo>
              Suggested from instrument, part length, and deadline. Tighter deadlines and longer or
              rarer parts nudge the range up. Minimum ${SLIDER_MIN_USD}. The range slider moves in $10
              steps; you can still type any amount.
            </FieldInfo>
          </p>
          {suggestion ? (
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{suggestion.suggestedCopy}</p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
              Pick an instrument and part length to see a suggested range.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="w-full max-w-[8rem] shrink-0">
            <label htmlFor="price" className="sr-only">
              Offer in USD
            </label>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500"
              >
                $
              </span>
              <input
                id="price"
                name="price"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={priceText}
                disabled={disabled}
                required
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-7 pr-3.5 text-sm text-gray-900 outline-none transition-all duration-150 ease-out hover:border-gray-300 focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-gray-600 dark:disabled:bg-gray-900"
                onFocus={() => setPriceFocused(true)}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d]/g, "");
                  setPriceText(next);
                  priceDirtyRef.current = true;
                  if (next === "") {
                    onPriceChange(0);
                    return;
                  }
                  const n = Number(next);
                  if (Number.isFinite(n)) setPriceFromUser(n);
                }}
                onBlur={() => {
                  setPriceFocused(false);
                  if (priceText.trim() === "") {
                    setPriceText("");
                    return;
                  }
                  const n = Number(priceText);
                  if (Number.isFinite(n)) {
                    const rounded = Math.round(n);
                    setPriceText(String(rounded));
                    onPriceChange(rounded);
                  }
                }}
              />
            </div>
          </div>

          {suggestion && recMin != null && recMax != null && (
            <div className="relative min-w-0 flex-1 py-4">
              <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between">
                <span className="text-[10px] font-medium tracking-wide text-violet-400">
                  Beginning
                </span>
                <span className="text-[10px] font-medium tracking-wide text-accent">Expert</span>
              </div>
              <input
                type="range"
                min={recMin}
                max={recMax}
                step={10}
                value={sliderValue}
                disabled={disabled}
                onChange={(e) => setPriceFromSlider(Number(e.target.value))}
                className="job-price-slider w-full cursor-pointer appearance-none disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Suggested range $${recMin} to $${recMax}`}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-gray-400">
                <span>${recMin}</span>
                <span>
                  ${recMax}
                  {suggestion.exceedsSlider ? "+" : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        {priceBelowMin && (
          <p className="text-xs leading-relaxed text-amber-700">
            Minimum offer is ${SLIDER_MIN_USD}.
          </p>
        )}

        {tip && <p className="text-xs leading-relaxed text-amber-700">{tip}</p>}
      </div>
    </div>
  );
}
