/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageChannel } from '@/app/generated/prisma/enums';
import { Search, Filter, Plus, Phone, Mail, MessageSquare } from 'lucide-react';
import { ContactThread } from './ContactThread';
import { MessageComposer } from './MessageComposer';
import { ContactProfile } from './ContactProfile';

interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  messages: any[];
  _count: { messages: number };
  tags?: string[];
  isVerified?: boolean;
  createdAt?: string;
}

export function UnifiedInbox() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel | 'ALL'>('ALL');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const queryClient = useQueryClient();

  // Fetch contacts with latest messages
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Fetch internal team messages
  const { data: internalData } = useQuery({
    queryKey: ['internal-messages'],
    queryFn: async () => {
      const res = await fetch('/api/messages/internal');
      if (!res.ok) throw new Error('Failed to fetch internal messages');
      return res.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Fetch Gmail emails using MCP
  const { data: gmailData } = useQuery({
    queryKey: ['gmail-emails', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('query', `in:inbox ${searchQuery}`);
      }
      params.append('maxResults', '50');
      
      const res = await fetch(`/api/emails/gmail?${params}`);
      if (!res.ok) {
        // Don't throw error - Gmail might not be connected
        return { contacts: [] };
      }
      return res.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    retry: 1,
  });

  const regularContacts = contactsData?.contacts || [];
  const internalContacts = internalData?.contacts || [];
  const gmailContacts = gmailData?.contacts || [];

  // Merge contacts intelligently
  const contactsMap = new Map<string, Contact & { isInternal?: boolean; isGmail?: boolean }>();
  
  // Add regular contacts first
  regularContacts.forEach((c: Contact) => {
    const key = c.email?.toLowerCase() || c.id;
    contactsMap.set(key, { ...c, isInternal: false, isGmail: false });
  });

  // Add internal contacts
  internalContacts.forEach((c: any) => {
    const key = c.email?.toLowerCase() || c.id;
    if (!contactsMap.has(key)) {
      contactsMap.set(key, { ...c, isInternal: true, isGmail: false });
    }
  });

  // Add Gmail contacts, merge if email matches
  gmailContacts.forEach((gmailContact: Contact) => {
    const key = gmailContact.email?.toLowerCase() || gmailContact.id;
    const existing = contactsMap.get(key);
    
    if (existing) {
      // Merge: combine messages
      existing.messages = [
        ...(existing.messages || []),
        ...(gmailContact.messages || []),
      ].sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      existing._count = { messages: existing.messages.length };
    } else {
      // Add new Gmail contact
      contactsMap.set(key, {
        ...gmailContact,
        isInternal: false,
        isGmail: true,
      });
    }
  });
  
  // Combine all contacts
  const allContacts = Array.from(contactsMap.values());

  // Filter contacts by channel
  const filteredContacts = allContacts.filter((contact: Contact & { isInternal?: boolean }) => {
    if (selectedChannel === 'ALL') return true;
    if (contact.isInternal && selectedChannel === 'EMAIL') return true; // Show internal messages in EMAIL filter
    return contact.messages?.some((m: any) => m.channel === selectedChannel);
  });

  const channelBadge = (channel: MessageChannel) => {
    const config: Record<string, { icon: string; color: string }> = {
      SMS: { icon: '💬', color: 'bg-blue-100 text-blue-800' },
      WHATSAPP: { icon: '📱', color: 'bg-green-100 text-green-800' },
      EMAIL: { icon: '📧', color: 'bg-red-100 text-red-800' },
      TWITTER: { icon: '🐦', color: 'bg-sky-100 text-sky-800' },
      FACEBOOK: { icon: '👥', color: 'bg-indigo-100 text-indigo-800' },
    };

    const { icon, color } = config[channel] || { icon: '•', color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        <span>{icon}</span>
        <span>{channel}</span>
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Contact List */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
            <button
              onClick={() => setShowComposer(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Channel Filters */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {['ALL', 'SMS', 'WHATSAPP', 'EMAIL', 'TWITTER', 'FACEBOOK'].map((channel) => (
              <button
                key={channel}
                onClick={() => setSelectedChannel(channel as any)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  selectedChannel === channel
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {channel}
              </button>
            ))}
          </div>
        </div>

        {/* Contact Threads */}
        <div className="flex-1 overflow-y-auto">
          {contactsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageSquare className="w-8 h-8 mb-2" />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredContacts.map((contact: Contact & { isInternal?: boolean; isGmail?: boolean }) => {
                const latestMessage = contact.messages?.[0];
                const unreadCount = (contact.messages || []).filter((m: any) => 
                  m.direction === 'INBOUND' && !m.readAt
                ).length;

                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {contact.name || contact.phone || contact.email}
                          </h3>
                          {contact.isInternal && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-purple-700 bg-purple-100 rounded">
                              Team
                            </span>
                          )}
                          {contact.isGmail && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded">
                              Gmail
                            </span>
                          )}
                          {unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          {latestMessage && channelBadge(latestMessage.channel)}
                          <span className="text-xs text-gray-500">
                            {latestMessage?.createdAt ? new Date(latestMessage.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 truncate">
                          {contact.isGmail && latestMessage?.subject ? (
                            <>
                              <span className="font-medium">{latestMessage.subject}</span>
                              {latestMessage.content && ` - ${latestMessage.content}`}
                            </>
                          ) : (
                            latestMessage?.content || 'No messages yet'
                          )}
                        </p>
                      </div>

                      <div className="flex gap-1 ml-2">
                        {contact.phone && (
                          <Phone className="w-4 h-4 text-gray-400" />
                        )}
                        {contact.email && (
                          <Mail className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <ContactThread 
            contact={selectedContact}
            onClose={() => setSelectedContact(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
              <p className="text-sm">Choose a contact from the sidebar to view messages</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Contact Profile */}
      {selectedContact && (
        <ContactProfile
          contact={selectedContact}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['contacts'] })}
        />
      )}

      {/* Message Composer Modal */}
      {showComposer && (
        <MessageComposer
          onClose={() => setShowComposer(false)}
          onSent={() => {
            setShowComposer(false);
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          }}
        />
      )}
    </div>
  );
}