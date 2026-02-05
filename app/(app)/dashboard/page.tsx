import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardActivity } from "@/components/dashboard/DashboardActivity";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

// Note: With cacheComponents enabled, ISR is handled via fetch options (next: { revalidate })
// in the components themselves, not via route segment config

export default async function DashboardPage() {
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
        {/* Welcome Section - Static */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your conversations today.
          </p>
        </div>

        {/* Stats Grid - Suspense boundary for dynamic content */}
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-gray-100 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          }
        >
          <DashboardStats />
        </Suspense>

        {/* Recent Activity - Suspense boundary */}
        <Suspense
          fallback={
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-64 bg-gray-100 rounded-lg animate-pulse"
                ></div>
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

