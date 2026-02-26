"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { TeamInviteChecker } from "@/components/onboarding/TeamInviteChecker";

type OnboardingPhase = "loading" | "invite-check" | "onboarding" | "complete" | "error";

interface UserData {
  id: string;
  email: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<OnboardingPhase>("loading");
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Get user data - middleware already ensures we're authenticated
        // Don't redirect to login here, that causes loops
        const res = await fetch("/api/auth/check", { credentials: "include" });
        const data = await res.json();

        if (!data.authenticated || !data.user) {
          // Show error state instead of redirecting (prevents loop)
          setPhase("error");
          return;
        }

        setUserData({ id: data.user.id, email: data.user.email || "" });

        // Check if user already completed onboarding
        const onboardingRes = await fetch("/api/users/onboarding", { credentials: "include" });
        if (onboardingRes.ok) {
          const onboardingData = await onboardingRes.json();
          if (onboardingData.onboardingCompleted || onboardingData.hasTeam) {
            router.push("/dashboard");
            return;
          }
        }

        // User needs onboarding
        setPhase("invite-check");
      } catch (error) {
        console.error("Initialization failed:", error);
        setPhase("error");
      }
    };

    initialize();
  }, [router]);

  const handleComplete = () => {
    setPhase("complete");
    localStorage.setItem("platform-tour-completed", "false");
    setTimeout(() => {
      router.push("/dashboard?tour=start");
    }, 1000);
  };

  const handleJoinTeam = () => {
    router.push("/dashboard");
  };

  const handleSkipToOnboarding = () => {
    setPhase("onboarding");
  };

  // Loading state
  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state - don't redirect to login (causes loop), show retry option
  if (phase === "error" || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Error</h2>
          <p className="text-gray-600 mb-6">Unable to load your session. Please try again.</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Go to Login
            </button>
          </div>
        </div>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">All set!</h2>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Invite check phase
  if (phase === "invite-check") {
    return (
      <TeamInviteChecker
        userId={userData.id}
        userEmail={userData.email}
        onJoinTeam={handleJoinTeam}
        onSkipToOnboarding={handleSkipToOnboarding}
      />
    );
  }

  // Onboarding phase
  return (
    <OnboardingFlow
      userId={userData.id}
      onComplete={handleComplete}
    />
  );
}
