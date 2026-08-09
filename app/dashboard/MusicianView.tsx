"use client";

import { useState } from "react";
import { OpenJobsBrowse } from "@/components/OpenJobsBrowse";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { MySubmissions } from "./MySubmissions";

type SubTab = "browse" | "submissions";

export function MusicianView() {
  const [subTab, setSubTab] = useState<SubTab>("browse");

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {subTab === "browse" ? "Open jobs" : "My submissions"}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {subTab === "browse"
              ? "Browse available gigs and submit your take"
              : "Track the status of your submitted takes"}
          </p>
        </div>
        <SegmentedControl
          options={[
            { value: "browse" as const, label: "Open jobs" },
            { value: "submissions" as const, label: "My submissions" },
          ]}
          value={subTab}
          onChange={setSubTab}
          className="self-start"
        />
      </div>

      <div className="mt-6 sm:mt-8">
        {subTab === "browse" ? <OpenJobsBrowse signedIn /> : <MySubmissions />}
      </div>
    </div>
  );
}
