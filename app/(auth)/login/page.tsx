"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { SignInPage, Testimonial } from "@/components/ui/sign-in";

type AuthProviders = { google: boolean };

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
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "David Martinez",
    handle: "@davidcreates",
    text: "Morning briefings have become essential. I know exactly what needs my attention."
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<AuthProviders | null>(null);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.ok ? res.json() : { google: false })
      .then((data: AuthProviders) => setProviders(data))
      .catch(() => setProviders({ google: false }));
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password");
      } else {
        router.push("/inbox");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      await signIn.social({
        provider: "google",
      });
    } catch (err: any) {
      setError(err?.message || "Failed to sign in with Google");
      setIsLoading(false);
    }
  };

  const handleResetPassword = () => {
    router.push("/forgot-password");
  };

  return (
    <SignInPage
      title={
        <span className="font-normal text-[#111] tracking-tight">
          Welcome back
        </span>
      }
      description="Sign in to your AYA account and take control of your inbox"
      heroImageSrc="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80"
      testimonials={testimonials}
      onSignIn={handleSignIn}
      onGoogleSignIn={handleGoogleSignIn}
      onResetPassword={handleResetPassword}
      isLoading={isLoading}
      error={error}
      showGoogleButton={providers?.google ?? false}
    />
  );
}
