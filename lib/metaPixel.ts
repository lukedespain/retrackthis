export const META_PIXEL_ID = "2144708956439647";

type Fbq = (method: string, event: string, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

export function trackMeta(event: string, options?: { custom?: boolean; params?: Record<string, unknown> }) {
  if (typeof window === "undefined") return;
  let tries = 0;
  const send = () => {
    if (typeof window.fbq === "function") {
      window.fbq(options?.custom ? "trackCustom" : "track", event, options?.params);
      return;
    }
    if (tries++ < 20) window.setTimeout(send, 250);
  };
  send();
}
