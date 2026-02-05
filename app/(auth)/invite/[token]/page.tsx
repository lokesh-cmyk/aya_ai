"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Building2, Sparkles } from "lucide-react";
import { useSession } from "@/lib/auth-client";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { data: session } = useSession();
  const [isAccepting, setIsAccepting] = useState(false);

  // Fetch invite details
  const { data: inviteData, isLoading, error } = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const res = await fetch(`/api/teams/invite/accept?token=${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch invitation");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  // Accept invite mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/teams/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to accept invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsAccepting(true);
      setTimeout(() => {
        // User accepted invite - skip onboarding, go directly to dashboard
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteData?.invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              {error instanceof Error ? error.message : "This invitation link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invite } = inviteData;

  if (isAccepting || acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center">Invitation Accepted!</CardTitle>
            <CardDescription className="text-center">
              You have successfully joined {invite.team.name}. Redirecting...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AYA AI
            </span>
          </div>
          <CardTitle className="text-center">You&apos;re Invited!</CardTitle>
          <CardDescription className="text-center">
            You&apos;ve been invited to join an organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">{invite.team.name}</p>
                <p className="text-sm text-gray-600">Role: {invite.role}</p>
              </div>
            </div>
          </div>

          {!session ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Please sign in to accept this invitation.
              </p>
              <Button
                className="w-full"
                onClick={() => router.push(`/login?redirect=/invite/${token}`)}
              >
                Sign In to Accept
              </Button>
            </div>
          ) : session.user.email !== invite.email ? (
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                This invitation was sent to <strong>{invite.email}</strong>, but you&apos;re signed in as{" "}
                <strong>{session.user.email}</strong>. Please sign in with the correct account.
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/login?redirect=/invite/${token}`)}
              >
                Sign In with {invite.email}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Click the button below to join {invite.team.name} as {invite.role}.
              </p>
              <Button
                className="w-full"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
              {acceptMutation.isError && (
                <p className="text-sm text-red-600 text-center">
                  {acceptMutation.error instanceof Error
                    ? acceptMutation.error.message
                    : "Failed to accept invitation"}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
