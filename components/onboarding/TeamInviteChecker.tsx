"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Users,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Building2,
  Clock,
  Shield,
} from "lucide-react";

interface PendingInvite {
  id: string;
  teamId: string;
  teamName: string;
  role: string;
  expiresAt: string;
  teamCode: string;
}

interface TeamInviteCheckerProps {
  userId: string;
  userEmail: string;
  onJoinTeam: (teamId: string, teamName: string) => void;
  onSkipToOnboarding: () => void;
}

export function TeamInviteChecker({
  userId,
  userEmail,
  onJoinTeam,
  onSkipToOnboarding,
}: TeamInviteCheckerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [teamCode, setTeamCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState<{ teamName: string } | null>(null);

  // Check for pre-OAuth code in localStorage
  useEffect(() => {
    const pendingCode = localStorage.getItem("pendingTeamCode");
    if (pendingCode) {
      localStorage.removeItem("pendingTeamCode");
      setTeamCode(pendingCode);
      setShowCodeInput(true);
    }
  }, []);

  // Fetch pending invites
  useEffect(() => {
    const fetchPendingInvites = async () => {
      try {
        const response = await fetch("/api/teams/pending-invites");
        if (response.ok) {
          const data = await response.json();
          setPendingInvites(data.invites || []);
        }
      } catch (error) {
        console.error("Error fetching pending invites:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingInvites();
  }, []);

  const handleAcceptInvite = async (invite: PendingInvite) => {
    setError("");
    setIsJoining(true);

    try {
      const response = await fetch("/api/teams/join-by-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamCode: invite.teamCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to join team");
        setIsJoining(false);
        return;
      }

      setJoinSuccess({ teamName: invite.teamName });
      setTimeout(() => {
        onJoinTeam(invite.teamId, invite.teamName);
      }, 1500);
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsJoining(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!teamCode.trim()) {
      setError("Please enter a team code");
      return;
    }

    setError("");
    setIsJoining(true);

    try {
      const response = await fetch("/api/teams/join-by-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamCode: teamCode.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to join team");
        setIsJoining(false);
        return;
      }

      setJoinSuccess({ teamName: data.team.name });
      setTimeout(() => {
        onJoinTeam(data.team.id, data.team.name);
      }, 1500);
    } catch (err) {
      console.error("Error joining with code:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsJoining(false);
    }
  };

  const formatRole = (role: string) => {
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

  const formatExpiresAt = (expiresAt: string) => {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Expires soon";
    if (diffDays === 1) return "Expires in 1 day";
    return `Expires in ${diffDays} days`;
  };

  // Success screen
  if (joinSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to {joinSuccess.teamName}!
          </h2>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking for pending invitations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AYA AI
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Welcome to AYA AI!
          </h1>
          <p className="text-gray-600 mb-6 text-center">
            Let's get you set up with your team
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-medium text-gray-700">
                You have pending team invitations:
              </h3>
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="p-4 border-2 border-blue-200 bg-blue-50 rounded-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-gray-900">
                          {invite.teamName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span>{formatRole(invite.role)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatExpiresAt(invite.expiresAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvite(invite)}
                      disabled={isJoining}
                    >
                      {isJoining ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Accept
                          <CheckCircle2 className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manual code entry */}
          <div className="space-y-3">
            {pendingInvites.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowCodeInput(!showCodeInput)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showCodeInput
                  ? "Hide code entry"
                  : "Have a different team code?"}
              </button>
            ) : (
              <h3 className="text-sm font-medium text-gray-700">
                Have a team invite code?
              </h3>
            )}

            {(showCodeInput || pendingInvites.length === 0) && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Enter team code (e.g., ABC123)"
                      value={teamCode}
                      onChange={(e) => {
                        setTeamCode(e.target.value.toUpperCase());
                        setError("");
                      }}
                      disabled={isJoining}
                      className="uppercase"
                      maxLength={6}
                    />
                  </div>
                  <Button
                    onClick={handleJoinWithCode}
                    disabled={isJoining || !teamCode.trim()}
                  >
                    {isJoining ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Join
                        <Users className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Enter the 6-character code from your team invitation email
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Create own organization */}
          <Button
            variant="outline"
            className="w-full"
            onClick={onSkipToOnboarding}
            disabled={isJoining}
          >
            Create my own organization
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Email info */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Signed in as <span className="font-medium">{userEmail}</span>
        </p>
      </div>
    </div>
  );
}
