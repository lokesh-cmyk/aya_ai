import { Suspense } from "react";
import { AppLayoutClient } from "@/components/layout/AppLayoutClient";
import { AuthCheck } from "@/components/layout/AuthCheck";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthCheck />
      <Suspense>
        <AppLayoutClient>{children}</AppLayoutClient>
      </Suspense>
    </>
  );
}
