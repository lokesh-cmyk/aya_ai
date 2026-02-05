// components/inbox/ContactThread.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, Image as ImageIcon, Clock, CheckCheck, X } from 'lucide-react';
import { MessageChannel } from '@/app/generated/prisma/enums';

interface Message {
  id: string;
  content: string;
  channel: MessageChannel;
  direction: 'INBOUND' | 'OUTBOUND';
  status: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  mediaUrls: string[];
  user?: { name: string };
}

interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  isInternal?: boolean;
  tags?: string[];
}

export function ContactThread({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [messageContent, setMessageContent] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel>(MessageChannel.SMS);
  const [scheduledFor, setScheduledFor] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Check if this is an internal contact
  const isInternal = contact.isInternal || contact.tags?.includes('internal');

  // Fetch messages for this contact
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['messages', contact.id, isInternal],
    queryFn: async () => {
      if (isInternal) {
        // For internal messages, fetch from internal endpoint with contactId
        const res = await fetch(`/api/messages/internal?contactId=${contact.id}`);
        if (!res.ok) throw new Error('Failed to fetch internal messages');
        const data = await res.json();
        // Return messages from the contact
        return { messages: data.contacts?.[0]?.messages || [] };
      } else {
        const res = await fetch(`/api/messages?contactId=${contact.id}`);
        if (!res.ok) throw new Error('Failed to fetch messages');
        return res.json();
      }
    },
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  const messages: Message[] = messagesData?.messages || [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = isInternal ? '/api/messages/internal' : '/api/messages';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      setMessageContent('');
      setScheduledFor('');
      queryClient.invalidateQueries({ queryKey: ['messages', contact.id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['internal-messages'] });
    },
  });

  const handleSend = () => {
    if (!messageContent.trim()) return;

    if (isInternal) {
      // Send internal message using email
      sendMessageMutation.mutate({
        recipientEmail: contact.email,
        content: messageContent,
      });
    } else {
      // Send external message
      sendMessageMutation.mutate({
        contactId: contact.id,
        channel: selectedChannel,
        content: messageContent,
        scheduledFor: scheduledFor || undefined,
      });
    }
  };

  const getStatusIcon = (message: Message) => {
    if (message.direction === 'INBOUND') return null;

    if (message.status === 'SCHEDULED') {
      return <Clock className="w-3 h-3 text-gray-400" />;
    }
    if (message.readAt) {
      return <CheckCheck className="w-3 h-3 text-blue-600" />;
    }
    if (message.deliveredAt) {
      return <CheckCheck className="w-3 h-3 text-gray-400" />;
    }
    if (message.status === 'FAILED') {
      return <X className="w-3 h-3 text-red-600" />;
    }
    return <CheckCheck className="w-3 h-3 text-gray-300" />;
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {contact.name || contact.phone || contact.email}
            </h2>
            <div className="flex gap-3 mt-1 text-sm text-gray-500">
              {contact.phone && <span>📱 {contact.phone}</span>}
              {contact.email && <span>📧 {contact.email}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOutbound = message.direction === 'OUTBOUND';
            
            return (
              <div
                key={message.id}
                className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-md ${isOutbound ? 'ml-12' : 'mr-12'}`}>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isOutbound
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    
                    {message.mediaUrls.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.mediaUrls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Attachment"
                            className="rounded max-w-full h-auto"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center gap-2 mt-1 text-xs ${
                    isOutbound ? 'justify-end' : 'justify-start'
                  }`}>
                    <span className={isOutbound ? 'text-blue-600' : 'text-gray-500'}>
                      {message.channel}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {getStatusIcon(message)}
                    {message.user && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">{message.user.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        {/* Channel Selector */}
        <div className="flex gap-2 mb-3">
          {Object.values(MessageChannel).map((channel) => (
            <button
              key={channel}
              onClick={() => setSelectedChannel(channel)}
              disabled={
                (channel === MessageChannel.SMS || channel === MessageChannel.WHATSAPP) && !contact.phone ||
                channel === MessageChannel.EMAIL && !contact.email
              }
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedChannel === channel
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {channel}
            </button>
          ))}
        </div>

        {/* Schedule Option */}
        <div className="mb-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Schedule for later:</span>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            {scheduledFor && (
              <button
                onClick={() => setScheduledFor('')}
                className="text-red-600 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </label>
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="absolute right-2 bottom-2 flex gap-1">
              <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                <ImageIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={!messageContent.trim() || sendMessageMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-end"
          >
            {sendMessageMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {scheduledFor ? 'Schedule' : 'Send'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}