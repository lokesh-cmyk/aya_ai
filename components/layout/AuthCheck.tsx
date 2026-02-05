import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function AuthCheckContent() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("better-auth.session_token");

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
