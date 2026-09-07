"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";

export function RoleHubHeader<T extends string>({
  title,
  description,
  options,
  value,
  onChange,
}: {
  title: string;
  description: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
          {title}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-gray-500 sm:text-base dark:text-gray-400">
          {description}
        </p>
      </div>
      <SegmentedControl
        options={options}
        value={value}
        onChange={onChange}
        className="w-full sm:w-auto sm:self-start"
      />
    </div>
  );
}
