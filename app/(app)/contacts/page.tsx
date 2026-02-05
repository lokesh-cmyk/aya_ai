"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Note: This is a client component for interactivity
// ISR is handled at the API level with fetch options
export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const queryClient = useQueryClient();

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["contacts", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(`/api/contacts?${params}`, {
        next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
      });
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
    staleTime: 30000, // Cache for 30 seconds on client
  });

  const contacts = contactsData?.contacts || [];

  const createContactMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create contact");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsAdding(false);
      setForm({ name: "", email: "", phone: "" });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contacts</h1>
          <p className="text-gray-600">
            Manage your contacts and customer relationships
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Contacts Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">No contacts found</p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact: any) => (
            <Card key={contact.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {contact.name?.charAt(0) || contact.email?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {contact.name || "Unknown"}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {contact.email || contact.phone || "No contact info"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {contact._count?.messages || 0} messages
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Contact Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
            <DialogDescription>
              Create a new contact to start tracking conversations.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.email && !form.phone && !form.name) return;
              createContactMutation.mutate(form);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium">Name</Label>
              <Input
                id="name"
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700 font-medium">Phone</Label>
              <Input
                id="phone"
                placeholder="+1 555 000 0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-white border-gray-300"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdding(false)}
                className="border-gray-300 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createContactMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createContactMutation.isPending ? "Saving..." : "Save contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

