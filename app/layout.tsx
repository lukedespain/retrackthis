import { GeistSans } from "geist/font/sans";
import "./globals.css";
import "./brand.css";

export const metadata = {
  title: "retrackthis.com",
  description: "Real musicians. Real takes. You pick your favorite.",
  icons: {
    icon: [
      {
        url: "/brand/retrackthis-icon-light-32.png?v=20260921",
        media: "(prefers-color-scheme: light)",
        type: "image/png",
      },
      {
        url: "/brand/retrackthis-icon-dark-32.png?v=20260921",
        media: "(prefers-color-scheme: dark)",
        type: "image/png",
      },
      // Fallback for browsers that ignore media
      { url: "/brand/retrackthis-icon-light-32.png?v=20260921", type: "image/png" },
    ],
    apple: "/brand/retrackthis-apple-touch-180.png?v=20260921",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistSans.className}`}>
      <body className="overflow-x-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
