"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { TeamInviteChecker } from "@/components/onboarding/TeamInviteChecker";

type OnboardingPhase = "loading" | "invite-check" | "onboarding" | "complete";

interface UserData {
  id: string;
  email: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<OnboardingPhase>("loading");
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Use server-side auth check
        const res = await fetch("/api/auth/check", { credentials: "include" });
        const data = await res.json();

        if (!data.authenticated || !data.user) {
          // Not authenticated, redirect to login
          router.push("/login");
          return;
        }

        setUserData({ id: data.user.id, email: data.user.email || "" });

        // Check onboarding status
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
        console.error("Auth check failed:", error);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  const handleComplete = () => {
    setPhase("complete");
    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  };

  const handleJoinTeam = () => {
    router.push("/dashboard");
  };

  const handleSkipToOnboarding = () => {
    setPhase("onboarding");
  };

  // Loading state
  if (phase === "loading" || !userData) {
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
