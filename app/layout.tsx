import { GeistSans } from "geist/font/sans";
import { SiteHeader } from "@/components/SiteHeader";
import { MOTTO } from "@/lib/motto";
import "./globals.css";
import "./brand.css";

export const metadata = {
  metadataBase: new URL("https://retrackthis.com"),
  title: "retrackthis.com",
  description: MOTTO,
  openGraph: {
    title: "Retrack This",
    description: MOTTO,
    url: "https://retrackthis.com",
    siteName: "Retrack This",
    type: "website",
    images: [{ url: "/brand/kit/link-preview.png", width: 1200, height: 630, alt: "Retrack This" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Retrack This",
    description: MOTTO,
    images: ["/brand/kit/link-preview.png"],
  },
  icons: {
    icon: [
      { url: "/brand/kit/favicon-32.png?v=20261002b", sizes: "32x32", type: "image/png" },
      { url: "/brand/kit/favicon-192.png?v=20261002b", sizes: "192x192", type: "image/png" },
      { url: "/brand/badge-offset.svg?v=20261002b", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=20261002b", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistSans.className}`}>
      <body className="overflow-x-hidden antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
