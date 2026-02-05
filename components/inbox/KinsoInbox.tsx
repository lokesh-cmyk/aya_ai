"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "@/lib/auth-client";
import { MessageChannel } from "@/app/generated/prisma/enums";
import { EmailViewer } from "./EmailViewer";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";

// Integration icons (use real platform logos)
const integrations = [
  { name: "Gmail", logo: "/logos/gmail.svg" },
  { name: "Instagram", logo: "/logos/instagram.svg" },
  { name: "LinkedIn", logo: "/logos/linkedin.svg" },
  { name: "Slack", logo: "/logos/slack.svg" },
  { name: "WhatsApp", logo: "/logos/whatsapp.svg" },
  { name: "Teams", logo: "/logos/teams.svg" },
];

interface Contact {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  isGmail?: boolean;
  isSlack?: boolean;
  isInstagram?: boolean;
  messages: Array<{
    id: string;
    content: string;
    channel: MessageChannel;
    direction: string;
    createdAt: string;
    readAt?: string;
    subject?: string;
    from?: string;
    labels?: string[];
    metadata?: any;
    externalId?: string;
    threadId?: string;
  }>;
  _count: {
    messages: number;
  };
}

interface SelectedMessage {
  contact: Contact;
  message: Contact['messages'][0];
}

export function UnifiedBoxInbox() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<SelectedMessage | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: session, isPending: sessionLoading } = useSession();

  // Fetch contacts with latest messages
  const { data: contactsData, isLoading: contactsLoading, refetch: refetchContacts, error: contactsError } = useQuery({
    queryKey: ['contacts', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '50');

      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch Gmail emails using Gmail API
  const { data: gmailData, isLoading: gmailLoading, refetch: refetchGmail, error: gmailError, isSuccess: gmailSuccess } = useQuery({
    queryKey: ['gmail-emails', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('query', `in:inbox ${searchQuery}`);
      }
      params.append('maxResults', '50');

      const res = await fetch(`/api/emails/gmail?${params}`);
      if (!res.ok) {
        console.warn('Failed to fetch Gmail emails:', res.statusText);
        return { contacts: [], connected: false };
      }
      const data = await res.json();
      return { ...data, connected: true };
    },
    refetchInterval: 10000,
    retry: 1,
  });

  // Fetch Slack messages
  const { data: slackData, isLoading: slackLoading, error: slackError, refetch: refetchSlack, isSuccess: slackSuccess } = useQuery({
    queryKey: ['slack-messages', searchQuery, selectedIntegration],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '50');

      const res = await fetch(`/api/integrations/slack/messages?${params}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.warn('Failed to fetch Slack messages:', res.statusText, errorData);
        return { contacts: [], connected: false };
      }
      const data = await res.json();
      return { ...data, connected: true };
    },
    refetchInterval: 10000,
    retry: 1,
    enabled: true, // Always enabled, filtering happens in UI
  });

  // Fetch Instagram DMs (Composio)
  const { data: instagramData, isLoading: instagramLoading, refetch: refetchInstagram, error: instagramError, isSuccess: instagramSuccess } = useQuery({
    queryKey: ['instagram-messages', selectedIntegration],
    queryFn: async () => {
      const res = await fetch('/api/integrations/instagram/messages');
      if (!res.ok) {
        console.warn('Failed to fetch Instagram messages:', res.statusText);
        return { contacts: [], connected: false };
      }
      const data = await res.json();
      return { ...data, connected: true };
    },
    refetchInterval: 10000,
    retry: 1,
    enabled: true,
  });

  // Fetch allowed email addresses for filtering
  const { data: allowedEmailsData } = useQuery({
    queryKey: ['allowed-emails', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return { contacts: [], teamMembers: [] };
      const res = await fetch('/api/inbox/allowed-emails');
      if (!res.ok) return { contacts: [], teamMembers: [] };
      return res.json();
    },
    enabled: !!session?.user?.id,
  });

  // Create Set of allowed email addresses (case-insensitive)
  const allowedEmails = new Set<string>();
  allowedEmailsData?.contacts?.forEach((contact: { email?: string }) => {
    if (contact.email) {
      allowedEmails.add(contact.email.toLowerCase());
    }
  });
  allowedEmailsData?.teamMembers?.forEach((member: { email: string }) => {
    if (member.email) {
      allowedEmails.add(member.email.toLowerCase());
    }
  });

  // Handle manual sync
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    toast.info("Syncing messages...", { id: "sync-toast" });

    try {
      await Promise.all([
        refetchContacts(),
        refetchGmail(),
        refetchSlack(),
        refetchInstagram(),
      ]);
      toast.success("Messages synced successfully", { id: "sync-toast" });
    } catch (error) {
      toast.error("Failed to sync some channels", { id: "sync-toast" });
    } finally {
      setIsSyncing(false);
    }
  }, [refetchContacts, refetchGmail, refetchSlack, refetchInstagram]);

  // Connection status for integrations
  const getIntegrationStatus = (name: string): 'connected' | 'error' | 'loading' | 'disconnected' => {
    switch (name) {
      case 'Gmail':
        if (gmailLoading) return 'loading';
        if (gmailError) return 'error';
        if (gmailData?.connected && gmailData?.contacts?.length > 0) return 'connected';
        return 'disconnected';
      case 'Slack':
        if (slackLoading) return 'loading';
        if (slackError) return 'error';
        if (slackData?.connected && slackData?.contacts?.length > 0) return 'connected';
        return 'disconnected';
      case 'Instagram':
        if (instagramLoading) return 'loading';
        if (instagramError) return 'error';
        if (instagramData?.connected && instagramData?.contacts?.length > 0) return 'connected';
        return 'disconnected';
      default:
        return 'disconnected';
    }
  };

  // Status indicator component
  const StatusIndicator = ({ status }: { status: 'connected' | 'error' | 'loading' | 'disconnected' }) => {
    if (status === 'loading') {
      return <Loader2 className="w-3 h-3 text-blue-500 animate-spin absolute -bottom-0.5 -right-0.5" />;
    }
    if (status === 'connected') {
      return <CheckCircle2 className="w-3 h-3 text-green-500 absolute -bottom-0.5 -right-0.5 bg-white rounded-full" />;
    }
    if (status === 'error') {
      return <XCircle className="w-3 h-3 text-red-500 absolute -bottom-0.5 -right-0.5 bg-white rounded-full" />;
    }
    return null;
  };

  const regularContacts: Contact[] = contactsData?.contacts || [];
  const gmailContacts: Contact[] = gmailData?.contacts || [];
  const slackContacts: Contact[] = slackData?.contacts || [];
  const instagramContacts: Contact[] = instagramData?.contacts || [];

  // Merge contacts
  const contactsMap = new Map<string, Contact>();
  
  regularContacts.forEach(contact => {
    const key = contact.email?.toLowerCase() || contact.id;
    contactsMap.set(key, contact);
  });

  // Filter Gmail contacts: Only show emails from added contacts and team members
  gmailContacts.forEach(gmailContact => {
    const emailKey = gmailContact.email?.toLowerCase();
    
    // Only include if email matches an allowed contact or team member
    if (!emailKey || !allowedEmails.has(emailKey)) {
      return; // Skip this Gmail contact - not from an allowed email
    }

    const key = emailKey || gmailContact.id;
    const existing = contactsMap.get(key);
    
    if (existing) {
      // Merge messages and mark as Gmail
      const mergedContact: Contact = {
        ...existing,
        isGmail: true, // Mark as Gmail contact
        messages: [
          ...existing.messages,
          ...gmailContact.messages,
        ].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        _count: {
          messages: existing.messages.length + gmailContact.messages.length,
        },
      };
      contactsMap.set(key, mergedContact);
    } else {
      contactsMap.set(key, {
        ...gmailContact,
        isGmail: true,
      });
    }
  });

  // Add Slack contacts
  slackContacts.forEach(slackContact => {
    const key = slackContact.id; // Use ID for Slack contacts (no email)
    const existing = contactsMap.get(key);
    
    if (existing) {
      existing.messages = [
        ...existing.messages,
        ...slackContact.messages,
      ].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      existing._count.messages = existing.messages.length;
    } else {
      contactsMap.set(key, {
        ...slackContact,
        isSlack: true,
      });
    }
  });

  // Add Instagram contacts
  instagramContacts.forEach(instagramContact => {
    const key = instagramContact.id;
    const existing = contactsMap.get(key);
    
    if (existing) {
      existing.messages = [
        ...existing.messages,
        ...instagramContact.messages,
      ].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      existing._count.messages = existing.messages.length;
    } else {
      contactsMap.set(key, {
        ...instagramContact,
        isInstagram: true,
      });
    }
  });

  let contacts: Contact[] = Array.from(contactsMap.values());

  // Filter contacts by selected integration
  if (selectedIntegration) {
    const integrationChannelMap: Record<string, string[]> = {
      'Gmail': ['EMAIL'],
      'Slack': ['SLACK'],
      'Instagram': ['INSTAGRAM'],
      'LinkedIn': ['LINKEDIN'],
      'WhatsApp': ['WHATSAPP'],
      'Teams': ['SLACK'], // Teams messages might use SLACK channel or similar
    };

    const targetChannels = integrationChannelMap[selectedIntegration] || [];

    contacts = contacts.filter(c => {
      // Check source flags first
      if (selectedIntegration === 'Gmail' && c.isGmail) return true;
      if (selectedIntegration === 'Slack' && c.isSlack) return true;
      if (selectedIntegration === 'Instagram' && c.isInstagram) return true;

      // Fall back to checking message channels
      if (targetChannels.length > 0) {
        return c.messages.some(m => targetChannels.includes(m.channel as string));
      }

      return false;
    });
  }

  // Calculate stats
  const newMessages = contacts.reduce((acc, contact) => {
    return acc + contact.messages.filter(m => 
      m.direction === 'INBOUND' && !m.readAt
    ).length;
  }, 0);

  const liveConversations = contacts.filter(c => c._count.messages > 0).length;

  const handleMessageClick = (contact: Contact, message: Contact['messages'][0]) => {
    setSelectedMessage({ contact, message });
  };

  const getChannelIcon = (channel: MessageChannel | string) => {
    const channelMap: Record<string, string> = {
      EMAIL: "📧",
      SMS: "💬",
      WHATSAPP: "📱",
      TWITTER: "🐦",
      FACEBOOK: "👥",
      LINKEDIN: "💼",
      SLACK: "💬",
      INSTAGRAM: "📸",
    };
    return channelMap[channel] || "💬";
  };

  const getChannelColor = (channel: MessageChannel | string) => {
    const channelMap: Record<string, string> = {
      EMAIL: "text-red-500",
      SMS: "text-blue-500",
      WHATSAPP: "text-green-500",
      TWITTER: "text-sky-500",
      FACEBOOK: "text-indigo-500",
      LINKEDIN: "text-blue-600",
      SLACK: "text-purple-500",
      INSTAGRAM: "text-pink-500",
    };
    return channelMap[channel] || "text-gray-500";
  };

  const getInitials = (name?: string, email?: string, phone?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) return email[0].toUpperCase();
    if (phone) return phone.slice(-1);
    return '?';
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Integration Icons - Compact View */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-3 flex-shrink-0">
        <div className="flex flex-col gap-2">
          {/* All Messages Button */}
          <div
            onClick={() => setSelectedIntegration(null)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors group relative overflow-hidden ${
              selectedIntegration === null
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
            title="All Messages"
          >
            <span className="text-xs font-semibold text-gray-700">All</span>
          </div>
          {integrations.map((integration) => {
            const status = getIntegrationStatus(integration.name);
            return (
              <div
                key={integration.name}
                onClick={() => setSelectedIntegration(integration.name)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors group relative ${
                  selectedIntegration === integration.name
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                title={`${integration.name}${status === 'connected' ? ' (Connected)' : status === 'error' ? ' (Error)' : status === 'loading' ? ' (Loading)' : ''}`}
              >
                <Image
                  src={integration.logo}
                  alt={integration.name}
                  width={24}
                  height={24}
                  className="group-hover:scale-110 transition-transform"
                />
                <StatusIndicator status={status} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
            <p className="text-xs text-gray-500 mt-1">
              {`You have ${newMessages} new and ${liveConversations} active conversations.`}
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {/* Inbox Content */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Inbox List */}
          <div className="flex-1 bg-white overflow-y-auto min-h-0">
            <div className="px-8 py-4">
              {(contactsLoading || gmailLoading || slackLoading || instagramLoading) ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-start gap-4 p-3 rounded-lg animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="h-4 bg-gray-200 rounded w-32" />
                          <div className="h-3 bg-gray-200 rounded w-16" />
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-48" />
                        <div className="h-3 bg-gray-200 rounded w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <p className="text-sm">
                    {selectedIntegration 
                      ? `No ${selectedIntegration} messages found`
                      : 'No conversations yet'
                    }
                  </p>
                  {selectedIntegration === 'Slack' && slackError && (
                    <p className="text-xs mt-2 text-red-500">
                      Error loading Slack messages. Please check your Slack integration.
                    </p>
                  )}
                  {selectedIntegration === 'Slack' && !slackError && slackContacts.length === 0 && (
                    <p className="text-xs mt-2">
                      Make sure you have selected channels in your Slack integration settings.
                    </p>
                  )}
                  {selectedIntegration === 'Instagram' && instagramContacts.length === 0 && (
                    <p className="text-xs mt-2">
                      Connect Instagram in Settings → Integrations (AI Chat integrations) to see DMs here.
                    </p>
                  )}
                  {searchQuery && (
                    <p className="text-xs mt-2">Try a different search term</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {contacts.map((contact) => {
                    const latestMessage = contact.messages[0];
                    const unreadCount = contact.messages.filter(m => 
                      m.direction === 'INBOUND' && !m.readAt
                    ).length;
                    const displayName = contact.name || contact.email || contact.phone || 'Unknown';

                    return (
                      <div
                        key={contact.id}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                        onClick={() => latestMessage && handleMessageClick(contact, latestMessage)}
                      >
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-medium text-xs flex-shrink-0">
                          {getInitials(contact.name, contact.email, contact.phone)}
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">{displayName}</h3>
                              {unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 rounded-full">
                                  {unreadCount} new
                                </span>
                              )}
                            </div>
                            {latestMessage && (
                              <span className="text-[11px] text-gray-400 flex-shrink-0">
                                {formatTime(latestMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          {latestMessage ? (
                            <>
                              {contact.isGmail && latestMessage.subject ? (
                                <p className="text-xs font-medium text-gray-900 leading-relaxed mb-1 line-clamp-1">
                                  {latestMessage.subject}
                                </p>
                              ) : null}
                              <p className="text-xs text-gray-600 leading-relaxed mb-1 line-clamp-2">
                                {latestMessage.content}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm ${getChannelColor(latestMessage.channel)}`}>
                                  {getChannelIcon(latestMessage.channel)}
                                </span>
                                {contact.isGmail && (
                                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                    Gmail
                                  </span>
                                )}
                                {contact.isInstagram && (
                                  <span className="text-[10px] text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded">
                                    Instagram
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-gray-400 italic">No messages yet</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - AI Suggestions */}
          <div className="w-80 bg-transparent p-6 space-y-4">
            {contacts.length > 0 ? (
              (() => {
                const firstWithUnread = contacts.find(c =>
                  c.messages.some(m => m.direction === 'INBOUND' && !m.readAt)
                );
                const latestUnread = firstWithUnread?.messages.find(
                  m => m.direction === 'INBOUND' && !m.readAt
                );
                if (!firstWithUnread || !latestUnread) {
                  return (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        You&apos;re all caught up. I&apos;ll highlight new inbound messages here as they arrive.
                      </p>
                    </div>
                  );
                }
                const displayName =
                  firstWithUnread.name || firstWithUnread.email || firstWithUnread.phone || 'a contact';
                return (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      You have an unread message from <span className="font-medium">{displayName}</span>:
                      <span className="block mt-1 text-gray-800 truncate">
                        "{latestUnread.content}"
                      </span>
                    </p>
                  </div>
                );
              })()
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Once messages start flowing in, I&apos;ll surface important conversations and follow-ups here.
                </p>
              </div>
            )}

            {/* Suggested Tasks */}
            {contacts.filter(c => c.messages.some(m => !m.readAt && m.direction === 'INBOUND')).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Suggested Tasks</h3>
                {contacts
                  .filter(c => c.messages.some(m => !m.readAt && m.direction === 'INBOUND'))
                  .slice(0, 3)
                  .map((contact) => {
                    const latestUnread = contact.messages.find(m => !m.readAt && m.direction === 'INBOUND');
                    if (!latestUnread) return null;
                    
                    return (
                      <div
                        key={contact.id}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleMessageClick(contact, latestUnread)}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`text-2xl ${getChannelColor(latestUnread.channel)}`}>
                            {getChannelIcon(latestUnread.channel)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">
                              {contact.name || contact.email || contact.phone || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {latestUnread.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Detail Modal - Now using separate component */}
      {selectedMessage && (
        <EmailViewer
          contact={selectedMessage.contact}
          message={selectedMessage.message}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  );
}