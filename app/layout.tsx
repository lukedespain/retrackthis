import { GeistSans } from "geist/font/sans";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";
import "./brand.css";

export const metadata = {
  title: "retrackthis.com",
  description: "Real musicians. Real takes. You pick your favorite.",
  icons: {
    icon: [{ url: "/brand/badge-offset.svg?v=20261002", type: "image/svg+xml" }],
    apple: "/brand/badge-offset.svg?v=20261002",
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
