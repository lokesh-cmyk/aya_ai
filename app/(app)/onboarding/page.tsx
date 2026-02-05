"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { TeamInviteChecker } from "@/components/onboarding/TeamInviteChecker";

type OnboardingPhase = "loading" | "invite-check" | "onboarding" | "complete";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [phase, setPhase] = useState<OnboardingPhase>("loading");

  // Check if user has completed onboarding or already has a team - skip to dashboard
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isPending && session?.user?.id) {
        try {
          // Check user's onboarding status
          const response = await fetch("/api/users/onboarding");
          if (response.ok) {
            const data = await response.json();
            // If user has completed onboarding OR has a team, redirect to dashboard
            // This handles returning users who signed up earlier
            if (data.onboardingCompleted || data.hasTeam) {
              router.push("/dashboard");
              return;
            }
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
        // New user who hasn't completed onboarding - show invite checker
        setPhase("invite-check");
      }
      // Note: Don't redirect to /login here when session is undefined
      // The middleware handles unauthenticated users, and this prevents
      // a redirect loop when session is briefly undefined after OAuth
    };

    checkOnboardingStatus();
  }, [session, isPending, router]);

  const handleComplete = () => {
    setPhase("complete");
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  };

  const handleJoinTeam = (teamId: string, teamName: string) => {
    // User joined a team via invite - redirect to dashboard
    router.push("/dashboard");
  };

  const handleSkipToOnboarding = () => {
    // User wants to create their own organization
    setPhase("onboarding");
  };

  // Loading state
  if (isPending || !session || phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Complete state
  if (phase === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            All set!
          </h2>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Invite check phase - show team invite checker first
  if (phase === "invite-check") {
    return (
      <TeamInviteChecker
        userId={session.user.id}
        userEmail={session.user.email || ""}
        onJoinTeam={handleJoinTeam}
        onSkipToOnboarding={handleSkipToOnboarding}
      />
    );
  }

  // Onboarding phase - show the regular onboarding flow
  return (
    <OnboardingFlow
      userId={session.user.id}
      onComplete={handleComplete}
    />
  );
}

