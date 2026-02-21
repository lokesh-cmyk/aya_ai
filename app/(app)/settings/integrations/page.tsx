// app/integrations/page.tsx
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Calendar, ListTodo, ExternalLink, Instagram, Linkedin, MessageSquare, Sparkles, Plug, Zap, Shield, Download, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";

import { useIntegrations } from "@/hooks/useIntegrations";
import { toast } from "sonner";
import { PlatformCard } from "@/lib/integrations/PlatformCard";
import { platforms } from "@/lib/config/platforms";
import { SlackChannelSelector } from "@/components/integrations/SlackChannelSelector";
import { ClickUpWorkspacePicker } from "@/components/integrations/ClickUpWorkspacePicker";
import { WhatsAppConnectModal } from "@/components/integrations/WhatsAppConnectModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** AI Chat integrations (Composio): Google Calendar, ClickUp, Instagram. Status reflects connections made here or in AI Chat. */
function ComposioIntegrationsSection({ queryClient, onClickUpConnected }: { queryClient: ReturnType<typeof useQueryClient>; onClickUpConnected: () => void }) {
  const { data: session } = useSession();
  const [connectingApp, setConnectingApp] = useState<string | null>(null);
  const prevClickUpRef = useRef<boolean | undefined>(undefined);
  const { data: composioStatus, isLoading: composioLoading } = useQuery({
    queryKey: ["composio-status", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/integrations/composio/status");
      if (!res.ok) return { googleCalendar: false, clickUp: false, instagram: [], linkedin: false, microsoftTeams: false, zoom: false };
      return res.json();
    },
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: true,
  });

  // Auto-open workspace picker when ClickUp transitions from disconnected → connected
  useEffect(() => {
    if (composioLoading || !composioStatus) return;
    const wasConnected = prevClickUpRef.current;
    const isNowConnected = !!composioStatus.clickUp;
    prevClickUpRef.current = isNowConnected;

    // Trigger on transition: was false → now true (just connected)
    if (wasConnected === false && isNowConnected) {
      onClickUpConnected();
    }
  }, [composioStatus, composioLoading, onClickUpConnected]);

  const connectComposioMutation = useMutation({
    mutationFn: async (app: "googlecalendar" | "clickup" | "instagram" | "linkedin" | "microsoft_teams" | "zoom") => {
      const res = await fetch(`/api/integrations/composio/connect?app=${app}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get connect URL");
      }
      const data = await res.json();
      if (!data?.url) throw new Error("No connect URL");
      window.location.href = data.url;
    },
    onMutate: (app) => {
      setConnectingApp(app);
      toast.loading("Connecting...", { id: "composio-connect" });
    },
    onSettled: () => setConnectingApp(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composio-status"] });
      toast.success("Redirecting to connect...", { id: "composio-connect" });
    },
    onError: (error: Error) => {
      toast.error(`Connection failed: ${error.message}`, { id: "composio-connect" });
    },
  });

  const disconnectComposioMutation = useMutation({
    mutationFn: async (connectedAccountId: string) => {
      const res = await fetch(`/api/integrations/composio/disconnect?connectedAccountId=${connectedAccountId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to disconnect");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composio-status"] });
      toast.success("Instagram account disconnected", { id: "composio-disconnect" });
    },
    onError: (error: Error) => {
      toast.error(`Disconnect failed: ${error.message}`, { id: "composio-disconnect" });
    },
  });

  const apps: Array<{ id: "googlecalendar" | "clickup" | "instagram" | "linkedin" | "microsoft_teams" | "zoom"; name: string; description: string; icon: typeof Calendar }> = [
    { id: "googlecalendar", name: "Google Calendar", description: "Sync events & check availability via AI chat", icon: Calendar },
    { id: "clickup", name: "ClickUp", description: "Manage tasks, spaces & lists with AI assistance", icon: ListTodo },
    { id: "instagram", name: "Instagram", description: "Access DMs & insights through AI chat", icon: Instagram },
    { id: "linkedin", name: "LinkedIn", description: "Manage posts, profile & company info via AI", icon: Linkedin },
    { id: "microsoft_teams", name: "Microsoft Teams", description: "Manage chats, channels, meetings & files via AI", icon: MessageSquare },
    { id: "zoom", name: "Zoom", description: "Create meetings, manage recordings & webinars via AI", icon: Video },
  ];

  if (composioLoading || !session?.user?.id) return null;

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Chat Integrations</h2>
          <p className="text-sm text-gray-500">Connect apps to supercharge your AI conversations</p>
        </div>
      </div>

      {/* AI Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apps.map((app) => {
          const Icon = app.icon;
          const isConnected = app.id === "googlecalendar" ? composioStatus?.googleCalendar : app.id === "clickup" ? composioStatus?.clickUp : app.id === "instagram" ? (composioStatus?.instagram?.length > 0) : app.id === "microsoft_teams" ? composioStatus?.microsoftTeams : app.id === "zoom" ? composioStatus?.zoom : composioStatus?.linkedin;
          const isConnecting = connectingApp === app.id;
          return (
            <div
              key={app.id}
              className="group relative bg-white/60 backdrop-blur-xl rounded-3xl border border-gray-200/60 p-5 shadow-sm hover:shadow-lg hover:bg-white/80 hover:border-gray-300/60 transition-all duration-300 ease-out"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 ease-out">
                  <Icon className="w-6 h-6 text-indigo-600" />
                </div>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-500/10 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-500/20">
                    Not connected
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">{app.name}</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">{app.description}</p>
              {app.id === "instagram" ? (
                <div className="space-y-3">
                  {/* Connected accounts list */}
                  {(composioStatus?.instagram ?? []).map((account: any, index: number) => (
                    <div key={account.id} className="flex items-center justify-between bg-emerald-500/5 rounded-2xl px-4 py-2.5 border border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {account.username ? `@${account.username}` : `Account ${index + 1}`}
                        </span>
                      </div>
                      <button
                        onClick={() => disconnectComposioMutation.mutate(account.id)}
                        disabled={disconnectComposioMutation.isPending}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Disconnect
                      </button>
                    </div>
                  ))}

                  {/* Add account button (if < 3) */}
                  {(composioStatus?.instagram ?? []).length < 3 ? (
                    <Button
                      className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-300 ease-out h-10 text-sm"
                      onClick={() => connectComposioMutation.mutate("instagram")}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {(composioStatus?.instagram ?? []).length === 0 ? "Connect Instagram" : "Add Another Account"}
                        </>
                      )}
                    </Button>
                  ) : (
                    <p className="text-xs text-gray-400 text-center">Maximum 3 accounts connected</p>
                  )}
                </div>
              ) : isConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">Ready to use in AI Chat</span>
                  </div>
                  {app.id === "clickup" && (
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl border-indigo-200/60 text-indigo-600 hover:bg-indigo-50/50 h-10"
                      onClick={onClickUpConnected}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Import from ClickUp
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-300 ease-out h-11"
                  onClick={() => connectComposioMutation.mutate(app.id)}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect {app.name}
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { data: session } = useSession();
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [slackChannelDialogOpen, setSlackChannelDialogOpen] = useState(false);
  const [slackIntegrationId, setSlackIntegrationId] = useState<string | null>(null);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnectAccountId, setDisconnectAccountId] = useState<string | null>(null);
  const [clickUpPickerOpen, setClickUpPickerOpen] = useState(false);

  // WhatsApp Inbox state
  const [waConnectModalOpen, setWaConnectModalOpen] = useState(false);
  const [waConnectSlot, setWaConnectSlot] = useState(1);
  const [waConnectSessionId, setWaConnectSessionId] = useState<string | null>(null);

  // Fetch WhatsApp sessions
  const { data: waSessions, refetch: refetchWaSessions } = useQuery({
    queryKey: ["whatsapp-inbox-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/whatsapp-inbox/sessions");
      if (!res.ok) return { sessions: [] };
      return res.json();
    },
    enabled: !!session?.user,
  });

  const handleWaConnect = async (slot: number) => {
    try {
      const res = await fetch("/api/integrations/whatsapp-inbox/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      const data = await res.json();
      if (data.session) {
        setWaConnectSessionId(data.session.id);
        setWaConnectSlot(slot);
        setWaConnectModalOpen(true);
      } else {
        toast.error(data.error || "Failed to start WhatsApp connection");
      }
    } catch {
      toast.error("Failed to start WhatsApp connection");
    }
  };

  const handleWaDisconnect = async (sessionId: string) => {
    try {
      await fetch(`/api/integrations/whatsapp-inbox/sessions/${sessionId}`, {
        method: "DELETE",
      });
      refetchWaSessions();
      toast.success("WhatsApp disconnected");
    } catch {
      toast.error("Failed to disconnect WhatsApp");
    }
  };

  const handleClickUpConnected = useCallback(() => {
    setClickUpPickerOpen(true);
  }, []);

  const {
    isLoading,
    connecting,
    setConnecting,
    getConnectedAccount,
    connectMutation,
    disconnectMutation,
    queryClient,
  } = useIntegrations();

  // Parse URL parameters for highlighting
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const selectedParam = params.get("selected");
    if (selectedParam) {
      const ids = selectedParam.split(",").map(id => id.trim()).filter(Boolean);
      if (ids.length) setHighlighted(new Set(ids));
    }
  }, []);

  // Listen for Slack connection event to open channel selector with 5 second delay
  useEffect(() => {
    const handleSlackConnected = (event: CustomEvent) => {
      const integrationId = event.detail?.integrationId;
      if (integrationId) {
        setSlackIntegrationId(integrationId);
        setTimeout(() => {
          setSlackChannelDialogOpen(true);
        }, 5000);
      }
    };

    window.addEventListener('slack-connected', handleSlackConnected as EventListener);
    return () => {
      window.removeEventListener('slack-connected', handleSlackConnected as EventListener);
    };
  }, []);

  // Email sync mutations
  const syncGmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/integrations/gmail/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to sync Gmail');
      return res.json();
    },
    onMutate: () => {
      toast.loading("Syncing Gmail...", { id: "gmail-sync" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success("Gmail synced successfully", { id: "gmail-sync" });
    },
    onError: (error: Error) => {
      toast.error(`Gmail sync failed: ${error.message}`, { id: "gmail-sync" });
    },
  });

  const syncOutlookMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/integrations/outlook/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to sync Outlook');
      return res.json();
    },
    onMutate: () => {
      toast.loading("Syncing Outlook...", { id: "outlook-sync" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success("Outlook synced successfully", { id: "outlook-sync" });
    },
    onError: (error: Error) => {
      toast.error(`Outlook sync failed: ${error.message}`, { id: "outlook-sync" });
    },
  });

  const handleConnect = (platformId: string) => {
    if (connecting) return;
    setConnecting(platformId);
    connectMutation.mutate(platformId, {
      onError: () => {
        setConnecting(null);
      },
    });
  };

  const handleDisconnect = (accountId: string) => {
    setDisconnectAccountId(accountId);
    setDisconnectDialogOpen(true);
  };

  const confirmDisconnect = async () => {
    if (disconnectAccountId) {
      try {
        await disconnectMutation.mutateAsync(disconnectAccountId);
        setDisconnectDialogOpen(false);
        setDisconnectAccountId(null);
        toast.success("Integration disconnected");
      } catch (error: any) {
        toast.error(`Failed to disconnect: ${error?.message || "Unknown error"}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-white/60 backdrop-blur-xl border border-gray-200/60 flex items-center justify-center shadow-lg">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
          <p className="text-gray-500 font-medium">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-gray-200/60 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 flex items-center justify-center">
                <Plug className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
                <p className="text-sm text-gray-500">Connect your favorite platforms to AYA AI</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {session?.user && (
                <div className="px-4 py-2 rounded-2xl bg-gray-500/5 backdrop-blur-sm border border-gray-200/60">
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm font-medium text-gray-700 truncate max-w-[180px]">{session.user.email}</p>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['db-integrations'] });
                  queryClient.refetchQueries({ queryKey: ['db-integrations'] });
                  queryClient.invalidateQueries({ queryKey: ['composio-status'] });
                  queryClient.refetchQueries({ queryKey: ['composio-status'] });
                }}
                className="rounded-2xl border-gray-200/60 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all duration-300 ease-out"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {connectMutation.isSuccess && (
          <div className="flex items-center gap-3 bg-emerald-500/10 backdrop-blur-xl rounded-3xl border border-emerald-500/20 p-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-emerald-800">Platform connected successfully!</p>
              <p className="text-sm text-emerald-600">Your integration is now active and ready to use.</p>
            </div>
          </div>
        )}

        {connectMutation.isError && (
          <div className="flex items-center gap-3 bg-red-500/10 backdrop-blur-xl rounded-3xl border border-red-500/20 p-4">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-red-800">Connection failed</p>
              <p className="text-sm text-red-600">
                {connectMutation.error instanceof Error
                  ? connectMutation.error.message
                  : 'An unexpected error occurred. Please try again.'}
              </p>
            </div>
          </div>
        )}

        {/* AI Chat integrations */}
        <ComposioIntegrationsSection queryClient={queryClient} onClickUpConnected={handleClickUpConnected} />

        {/* Communication Platforms Section */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Communication Platforms</h2>
              <p className="text-sm text-gray-500">Centralize all your messages in one unified inbox</p>
            </div>
          </div>

          {/* Platform Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const account = getConnectedAccount(platform.id);
              const isConnecting = connecting === platform.id;
              const isHighlighted = highlighted.has(platform.id);
              const canSync = ['gmail', 'outlook'].includes(platform.id);
              const isSyncing = platform.id === 'gmail'
                ? syncGmailMutation.isPending
                : syncOutlookMutation.isPending;

              return (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  account={account}
                  isConnecting={isConnecting}
                  isHighlighted={isHighlighted}
                  isSyncing={isSyncing}
                  canSync={canSync}
                  onConnect={() => handleConnect(platform.id)}
                  onDisconnect={handleDisconnect}
                  onSync={canSync ? () => {
                    if (platform.id === 'gmail') syncGmailMutation.mutate();
                    else if (platform.id === 'outlook') syncOutlookMutation.mutate();
                  } : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* WhatsApp Inbox Section */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-500/10 backdrop-blur-sm border border-green-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">WhatsApp Inbox</h2>
              <p className="text-sm text-gray-500">Connect up to 3 WhatsApp numbers to receive and reply to DMs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((slot) => {
              const slotSession = (waSessions?.sessions || []).find(
                (s: any) => s.slot === slot
              );

              return (
                <div
                  key={slot}
                  className="bg-white/60 backdrop-blur-xl rounded-3xl border border-gray-200/60 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">Slot {slot}</span>
                    {slotSession?.status === "connected" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Connected
                      </span>
                    )}
                  </div>

                  {slotSession?.status === "connected" ? (
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-gray-900">{slotSession.displayName || "WhatsApp"}</p>
                        <p className="text-sm text-gray-500">{slotSession.phone}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleWaDisconnect(slotSession.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : slotSession?.status === "connecting" || slotSession?.status === "qr_ready" ? (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                      <p className="text-sm text-gray-500">Connecting...</p>
                    </div>
                  ) : (
                    <Button
                      className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white mt-2"
                      onClick={() => handleWaConnect(slot)}
                    >
                      Connect WhatsApp
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* WhatsApp Connect Modal */}
        <WhatsAppConnectModal
          open={waConnectModalOpen}
          onClose={() => {
            setWaConnectModalOpen(false);
            setWaConnectSessionId(null);
            refetchWaSessions();
          }}
          onConnected={() => {
            refetchWaSessions();
          }}
          sessionId={waConnectSessionId}
          slot={waConnectSlot}
        />

        {/* Security Info Card */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-gray-200/60 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-7 h-7 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Enterprise-Grade Security</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                All integrations use OAuth 2.0 and are encrypted with industry-standard protocols. Your credentials are never stored in plain text.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 font-medium text-sm">256-bit SSL</span>
            </div>
          </div>
        </div>

        {/* Slack Channel Selector Dialog */}
        {slackIntegrationId && (
          <SlackChannelSelector
            open={slackChannelDialogOpen}
            onClose={() => {
              setSlackChannelDialogOpen(false);
              setSlackIntegrationId(null);
            }}
            integrationId={slackIntegrationId}
          />
        )}

        {/* ClickUp Workspace Picker Dialog */}
        <ClickUpWorkspacePicker
          open={clickUpPickerOpen}
          onClose={() => setClickUpPickerOpen(false)}
        />

        {/* Disconnect Confirmation Dialog */}
        <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
          <AlertDialogContent className="rounded-3xl border-gray-200/60 bg-white/80 backdrop-blur-xl shadow-xl">
            <AlertDialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-lg font-semibold">Disconnect Integration?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-500">
                You will no longer receive messages or updates from this platform. You can reconnect it anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel
                onClick={() => {
                  setDisconnectDialogOpen(false);
                  setDisconnectAccountId(null);
                }}
                className="rounded-2xl border-gray-200/60 bg-white/60 backdrop-blur-sm"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDisconnect}
                className="rounded-2xl bg-red-600 hover:bg-red-700 text-white"
              >
                {disconnectMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
