"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Client component for client-side checks and redirects
export function DashboardClient() {
  const { data: session } = useSession();
  const router = useRouter();

  // Check if user needs onboarding (only for brand new users)
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch("/api/users/onboarding");
          if (response.ok) {
            const data = await response.json();
            // Only redirect to onboarding if user hasn't completed it AND has no team
            // This ensures returning users go to dashboard even without a team
            if (!data.onboardingCompleted && !data.hasTeam) {
              router.push("/onboarding");
            }
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
      }
    };

    checkOnboardingStatus();
  }, [session?.user?.id, router]);

  return null; // This component only handles side effects
}
