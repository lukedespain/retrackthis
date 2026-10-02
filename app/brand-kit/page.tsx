import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InstrumentIcon } from "@/components/brand/InstrumentIcon";
import { Wordmark } from "@/components/brand/Wordmark";
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

const CURRENT = [
  { href: "/brand/badge-offset.svg", label: "Badge · offset", meta: "SVG · use this for anything new" },
];

const EARLIER = [
  { href: "/brand/retrackthis-logo-wordmark-light.png", label: "Wordmark, light", meta: "PNG" },
  { href: "/brand/retrackthis-logo-wordmark-dark.png", label: "Wordmark, dark", meta: "PNG" },
  { href: "/brand/retrackthis-banner-1360.png", label: "Banner", meta: "1360px wide" },
  { href: "/brand/retrackthis-banner-680.png", label: "Banner", meta: "680px wide" },
  { href: "/brand/retrackthis-icon-light-512.png", label: "Icon, light", meta: "512" },
  { href: "/brand/retrackthis-icon-dark-512.png", label: "Icon, dark", meta: "512" },
  { href: "/brand/retrackthis-google-oauth-120.png", label: "Google sign-in", meta: "120" },
  { href: "/brand/retrackthis-workspace-512.png", label: "Workspace", meta: "512" },
  { href: "/brand/retrackthis-email-64.png", label: "Email mark", meta: "64" },
  { href: "/brand/retrackthis-apple-touch-180.png", label: "Apple touch", meta: "180" },
  { href: "/brand/retrackthis-hero-email.gif", label: "Email hero", meta: "GIF" },
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
          <p>This is the mark on the site. The purple face sits on a black shadow, down and to the right. Leave that shadow in the frame.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", padding: "8px 0 20px" }}>
            <Wordmark href="/brand-kit" />
            <img src="/brand/badge-offset.svg" alt="Offset badge" width={64} height={64} />
            <img src="/brand/badge-offset.svg" alt="" width={36} height={36} />
            <img src="/brand/badge-offset.svg" alt="" width={24} height={24} />
          </div>
          <FileGrid files={CURRENT} />
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
          <h2>Earlier files</h2>
          <p>These are the previous loop mark. Emails still load some of them, so the files stay up. Use the badge above for new profiles, ads, and social.</p>
          <FileGrid files={EARLIER} />
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

function FileGrid({ files }: { files: Array<{ href: string; label: string; meta: string }> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
      {files.map((file) => (
        <a
          key={file.href}
          href={file.href}
          download
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "12px 14px",
            borderRadius: 14,
            background: "var(--soft)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <strong style={{ fontSize: 14, fontWeight: 500 }}>{file.label}</strong>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{file.meta}</span>
        </a>
      ))}
    </div>
  );
}
