"use client";

import { useTheme, type ThemeMode } from "@/components/ThemeProvider";
import { Card } from "@/components/ui/Card";

const OPTIONS: Array<{ id: ThemeMode; label: string; description: string }> = [
  {
    id: "light",
    label: "Light",
    description: "Bright background for daytime use.",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Lower glare for night sessions.",
  },
];

export function ThemeSettings() {
  const { theme, setTheme, ready } = useTheme();

  return (
    <Card padding="md" id="theme">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Appearance</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Choose light or dark mode. Your preference is saved on this device.
      </p>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = ready && theme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={!ready}
              aria-pressed={selected}
              onClick={() => setTheme(option.id)}
              className={`rounded-2xl border px-4 py-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50 ${
                selected
                  ? "border-accent bg-[#eeecff] ring-1 ring-accent/20 dark:border-accent dark:bg-[#1e1b4b] dark:ring-accent/40"
                  : "border-gray-200 bg-[#ffffff] hover:border-gray-300 dark:border-gray-700 dark:bg-[#0b1220] dark:hover:border-gray-600"
              }`}
            >
              <span className="block text-sm font-semibold text-[#111827] dark:text-[#f3f4f6]">
                {option.label}
              </span>
              <span className="mt-1 block text-xs text-[#6b7280] dark:text-[#9ca3af]">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
