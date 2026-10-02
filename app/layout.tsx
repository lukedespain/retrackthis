import { GeistSans } from "geist/font/sans";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";
import "./brand.css";

export const metadata = {
  title: "retrackthis.com",
  description: "Real musicians. Real takes. You pick your favorite.",
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
