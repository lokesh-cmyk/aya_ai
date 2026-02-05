import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookie } from "@/lib/auth";

async function AuthCheckContent() {
  const cookieStore = await cookies();
  const sessionCookie = getSessionCookie(cookieStore);

  if (!sessionCookie) {
    redirect("/login");
  }

  return null;
}

export function AuthCheck() {
  return (
    <Suspense fallback={null}>
      <AuthCheckContent />
    </Suspense>
  );
}
