"use client";

import { VendorSubNav } from "@/components/vendors/VendorSubNav";

export default function VendorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 p-3 min-h-full">
      <VendorSubNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
