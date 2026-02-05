"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Users,
  Mail,
  Save,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  UserCheck,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

export default function OrganizationSettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [teamName, setTeamName] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "EDITOR" | "VIEWER">("EDITOR");
  const [inviteError, setInviteError] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  // Fetch team data
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to fetch team");
      const data = await res.json();
      return data.teams[0]; // Get first team for now
    },
    enabled: !!session?.user?.id,
  });

  // Fetch team members
  const { data: members } = useQuery({
    queryKey: ["team-members", teamData?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!session?.user?.id,
  });

  // Get current user's role to determine permissions
  const currentUser = members?.users?.find((u: any) => u.id === session?.user?.id);
  const currentUserRole = currentUser?.role;
  // User is admin if they have ADMIN role, OR if they're the only user in the team (team creator)
  const isAdmin = currentUserRole === "ADMIN" || (members?.users?.length === 1 && members?.users?.[0]?.id === session?.user?.id);

  // Debug logging (remove after fixing)
  console.log('[Organization] Debug:', {
    sessionUserId: session?.user?.id,
    membersCount: members?.users?.length,
    members: members?.users?.map((u: any) => ({ id: u.id, role: u.role })),
    currentUserFound: !!currentUser,
    currentUserRole,
    isAdmin,
  });

  // Fetch pending invites
  const { data: invitesData } = useQuery({
    queryKey: ["team-invites", teamData?.id],
    queryFn: async () => {
      const res = await fetch(`/api/teams/invites?teamId=${teamData?.id}`);
      if (!res.ok) return { invites: [] };
      return res.json();
    },
    enabled: !!teamData?.id,
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (payload: { email: string; role: "ADMIN" | "EDITOR" | "VIEWER" }) => {
      const res = await fetch("/api/teams/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsInviting(false);
      setInviteEmail("");
      setInviteError("");
      queryClient.invalidateQueries({ queryKey: ["team-invites"] });
      toast.success("Invitation sent successfully");
    },
    onError: (error: Error) => {
      setInviteError(error.message);
      toast.error(`Failed to send invitation: ${error.message}`);
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/teams/${teamData?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to update team");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Organization name updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update organization: ${error.message}`);
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/teams/${teamData?.id}/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove member");
      }
      return res.json();
    },
    onSuccess: () => {
      setRemovingMemberId(null);
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Team member removed");
    },
    onError: (error: Error) => {
      setRemovingMemberId(null);
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });

  // Create team mutation for users without a team
  const createTeamMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create team");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Organization created successfully!");
      setTeamName("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create organization: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  // Show create team UI if user has no team
  if (!teamData) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Create Your Organization
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            You don&apos;t have an organization yet. Create one to start inviting team members.
          </p>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Organization Details</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Enter a name for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newTeamName" className="text-sm font-medium text-gray-700">Organization Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="newTeamName"
                  type="text"
                  placeholder="My Organization"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="pl-10 bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                />
              </div>
            </div>
            <Button
              onClick={() => createTeamMutation.mutate(teamName)}
              disabled={createTeamMutation.isPending || !teamName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              {createTeamMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organization
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Organization Settings
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Manage your organization details and team members
        </p>
      </div>

      {/* Organization Stats - Mobile First */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-semibold text-gray-700">
                Total Members
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {members?.users?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-600" />
              <CardTitle className="text-sm font-semibold text-gray-700">
                Total Contacts
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {teamData?._count?.contacts || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <CardTitle className="text-sm font-semibold text-gray-700">
                Created
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm sm:text-base font-medium text-gray-900">
              {teamData?.createdAt
                ? new Date(teamData.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Organization Details */}
        <div className="lg:col-span-1">
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Organization Details</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Update your organization name and information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName" className="text-sm font-medium text-gray-700">Organization Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="teamName"
                    type="text"
                    placeholder="Acme Inc."
                    value={teamName || teamData?.name || ""}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="pl-10 bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                  />
                </div>
              </div>
              <Button
                onClick={() => updateTeamMutation.mutate(teamName)}
                disabled={updateTeamMutation.isPending || !teamName || teamName === teamData?.name}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              >
                {updateTeamMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Team Members */}
        <div className="lg:col-span-2">
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Team Members</CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Manage who has access to your organization
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button 
                    onClick={() => setIsInviting(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members?.users?.length > 0 ? (
                  members.users.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-gray-200/50 bg-white/50 hover:bg-white hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm flex-shrink-0">
                          {member.name?.charAt(0) || member.email?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{member.name || "User"}</p>
                          <p className="text-sm text-gray-500 truncate">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          member.role === "ADMIN" 
                            ? "bg-purple-100 text-purple-700" 
                            : member.role === "EDITOR"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {member.role || "EDITOR"}
                        </span>
                        {member.id !== session?.user?.id && isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove ${member.name || member.email} from the team?`)) {
                                setRemovingMemberId(member.id);
                                removeMemberMutation.mutate(member.id);
                              }
                            }}
                            disabled={removeMemberMutation.isPending && removingMemberId === member.id}
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Remove member"
                          >
                            {removeMemberMutation.isPending && removingMemberId === member.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No team members yet</p>
                  </div>
                )}
                
                {/* Pending Invites */}
                {invitesData?.invites && invitesData.invites.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200/50">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Pending Invitations
                    </h3>
                    <div className="space-y-2">
                      {invitesData.invites.map((invite: any) => (
                        <div
                          key={invite.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border border-yellow-200/50 bg-yellow-50/50 hover:bg-yellow-50 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Mail className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{invite.email}</p>
                              <p className="text-xs text-gray-600">
                                Invited as {invite.role} • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 flex-shrink-0">
                            Pending
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={isInviting} onOpenChange={setIsInviting}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-gray-200/50 bg-white/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Invite Team Member</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Send an invitation to join your organization. They will receive an email with a link to accept.
            </DialogDescription>
          </DialogHeader>
          
          <form
            className="flex flex-col gap-4 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteEmail.trim()) {
                setInviteError("Email is required");
                return;
              }
              inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="inviteEmail" className="text-sm font-semibold text-gray-700">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError("");
                }}
                required
                className="bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteRole" className="text-sm font-semibold text-gray-700">Role</Label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "EDITOR" | "VIEWER")}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
              >
                <option value="VIEWER">Viewer - Read only access</option>
                <option value="EDITOR">Editor - Can create and edit</option>
                <option value="ADMIN">Admin - Full access</option>
              </select>
            </div>

            {inviteError && (
              <div className="p-3 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl text-sm text-red-600 flex items-start gap-2 animate-in fade-in duration-200">
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteMutation.isSuccess && (
              <div className="p-3 bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-xl text-sm text-green-600 flex items-start gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Invitation sent!</p>
                  <p className="text-xs mt-1 text-green-700">
                    {inviteMutation.data?.invite?.inviteUrl && (
                      <>Invite link: <code className="text-xs bg-green-100 px-1 py-0.5 rounded">{inviteMutation.data.invite.inviteUrl}</code></>
                    )}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsInviting(false);
                  setInviteEmail("");
                  setInviteError("");
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending || !inviteEmail.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
