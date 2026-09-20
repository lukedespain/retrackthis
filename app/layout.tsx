import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "retrackthis.com",
  description: "Real musicians. Real takes. You pick your favorite.",
  icons: {
    icon: [
      {
        url: "/brand/retrackthis-icon-light-32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/brand/retrackthis-icon-dark-32.png",
        media: "(prefers-color-scheme: dark)",
      },
      // Fallback for browsers that ignore media
      { url: "/brand/retrackthis-icon-light-32.png" },
    ],
    apple: "/brand/retrackthis-icon-light-180.png",
  },
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('retrackthis-theme');
    var theme = stored === 'dark' ? 'dark' : 'light';
    var root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} overflow-x-hidden font-sans antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
