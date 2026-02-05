"use client";

import { Suspense } from "react";
import { MeetingsMainView } from "@/components/meetings";
import { Loader2 } from "lucide-react";

function MeetingsLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/80">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-sm text-gray-500">Loading meetings...</p>
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={<MeetingsLoading />}>
      <MeetingsMainView />
    </Suspense>
  );
}
