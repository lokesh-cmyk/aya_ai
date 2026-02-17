import { useEffect, useState, useRef } from "react";
import { X, Reply, Forward, Archive, Trash2, MoreVertical, ExternalLink, Send, Paperclip, Loader2, Mail, MessageSquare, Instagram } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { MessageChannel } from "@/app/generated/prisma/enums";
import { useEmailSuggestions } from "@/hooks/useEmailSuggestions";
import { EmailSuggestions } from "./EmailSuggestions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Contact {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  isGmail?: boolean;
  isSlack?: boolean;
  isInstagram?: boolean;
  connectedAccountId?: string;
  accountUsername?: string;
  conversationId?: string;
  channelId?: string;
  channelName?: string;
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
}

interface EmailViewerProps {
  contact: Contact;
  message: Contact['messages'][0];
  onClose: () => void;
}

export function EmailViewer({ contact, message, onClose }: EmailViewerProps) {
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { suggestions, isLoading: suggestionsLoading, error: suggestionsError, fetchSuggestions } = useEmailSuggestions();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (message.direction === 'INBOUND' && message.content) {
      const threadMsgs = contact.messages
        .filter(m => m.threadId === message.threadId && message.threadId)
        .map(m => ({ from: m.from, content: m.content }));
      fetchSuggestions({
        emailContent: message.content,
        senderName: contact.name || message.from,
        senderEmail: contact.email || message.from,
        subject: message.subject,
        threadMessages: threadMsgs.length > 0 ? threadMsgs : undefined,
      });
    }
  }, [message.id]);

  const handleSelectSuggestion = (suggestion: string) => setReplyText(suggestion);

  const handleRefreshSuggestions = () => {
    const threadMsgs = contact.messages
      .filter(m => m.threadId === message.threadId && message.threadId)
      .map(m => ({ from: m.from, content: m.content }));
    fetchSuggestions({
      emailContent: message.content,
      senderName: contact.name || message.from,
      senderEmail: contact.email || message.from,
      subject: message.subject,
      threadMessages: threadMsgs.length > 0 ? threadMsgs : undefined,
    });
  };

  const getInitials = (name?: string, email?: string, phone?: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (email) return email[0].toUpperCase();
    if (phone) return phone.slice(-1);
    return '?';
  };

  const formatFullDate = (dateString: string) => {
    try { return format(new Date(dateString), "PPpp"); }
    catch { return dateString; }
  };

  const openInGmail = () => {
    const gmailId = message.threadId || message.metadata?.threadId || message.externalId || message.metadata?.gmailId;
    if (gmailId) window.open(`https://mail.google.com/mail/u/0/#inbox/${gmailId}`, '_blank', 'noopener,noreferrer');
  };

  const openInSlack = () => {
    const channelId = contact.channelId || message.metadata?.channelId;
    const messageTs = message.externalId || message.metadata?.threadTs;
    if (channelId) {
      const slackUrl = messageTs
        ? `https://app.slack.com/client/T00000000/${channelId}/thread/${channelId}-${messageTs}`
        : `https://app.slack.com/client/T00000000/${channelId}`;
      window.open(slackUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReply = async () => {
    if ((!replyText.trim() && !selectedFile) || !contact.isSlack || !contact.channelId) return;
    setIsSending(true);
    try {
      const channelId = contact.channelId;
      const threadTs = message.externalId || message.metadata?.threadTs || message.metadata?.channelId;
      let response: Response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('channelId', channelId);
        formData.append('text', replyText);
        if (threadTs) formData.append('threadTs', threadTs);
        formData.append('messageId', message.id);
        formData.append('file', selectedFile);
        formData.append('filename', selectedFile.name);
        response = await fetch('/api/integrations/slack/reply', { method: 'POST', body: formData });
      } else {
        response = await fetch('/api/integrations/slack/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId, text: replyText, threadTs: threadTs || undefined, messageId: message.id }),
        });
      }
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to send reply');
      setReplyText("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      window.location.reload();
    } catch (error: any) {
      alert(`Failed to send reply: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleGmailReply = async () => {
    if (!replyText.trim() || !contact.isGmail) return;
    setIsSending(true);
    try {
      const response = await fetch('/api/integrations/gmail/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contact.email || message.from || '',
          subject: message.subject || '',
          body: replyText,
          threadId: message.threadId || message.metadata?.threadId || '',
          messageId: message.metadata?.messageId || message.externalId || '',
          contactId: contact.id,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to send reply');
      setReplyText("");
      window.location.reload();
    } catch (error: any) {
      alert(`Failed to send reply: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleInstagramReply = async () => {
    if (!replyText.trim() || !contact.isInstagram) return;
    const connectedAccountId = contact.connectedAccountId || contact.messages?.[0]?.metadata?.connectedAccountId;
    const conversationId = contact.conversationId || contact.messages?.[0]?.metadata?.conversationId;
    if (!connectedAccountId || !conversationId) {
      toast.error("Missing Instagram conversation context");
      return;
    }
    setIsSending(true);
    try {
      const response = await fetch('/api/integrations/instagram/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectedAccountId, conversationId, text: replyText.trim() }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send reply');
      }
      toast.success("Instagram reply sent");
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ['instagram-messages'] });
    } catch (error: any) {
      toast.error(`Failed to send reply: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const threadMessages = contact.messages
    .filter(m => m.threadId === message.threadId && message.threadId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // For Instagram, show all messages in the conversation (no thread filtering)
  const messagesToShow = contact.isInstagram
    ? [...contact.messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : threadMessages.length > 0 ? threadMessages : [message];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/10
                   w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden
                   border border-white/20 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {contact.isSlack ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A154B] to-[#611f69] flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
            ) : contact.isInstagram ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
                <Instagram className="w-5 h-5 text-white" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {contact.isSlack ? (contact.channelName || contact.name || 'Slack Channel') : contact.isInstagram ? (contact.name || 'Instagram DM') : (message.subject || '(no subject)')}
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {contact.isSlack ? (message.from || 'Unknown User') : contact.isInstagram ? (contact.name || 'Instagram User') : (contact.name || message.from || contact.email)}
                <span className="mx-2 text-gray-300">•</span>
                <span className="text-xs">{formatFullDate(message.createdAt)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {contact.isGmail && (
              <button onClick={openInGmail} className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">
                <ExternalLink className="w-3.5 h-3.5" /> Gmail
              </button>
            )}
            {contact.isSlack && (
              <button onClick={openInSlack} className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">
                <ExternalLink className="w-3.5 h-3.5" /> Slack
              </button>
            )}
            <button onClick={onClose} className="cursor-pointer p-2 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 transition-all group">
              <X className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
            </button>
          </div>
        </div>

        {/* Split Pane Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL - Email Content */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-100">
            {/* Action Bar */}
            <div className="px-4 py-2 flex items-center gap-1 border-b border-gray-50 bg-gray-50/50">
              <button className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-white hover:shadow-sm transition-all">
                <Reply className="w-3.5 h-3.5" /> Reply
              </button>
              {!contact.isSlack && !contact.isInstagram && (
                <>
                  <button className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-white hover:shadow-sm transition-all">
                    <Forward className="w-3.5 h-3.5" /> Forward
                  </button>
                  <button className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-white hover:shadow-sm transition-all">
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </button>
                  <button className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </>
              )}
              <div className="flex-1" />
              <button className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-all">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Email Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {messagesToShow.map((msg, index) => (
                  <div key={msg.id} className={index > 0 ? 'pt-6 border-t border-gray-100' : ''}>
                    {/* Message Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-md ${
                        msg.direction === 'OUTBOUND'
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          : 'bg-gradient-to-br from-gray-500 to-gray-600'
                      }`}>
                        {getInitials(msg.from || contact.name, contact.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{msg.from || contact.name || contact.email}</span>
                          {!msg.readAt && msg.direction === 'INBOUND' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-100 text-blue-700">New</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{formatFullDate(msg.createdAt)}</p>
                      </div>
                    </div>

                    {/* Message Body - Enhanced formatting */}
                    <div className="mt-3">
                      <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100">
                        <div className="prose prose-sm max-w-none break-words
                                        prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                                        prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-2
                                        prose-li:text-gray-700 prose-li:leading-relaxed
                                        prose-strong:text-gray-900 prose-strong:font-semibold
                                        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                                        prose-ul:my-3 prose-ol:my-3 prose-ul:pl-5 prose-ol:pl-5
                                        prose-li:my-1">
                          {msg.content.includes('<') && !contact.isInstagram ? (
                            <div
                              dangerouslySetInnerHTML={{ __html: msg.content }}
                              className="[&>*]:mb-3 [&>ul]:list-disc [&>ol]:list-decimal [&_li]:ml-4"
                            />
                          ) : (
                            <div className="whitespace-pre-wrap break-words text-gray-700 leading-relaxed text-sm">
                              {msg.content}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Labels */}
                    {msg.labels && msg.labels.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {msg.labels.map((label) => (
                          <span key={label} className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide bg-gray-100 text-gray-600">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                      <details className="mt-3 group">
                        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1">
                          <span className="group-open:rotate-90 transition-transform duration-200">›</span> Show details
                        </summary>
                        <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-mono space-y-1 overflow-x-auto">
                          {Object.entries(msg.metadata).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="text-gray-500 shrink-0">{key}:</span>
                              <span className="text-gray-700 break-all">{JSON.stringify(value)}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - AI Suggestions & Reply */}
          <div className="w-[380px] shrink-0 flex flex-col bg-gradient-to-b from-gray-50/50 to-white">
            {/* AI Suggestions */}
            {message.direction === 'INBOUND' && (
              <div className="p-4 border-b border-gray-100">
                <EmailSuggestions
                  suggestions={suggestions}
                  isLoading={suggestionsLoading}
                  error={suggestionsError}
                  onSelectSuggestion={handleSelectSuggestion}
                  onRefresh={handleRefreshSuggestions}
                />
              </div>
            )}

            {/* Reply Composer */}
            <div className="flex-1 flex flex-col p-4">
              <div className="flex items-center gap-2 mb-3">
                <Reply className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Your Reply</span>
              </div>

              {/* Replying as indicator (above input) */}
              <div className="mb-2 text-xs text-gray-400">
                {contact.isInstagram && contact.accountUsername
                  ? <>Replying as <span className="font-medium text-pink-500">@{contact.accountUsername}</span> to {contact.name || 'Instagram User'}</>
                  : <>Replying to {contact.email || message.from || contact.channelName}</>
                }
              </div>

              <Textarea
                placeholder="Write your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 min-h-[150px] resize-none rounded-xl border-gray-200 bg-white
                           focus:border-violet-300 focus:ring-2 focus:ring-violet-500/20
                           placeholder:text-gray-400 text-gray-700 text-sm leading-relaxed"
                disabled={isSending}
              />

              {/* File attachment for Slack */}
              {contact.isSlack && (
                <div className="mt-3">
                  <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden"
                         accept=".pdf,.doc,.docx,.xls,.xlsx,.json,.txt,.csv,.png,.jpg,.jpeg,.gif" disabled={isSending} />
                  {selectedFile ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200/50 rounded-xl">
                      <Paperclip className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span className="text-sm text-gray-700 truncate flex-1">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</span>
                      <button onClick={handleRemoveFile} disabled={isSending} className="cursor-pointer p-1 rounded hover:bg-violet-100">
                        <X className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()} disabled={isSending}
                            className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50">
                      <Paperclip className="w-4 h-4" /> Attach file
                    </button>
                  )}
                </div>
              )}

              {/* Send Button */}
              <div className="mt-4">
                {contact.isSlack ? (
                  <button
                    onClick={handleReply}
                    disabled={(!replyText.trim() && !selectedFile) || isSending}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                               bg-gradient-to-r from-[#4A154B] to-[#611f69] text-white
                               hover:from-[#5a1a5c] hover:to-[#7a2587]
                               disabled:opacity-50 disabled:cursor-not-allowed
                               shadow-lg shadow-purple-500/20 transition-all duration-200"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isSending ? 'Sending...' : 'Send via Slack'}
                  </button>
                ) : contact.isInstagram ? (
                  <button
                    onClick={handleInstagramReply}
                    disabled={!replyText.trim() || isSending}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                               bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white
                               hover:from-[#f6973e] hover:via-[#e13585] hover:to-[#9340bb]
                               disabled:opacity-50 disabled:cursor-not-allowed
                               shadow-lg shadow-pink-500/20 transition-all duration-200"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isSending ? 'Sending...' : 'Send via Instagram'}
                  </button>
                ) : (
                  <button
                    onClick={handleGmailReply}
                    disabled={!replyText.trim() || isSending}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                               bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                               hover:from-blue-500 hover:to-indigo-500
                               disabled:opacity-50 disabled:cursor-not-allowed
                               shadow-lg shadow-blue-500/20 transition-all duration-200"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isSending ? 'Sending...' : 'Send Reply'}
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
