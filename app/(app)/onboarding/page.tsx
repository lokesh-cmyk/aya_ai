"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { TeamInviteChecker } from "@/components/onboarding/TeamInviteChecker";

type OnboardingPhase = "loading" | "invite-check" | "onboarding" | "complete";

interface UserData {
  id: string;
  email: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [phase, setPhase] = useState<OnboardingPhase>("loading");
  const [userData, setUserData] = useState<UserData | null>(null);
  const hasCheckedRef = useRef(false);

  // Use server-side auth check as fallback when client-side session is slow
  useEffect(() => {
    // Prevent multiple checks
    if (hasCheckedRef.current) return;

    const checkAuth = async () => {
      // First try to use client-side session
      if (!isPending && session?.user?.id) {
        hasCheckedRef.current = true;
        setUserData({ id: session.user.id, email: session.user.email || "" });
        await checkOnboardingStatus(session.user.id);
        return;
      }

      // If client session is still pending after 2 seconds, use server-side check
      if (isPending) {
        const timeout = setTimeout(async () => {
          if (!hasCheckedRef.current) {
            try {
              const res = await fetch("/api/auth/check", { credentials: "include" });
              const data = await res.json();
              if (data.authenticated && data.user) {
                hasCheckedRef.current = true;
                setUserData({ id: data.user.id, email: data.user.email || "" });
                await checkOnboardingStatus(data.user.id);
              }
            } catch (error) {
              console.error("Server auth check failed:", error);
            }
          }
        }, 2000);
        return () => clearTimeout(timeout);
      }
    };

    const checkOnboardingStatus = async (userId: string) => {
      try {
        const response = await fetch("/api/users/onboarding", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.onboardingCompleted || data.hasTeam) {
            router.push("/dashboard");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      }
      setPhase("invite-check");
    };

    checkAuth();
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

  // Loading state - show while checking auth
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
        userId={userData.id}
        userEmail={userData.email}
        onJoinTeam={handleJoinTeam}
        onSkipToOnboarding={handleSkipToOnboarding}
      />
    );
  }

  // Onboarding phase - show the regular onboarding flow
  return (
    <OnboardingFlow
      userId={userData.id}
      onComplete={handleComplete}
    />
  );
}

