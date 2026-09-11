"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

export type FaqItem = {
  id: string;
  question: string;
  answer: ReactNode;
};

function formatIndex(i: number) {
  return String(i + 1).padStart(2, "0");
}

export function FaqBrowse({ items }: { items: FaqItem[] }) {
  const baseId = useId();
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId)
  );
  const active = items[activeIndex] ?? items[0];

  useEffect(() => {
    if (!items.some((item) => item.id === activeId) && items[0]) {
      setActiveId(items[0].id);
    }
  }, [items, activeId]);

  if (!active) return null;

  return (
    <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-16">
      <div className="border-t border-gray-100">
        {items.map((item, index) => {
          const selected = item.id === active.id;
          const panelId = `${baseId}-panel-${item.id}`;
          const buttonId = `${baseId}-button-${item.id}`;

          return (
            <div key={item.id} className="border-b border-gray-100">
              <button
                id={buttonId}
                type="button"
                aria-expanded={selected}
                aria-controls={panelId}
                onClick={() => setActiveId(item.id)}
                className={`group flex w-full items-start gap-4 px-3 py-4 text-left transition-colors duration-150 sm:px-4 sm:py-5 ${
                  selected
                    ? "rounded-xl ring-1 ring-accent text-gray-900"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 font-mono text-xs tracking-wide ${
                    selected ? "text-accent" : "text-gray-300 group-hover:text-gray-400"
                  }`}
                >
                  {formatIndex(index)}
                </span>
                <span className="min-w-0 flex-1 text-base font-medium leading-snug sm:text-lg">
                  {item.question}
                </span>
              </button>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!selected}
                className="lg:hidden"
              >
                {selected && (
                  <div className="space-y-3 px-3 pb-5 pt-1 text-sm leading-relaxed text-gray-600 sm:px-4 sm:pl-12 sm:text-[15px]">
                    <p className="font-mono text-xs text-accent">{formatIndex(index)}</p>
                    <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                      {item.question}
                    </h2>
                    <div className="space-y-3 [&_a]:font-medium [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_p]:leading-relaxed">
                      {item.answer}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <aside className="sticky top-24 hidden space-y-4 pt-1 lg:block">
        <p className="font-mono text-xs text-accent">{formatIndex(activeIndex)}</p>
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900">{active.question}</h2>
        <div className="space-y-3 text-[15px] leading-relaxed text-gray-600 [&_a]:font-medium [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline">
          {active.answer}
        </div>
      </aside>
    </div>
  );
}
