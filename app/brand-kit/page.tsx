import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KitAsset } from "@/app/brand-kit/KitAsset";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import { MarketingFooter } from "@/components/MarketingFooter";
import { getAdminUser } from "@/lib/admin";
import { getSessionUserId } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "Brand kit · Retrack This",
  robots: { index: false, follow: false },
};

const COLORS = [
  { name: "Iris", hex: "#7B61FF", note: "Accent. The word This, and the badge face." },
  { name: "Iris ink", hex: "#604CC7", note: "Accent text on light backgrounds." },
  { name: "Iris soft", hex: "#F3F1FF", note: "Tint behind accent pills." },
  { name: "Ink", hex: "#111113", note: "Text, buttons, and the badge shadow." },
  { name: "Ink 2", hex: "#3B3B40", note: "Secondary text." },
  { name: "Muted", hex: "#76767C", note: "Hints and footer." },
  { name: "Page", hex: "#F3F2EE", note: "The site background." },
  { name: "Soft", hex: "#F5F4F1", note: "Open job well and quiet fills." },
  { name: "White", hex: "#FFFFFF", note: "Cards." },
];

const TYPE = [
  { name: "Hero", sample: "Retrack your demo", style: { fontSize: "clamp(40px, 6vw, 64px)", fontWeight: 600, letterSpacing: "-0.055em", lineHeight: 0.95 } },
  { name: "Page title", sample: "Find work", style: { fontSize: 44, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1 } },
  { name: "Section", sample: "What you play", style: { fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em" } },
  { name: "Nav wordmark", sample: "Retrack This", style: { fontSize: 21, fontWeight: 600, letterSpacing: "-0.04em" } },
  { name: "Body", sample: "Real musicians send back their take.", style: { fontSize: 15, lineHeight: 1.5 } },
  { name: "Small", sample: "Footer, hints, and file labels.", style: { fontSize: 13, color: "var(--muted)" } },
];

const ICONS = ["Electric guitar", "Bass guitar", "Piano", "Saxophone", "Drum kit", "Violin", "Vocal"];

export default async function BrandKitPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in?next=/brand-kit");
  const admin = await getAdminUser();
  if (!admin) redirect("/");

  return (
    <>
      <main className="wrap" style={{ paddingBottom: 48 }}>
        <div className="page-head">
          <div>
            <h1>Brand kit</h1>
            <p>The live mark, colors, type, and files. For admins.</p>
          </div>
        </div>

        <section className="card">
          <h2>Logo</h2>
          <p>Hover a mark and click it. Pick SVG for design tools, or the PNG named for the account you are updating. Google needs a PNG. The SVG came in under 98×98, which is why the profile photo was rejected.</p>
          <div className="kit-assets">
            <KitAsset
              title="Badge"
              preview="/brand/kit/badge-profile-720.png"
              files={[
                { href: "/brand/kit/badge.svg", label: "SVG", detail: "Design tools" },
                { href: "/brand/kit/badge-profile-720.png", label: "PNG · 720×720", detail: "Google profile, Instagram, TikTok, YouTube" },
                { href: "/brand/kit/badge-press.gif?v=2", label: "GIF · 360×360", detail: "Animated Google profile. Inbox often stays still" },
                { href: "/brand/kit/badge-google-signin-120.png", label: "PNG · 120×120", detail: "Google sign-in" },
                { href: "/brand/kit/badge-stripe-512.png", label: "PNG · 512×512", detail: "Stripe icon" },
              ]}
            />
            <KitAsset
              title="Wordmark"
              preview="/brand/kit/wordmark.png"
              files={[
                { href: "/brand/kit/wordmark.svg", label: "SVG", detail: "Design tools" },
                { href: "/brand/kit/wordmark.png", label: "PNG", detail: "Stripe logo, email signature" },
                { href: "/brand/kit/wordmark-workspace-320x132.png", label: "PNG · 320×132", detail: "Google Workspace logo" },
              ]}
            />
          </div>
        </section>

        <section className="card">
          <h2>Color</h2>
          <p>Iris is the only accent. Buttons are ink, not purple.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {COLORS.map((color) => (
              <div key={color.hex} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 36, height: 36, borderRadius: 12, background: color.hex, boxShadow: "inset 0 0 0 1px rgba(17,17,19,.12)", flex: "none" }} />
                <span>
                  <strong style={{ display: "block", fontSize: 14, fontWeight: 500 }}>{color.name}</strong>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{color.hex}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Type</h2>
          <p>Geist. One family for the product, emails, and anything public. Weights 400, 500, and 600.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {TYPE.map((row) => (
              <div key={row.name}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{row.name}</div>
                <div style={row.style}>{row.sample}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Icons</h2>
          <p>Instrument icons are duotone, in the same ink and iris. They sit at 22px in lists.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {ICONS.map((name) => (
              <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <InstrumentIcon instrument={name} />
                {name}
              </span>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Name and line</h2>
          <p style={{ marginBottom: 8 }}>Retrack This. “This” is Iris. The line is “Retrack your demo with real musicians.”</p>
          <p style={{ marginBottom: 0 }}>The product word is pick. While a job is still open, the button says Favorite.</p>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
