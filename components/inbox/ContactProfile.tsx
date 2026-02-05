/* eslint-disable @typescript-eslint/no-explicit-any */
// components/inbox/ContactProfile.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Save, X, Plus, Lock, Unlock, Tag, Clock } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  isPrivate: boolean;
  mentions: string[];
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  replies: Note[];
}

interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  twitterHandle?: string;
  facebookId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  isVerified?: boolean;
  createdAt?: string;
}

export function ContactProfile({ contact, onUpdate }: { contact: Contact; onUpdate: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContact, setEditedContact] = useState(contact);
  const [newNote, setNewNote] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [newTag, setNewTag] = useState('');
  const queryClient = useQueryClient();

  // Fetch contact details with notes
  const { data: contactData } = useQuery({
    queryKey: ['contact', contact.id],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contact.id}`);
      if (!res.ok) throw new Error('Failed to fetch contact');
      return res.json();
    },
  });

  const fullContact = contactData || contact;
  const notes: Note[] = fullContact.notes || [];

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update contact');
      return res.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      onUpdate();
      queryClient.invalidateQueries({ queryKey: ['contact', contact.id] });
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const res = await fetch(`/api/contacts/${contact.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });
      if (!res.ok) throw new Error('Failed to add note');
      return res.json();
    },
    onSuccess: () => {
      setNewNote('');
      setIsPrivateNote(false);
      queryClient.invalidateQueries({ queryKey: ['contact', contact.id] });
    },
  });

  const handleSaveContact = () => {
    updateContactMutation.mutate(editedContact);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    addNoteMutation.mutate({
      content: newNote,
      isPrivate: isPrivateNote,
      authorId: 'current-user-id', // Replace with actual user ID from auth
    });
  };

  const handleAddTag = () => {
    if (!newTag.trim() || fullContact.tags?.includes(newTag)) return;

    updateContactMutation.mutate({
      tags: [...(fullContact.tags || []), newTag],
    });
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateContactMutation.mutate({
      tags: fullContact.tags?.filter((tag: string) => tag !== tagToRemove) || [],
    });
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Contact Info</h3>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveContact}
                disabled={updateContactMutation.isPending}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedContact(fullContact);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Contact Details */}
        <div className="p-4 space-y-4 border-b border-gray-200">
          {isEditing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editedContact.name || ''}
                  onChange={(e) => setEditedContact({ ...editedContact, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editedContact.phone || ''}
                  onChange={(e) => setEditedContact({ ...editedContact, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editedContact.email || ''}
                  onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Twitter Handle</label>
                <input
                  type="text"
                  value={editedContact.twitterHandle || ''}
                  onChange={(e) => setEditedContact({ ...editedContact, twitterHandle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="text-2xl font-bold text-gray-900">
                  {fullContact.name || 'Unnamed Contact'}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Added {new Date(fullContact.createdAt).toLocaleDateString()}
                </p>
              </div>

              {fullContact.phone && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 text-sm font-medium">📱</span>
                  <div>
                    <p className="text-sm text-gray-900">{fullContact.phone}</p>
                    <p className="text-xs text-gray-500">Phone</p>
                  </div>
                </div>
              )}

              {fullContact.email && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 text-sm font-medium">📧</span>
                  <div>
                    <p className="text-sm text-gray-900">{fullContact.email}</p>
                    <p className="text-xs text-gray-500">Email</p>
                  </div>
                </div>
              )}

              {fullContact.twitterHandle && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 text-sm font-medium">🐦</span>
                  <div>
                    <p className="text-sm text-gray-900">@{fullContact.twitterHandle}</p>
                    <p className="text-xs text-gray-500">Twitter</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tags */}
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Tags
          </h4>
          <div className="flex flex-wrap gap-2 mb-2">
            {fullContact.tags?.map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Add tag..."
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddTag}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Notes</h4>

          {/* Add Note */}
          <div className="mb-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note... Use @username to mention teammates"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivateNote}
                  onChange={(e) => setIsPrivateNote(e.target.checked)}
                  className="rounded"
                />
                {isPrivateNote ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                Private note
              </label>
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || addNoteMutation.isPending}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Add Note
              </button>
            </div>
          </div>

          {/* Notes List */}
          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-900">
                        {note.author.name}
                      </span>
                      {note.isPrivate && (
                        <Lock className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  {note.mentions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {note.mentions.map((mention) => (
                        <span
                          key={mention}
                          className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded"
                        >
                          @{mention}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}