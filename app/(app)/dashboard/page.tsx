import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardActivity } from "@/components/dashboard/DashboardActivity";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

// Loading fallback component
function DashboardLoadingFallback() {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <div className="h-9 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-5 bg-gray-100 rounded w-96 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}

// Async component that handles authentication
async function DashboardContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.name?.split(" ")[0] || "there";

  return (
    <>
      <DashboardClient />
      <div className="p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {userName}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your conversations today.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          }
        >
          <DashboardStats />
        </Suspense>

        <Suspense
          fallback={
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          }
        >
          <DashboardActivity />
        </Suspense>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <DashboardContent />
    </Suspense>
  );
}

