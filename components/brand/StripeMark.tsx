/** Stripe’s square mark: white S on #635BFF. */
export function StripeMark({ size = 22 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/stripe-mark.png"
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size, display: "block", borderRadius: Math.round(size * 0.22) }}
    />
  );
}
