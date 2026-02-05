"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, signIn } from "@/lib/auth-client";
import { SignUpPage, Testimonial } from "@/components/ui/sign-up";

const testimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "Sarah Chen",
    handle: "@sarahdigital",
    text: "AYA has completely transformed how I manage my inbox. Everything in one place!"
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Marcus Johnson",
    handle: "@marcustech",
    text: "The AI drafts are incredible. They actually sound like me. Huge time saver."
  },
];

export default function SignupPageWrapper() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (data: {
    name: string;
    email: string;
    password: string;
    teamName?: string;
    teamCode?: string;
    joinTeam: boolean;
  }) => {
    setError("");

    // Validation
    if (!data.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!data.email.trim()) {
      setError("Email is required");
      return;
    }
    if (data.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (data.joinTeam && !data.teamCode?.trim()) {
      setError("Team code is required to join a team");
      return;
    }
    if (!data.joinTeam && !data.teamName?.trim()) {
      setError("Organization name is required");
      return;
    }

    setIsLoading(true);

    try {
      // First create user through Better Auth
      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create account");
        setIsLoading(false);
        return;
      }

      // Then assign to team/organization
      let hasTeam = false;
      if (result.data?.user?.id) {
        try {
          const teamResponse = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: result.data.user.id,
              email: data.email,
              teamName: data.joinTeam ? undefined : data.teamName,
              teamCode: data.joinTeam ? data.teamCode : undefined,
            }),
          });

          if (!teamResponse.ok) {
            const errorData = await teamResponse.json();
            console.error("Team assignment error:", errorData);
            setError(errorData.error || "Failed to join team. Please try again.");
            setIsLoading(false);
            return;
          }

          const teamData = await teamResponse.json();
          hasTeam = !!teamData.teamId || data.joinTeam;
        } catch (teamError) {
          console.error("Team assignment error:", teamError);
        }
      }

      // Success - redirect based on whether user has a team
      if (hasTeam && data.joinTeam) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
      router.refresh();
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async (teamCode?: string) => {
    setError("");
    setIsLoading(true);
    try {
      // Store team code in localStorage before OAuth if provided
      if (teamCode) {
        localStorage.setItem("pendingTeamCode", teamCode.toUpperCase());
      }

      await signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err: any) {
      setError(err?.message || "Failed to sign up with Google");
      setIsLoading(false);
      localStorage.removeItem("pendingTeamCode");
    }
  };

  return (
    <SignUpPage
      title={
        <span className="font-normal text-[#111] tracking-tight">
          Create your account
        </span>
      }
      description="Get started with AYA and transform how you manage communications"
      heroImageSrc="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&q=80"
      testimonials={testimonials}
      onSignUp={handleSignUp}
      onGoogleSignUp={handleGoogleSignUp}
      isLoading={isLoading}
      error={error}
      showGoogleButton={true}
    />
  );
}
