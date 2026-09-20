import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DEMO_MODE } from "@/lib/demoMode";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "retrackthis.com",
  description: "Real musicians. Real takes. You pick your favorite.",
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
        {DEMO_MODE ? (
          <div className="sticky top-0 z-50 bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
            Preview build — mock data, not connected to production
          </div>
        ) : null}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
