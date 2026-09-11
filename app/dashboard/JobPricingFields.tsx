"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import {
  clampJobPriceUsd,
  formatPartDuration,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  SLIDER_MAX_USD,
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
  priceDollars,
  onPriceChange,
  disabled = false,
}: {
  instrumentId: string | null;
  durationSeconds: number | null;
  onDurationChange: (seconds: number) => void;
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

  const suggestion = useMemo(() => {
    if (!durationSeconds) return null;
    return suggestJobPrice({ instrumentId, durationSeconds });
  }, [instrumentId, durationSeconds]);

  function syncMmSsText(total: number) {
    const parts = secondsToParts(total);
    setMinutesText(String(parts.minutes));
    setSecondsText(String(parts.seconds));
  }

  function autoSetPriceIfNeeded(nextInstrumentId: string | null, nextDuration: number | null) {
    if (!nextInstrumentId || !nextDuration) return;
    const key = `${nextInstrumentId}:${nextDuration}`;
    if (key === lastAutoKeyRef.current) return;
    lastAutoKeyRef.current = key;
    if (priceDirtyRef.current) return;
    const next = suggestJobPrice({
      instrumentId: nextInstrumentId,
      durationSeconds: nextDuration,
    });
    onPriceChangeRef.current(next.defaultPrice);
  }

  useEffect(() => {
    if (durationSeconds == null) return;
    syncMmSsText(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    autoSetPriceIfNeeded(instrumentId, durationSeconds);
  }, [instrumentId, durationSeconds]);

  useEffect(() => {
    if (priceFocused) return;
    setPriceText(String(priceDollars));
  }, [priceDollars, priceFocused]);

  function applyDuration(total: number) {
    const clamped = Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, Math.round(total)));
    syncMmSsText(clamped);
    onDurationChange(clamped);
    autoSetPriceIfNeeded(instrumentId, clamped);
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
    // Slider is capped at $500, but producers can type higher when the part warrants it.
    onPriceChange(Math.round(raw));
  }

  function setPriceFromSlider(raw: number) {
    priceDirtyRef.current = true;
    if (!Number.isFinite(raw)) return;
    onPriceChange(Math.max(SLIDER_MIN_USD, Math.round(raw)));
  }

  const priceBelowMin =
    priceText.trim() === "" ||
    !Number.isFinite(priceDollars) ||
    priceDollars < SLIDER_MIN_USD;

  const sliderMin = suggestion?.sliderMin ?? SLIDER_MIN_USD;
  const sliderMax = suggestion?.sliderMax ?? SLIDER_MAX_USD;
  const recMin = suggestion?.displayRecommendedMin ?? 100;
  const recMax = suggestion?.displayRecommendedMax ?? 260;
  const span = Math.max(1, sliderMax - sliderMin);
  const leftPct = ((recMin - sliderMin) / span) * 100;
  const rightPct = ((recMax - sliderMin) / span) * 100;
  const sliderValue = clampJobPriceUsd(
    Math.max(SLIDER_MIN_USD, priceDollars || SLIDER_MIN_USD),
    sliderMin,
    sliderMax
  );

  const tip =
    suggestion && suggestion.exceedsSlider && priceDollars >= SLIDER_MAX_USD
      ? "This offer is at the top of the calculator slider. You can type a higher amount if you want to go above $500."
      : suggestion && Number.isFinite(priceDollars) && priceDollars >= SLIDER_MIN_USD && priceDollars < suggestion.recommendedMin
        ? "This is below the typical range for this part, so you may get fewer takes."
        : suggestion &&
            !suggestion.exceedsSlider &&
            Number.isFinite(priceDollars) &&
            priceDollars > suggestion.recommendedMax
          ? "This is above the typical range, which usually means a stronger incentive for musicians."
          : null;

  return (
    <>
      <div className="sm:col-span-2 space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Part length</p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
            Enter how long the musician will actually play on this part. If you already uploaded the
            isolated part above, we try to fill this in from the file, and you can still edit it. If
            you are not sure yet, a close guess is fine.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
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
        {durationSeconds != null && (
          <p className="text-xs text-gray-400">
            Using {formatPartDuration(durationSeconds)} as the part length for pricing.
          </p>
        )}
      </div>

      <div className="sm:col-span-2 space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Price suggestion calculator</p>
          {suggestion ? (
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{suggestion.suggestedCopy}</p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
              Pick an instrument and part length to see a suggested range. The calculator looks at
              the instrument type and how long the part is, then you can set the offer to match your
              budget.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="max-w-[8rem]">
            <Input
              label="Your offer (USD)"
              name="price"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={priceText}
              disabled={disabled}
              required
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
          {priceBelowMin && (
            <p className="text-xs leading-relaxed text-amber-700">
              Minimum offer is ${SLIDER_MIN_USD}. You can keep typing; posting is blocked until the
              offer meets the minimum.
            </p>
          )}

          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={sliderValue}
            disabled={disabled || !suggestion}
            onChange={(e) => setPriceFromSlider(Number(e.target.value))}
            className="job-price-slider h-2 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: `linear-gradient(to right,
                #e5e7eb 0%,
                #e5e7eb ${leftPct}%,
                #c4b5fd ${leftPct}%,
                #3b2db8 ${rightPct}%,
                #e5e7eb ${rightPct}%,
                #e5e7eb 100%)`,
            }}
            aria-label="Job price"
          />
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>${sliderMin}</span>
            {suggestion && (
              <span className="text-accent">
                {suggestion.exceedsSlider
                  ? "Suggested $500+"
                  : `Suggested $${suggestion.recommendedMin}-$${suggestion.recommendedMax}`}
              </span>
            )}
            <span>$500+</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-400">
            The slider tops out at $500 so the scale stays readable. If the calculator thinks the
            part is worth more, it will say $500 or more and you can type a higher offer above.
          </p>
        </div>

        {tip && <p className="text-xs leading-relaxed text-amber-700">{tip}</p>}
      </div>
    </>
  );
}
