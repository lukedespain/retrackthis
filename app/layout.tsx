import { GeistSans } from "geist/font/sans";
import "./globals.css";
import "./brand.css";

export const metadata = {
  title: "retrackthis.com",
  description: "Real musicians. Real takes. You pick your favorite.",
  icons: {
    icon: [
      {
        url: "/brand/loop-spin-light-32.png?v=20260930",
        media: "(prefers-color-scheme: light)",
        type: "image/png",
      },
      {
        url: "/brand/loop-spin-dark-32.png?v=20260930",
        media: "(prefers-color-scheme: dark)",
        type: "image/png",
      },
      { url: "/brand/loop-spin-light-32.png?v=20260930", type: "image/png" },
    ],
    apple: "/brand/loop-spin-apple-180.png?v=20260930",
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
