// components/inbox/MessageComposer.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Send, Clock, User } from 'lucide-react';
import { MessageChannel } from '@prisma/client';

interface MessageComposerProps {
  onClose: () => void;
  onSent: () => void;
  preselectedContact?: { id: string; name: string };
}

export function MessageComposer({ onClose, onSent, preselectedContact }: MessageComposerProps) {
  const [selectedContactId, setSelectedContactId] = useState(preselectedContact?.id || '');
  const [channel, setChannel] = useState<MessageChannel>(MessageChannel.SMS);
  const [content, setContent] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch contacts for selection
  const { data: contactsData } = useQuery({
    queryKey: ['contacts', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '20');
      
      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    enabled: !preselectedContact,
  });

  const contacts = contactsData?.contacts || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send message');
      }
      return res.json();
    },
    onSuccess: () => {
      onSent();
    },
  });

  const handleSend = () => {
    if (!selectedContactId || !content.trim()) return;

    sendMessageMutation.mutate({
      contactId: selectedContactId,
      channel,
      content,
      scheduledFor: scheduledFor || undefined,
    });
  };

  const selectedContact = contacts.find((c: any) => c.id === selectedContactId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">New Message</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Contact Selection */}
          {!preselectedContact && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Contact
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Contact List */}
              {searchQuery && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {contacts.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">
                      No contacts found
                    </div>
                  ) : (
                    contacts.map((contact: any) => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setSelectedContactId(contact.id);
                          setSearchQuery('');
                        }}
                        className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {contact.name || contact.phone || contact.email}
                        </p>
                        <div className="flex gap-2 mt-1 text-xs text-gray-500">
                          {contact.phone && <span>📱 {contact.phone}</span>}
                          {contact.email && <span>📧 {contact.email}</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected Contact Display */}
              {selectedContact && !searchQuery && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedContact.name || selectedContact.phone || selectedContact.email}
                    </p>
                    <div className="flex gap-2 mt-1 text-xs text-gray-500">
                      {selectedContact.phone && <span>📱 {selectedContact.phone}</span>}
                      {selectedContact.email && <span>📧 {selectedContact.email}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedContactId('')}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {preselectedContact && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">
                Sending to: {preselectedContact.name}
              </p>
            </div>
          )}

          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(MessageChannel).map((ch) => {
                const isAvailable = selectedContact
                  ? (ch === MessageChannel.SMS || ch === MessageChannel.WHATSAPP) && selectedContact.phone ||
                    ch === MessageChannel.EMAIL && selectedContact.email ||
                    ch === MessageChannel.TWITTER && selectedContact.twitterHandle ||
                    ch === MessageChannel.FACEBOOK && selectedContact.facebookId
                  : true;

                return (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    disabled={selectedContact && !isAvailable}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      channel === ch
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
            {selectedContact && !['SMS', 'WHATSAPP'].some(c => channel === c && selectedContact.phone) &&
             !(channel === 'EMAIL' && selectedContact.email) && (
              <p className="mt-2 text-sm text-amber-600">
                Selected contact doesn't have {channel} information
              </p>
            )}
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message here..."
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="mt-1 text-xs text-gray-500 text-right">
              {content.length} characters
            </div>
          </div>

          {/* Schedule Option */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4" />
              Schedule for later (optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {scheduledFor && (
              <p className="mt-2 text-sm text-gray-600">
                Message will be sent on {new Date(scheduledFor).toLocaleString()}
              </p>
            )}
          </div>

          {/* Error Display */}
          {sendMessageMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                {sendMessageMutation.error instanceof Error
                  ? sendMessageMutation.error.message
                  : 'Failed to send message'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={
              !selectedContactId ||
              !content.trim() ||
              sendMessageMutation.isPending
            }
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sendMessageMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {scheduledFor ? 'Schedule' : 'Send'} Message
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}