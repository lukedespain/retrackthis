export const META_PIXEL_ID = "2144708956439647";

type Fbq = (method: string, event: string | Record<string, unknown>, params?: Record<string, unknown>, options?: { eventID: string }) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/** `eventId` lets Meta merge this browser event with the same event sent from the server (lib/metaCapi). */
export function trackMeta(
  event: string,
  options?: { custom?: boolean; params?: Record<string, unknown>; eventId?: string }
) {
  if (typeof window === "undefined") return;
  let tries = 0;
  const send = () => {
    if (typeof window.fbq === "function") {
      window.fbq(
        options?.custom ? "trackCustom" : "track",
        event,
        options?.params ?? {},
        options?.eventId ? { eventID: options.eventId } : undefined
      );
      return;
    }
    if (tries++ < 20) window.setTimeout(send, 250);
  };
  send();
}
