"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  MessageSquare,
  User,
  FolderKanban,
  FileText,
  Search,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "message" | "contact" | "task" | "space" | "taskList";
  title: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  metadata?: string;
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hoveredItem, setHoveredItem] = React.useState<SearchResult | null>(null);
  const router = useRouter();

  // Keyboard shortcuts
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Check for Ctrl+K or Ctrl+/ (or Cmd on Mac)
      const isK = e.key === "k" || e.key === "K";
      const isSlash = e.key === "/";
      const isModifier = e.metaKey || e.ctrlKey;
      
      if ((isK && isModifier) || (isSlash && isModifier)) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((open) => !open);
      }
    };

    const handleOpenEvent = () => {
      setOpen(true);
    };

    // Add event listeners
    document.addEventListener("keydown", down);
    window.addEventListener("open-command-palette", handleOpenEvent);
    
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-palette", handleOpenEvent);
    };
  }, []);

  // Search across organization
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query.trim()) return [];

      const results: SearchResult[] = [];

      try {
        // Search messages
        const messagesRes = await fetch(`/api/messages?search=${encodeURIComponent(query)}&limit=5`);
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          messagesData.messages?.forEach((msg: any) => {
            results.push({
              id: msg.id,
              type: "message",
              title: msg.contact?.name || msg.contact?.phone || msg.contact?.email || "Unknown",
              description: msg.content?.substring(0, 100) || "No content",
              url: `/inbox?message=${msg.id}`,
              icon: <MessageSquare className="w-4 h-4" />,
              metadata: `${msg.channel} • ${new Date(msg.createdAt).toLocaleDateString()}`,
            });
          });
        }

        // Search contacts
        const contactsRes = await fetch(`/api/contacts?search=${encodeURIComponent(query)}&limit=5`);
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          contactsData.contacts?.forEach((contact: any) => {
            results.push({
              id: contact.id,
              type: "contact",
              title: contact.name || contact.phone || contact.email || "Unknown",
              description: `${contact.email ? `Email: ${contact.email}` : ""} ${contact.phone ? `Phone: ${contact.phone}` : ""}`.trim() || "No contact information",
              url: `/contacts?contact=${contact.id}`,
              icon: <User className="w-4 h-4" />,
              metadata: `${contact._count?.messages || 0} messages`,
            });
          });
        }

        // Search tasks
        const tasksRes = await fetch(`/api/crm/tasks?search=${encodeURIComponent(query)}&limit=5`);
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          tasksData.tasks?.forEach((task: any) => {
            results.push({
              id: task.id,
              type: "task",
              title: task.name,
              description: task.description?.substring(0, 100) || "No description",
              url: `/crm?task=${task.id}`,
              icon: <CheckCircle2 className="w-4 h-4" />,
              metadata: `${task.status?.name || "No status"} • ${task.priority || "NORMAL"}`,
            });
          });
        }

        // Search spaces
        const spacesRes = await fetch(`/api/crm/spaces?search=${encodeURIComponent(query)}&limit=5`);
        if (spacesRes.ok) {
          const spacesData = await spacesRes.json();
          spacesData.spaces?.forEach((space: any) => {
            results.push({
              id: space.id,
              type: "space",
              title: space.name,
              description: space.description?.substring(0, 100) || "No description",
              url: `/crm?space=${space.id}`,
              icon: <FolderKanban className="w-4 h-4" />,
              metadata: `${space._count?.taskLists || 0} task lists`,
            });
          });
        }
      } catch (error) {
        console.error("Search error:", error);
      }

      return results;
    },
    enabled: query.trim().length > 0 && open,
  });

  const results = searchResults || [];

  // Group results by type
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      messages: [],
      contacts: [],
      tasks: [],
      spaces: [],
    };

    results.forEach((result) => {
      if (result.type === "message") groups.messages.push(result);
      else if (result.type === "contact") groups.contacts.push(result);
      else if (result.type === "task") groups.tasks.push(result);
      else if (result.type === "space") groups.spaces.push(result);
    });

    return groups;
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.url);
    setOpen(false);
    setQuery("");
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search messages, contacts, tasks, spaces..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
          <CommandEmpty>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-gray-500">
                Searching...
              </div>
            ) : query.trim() ? (
              <div className="py-6 text-center text-sm text-gray-500">
                No results found for "{query}"
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="text-sm text-gray-500 mb-2">Start typing to search...</div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span>Press</span>
                  <KbdGroup>
                    <Kbd>Ctrl</Kbd>
                    <Kbd>K</Kbd>
                  </KbdGroup>
                  <span>or</span>
                  <KbdGroup>
                    <Kbd>Ctrl</Kbd>
                    <Kbd>/</Kbd>
                  </KbdGroup>
                  <span>to open</span>
                </div>
              </div>
            )}
          </CommandEmpty>

          {groupedResults.messages.length > 0 && (
            <CommandGroup heading="Messages">
              {groupedResults.messages.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.id}
                  onSelect={() => handleSelect(result)}
                  onMouseEnter={() => setHoveredItem(result)}
                  className="relative"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-gray-400 flex-shrink-0">{result.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{result.title}</div>
                      <div className="text-xs text-gray-500 truncate">{result.metadata}</div>
                    </div>
                  </div>
                  <CommandShortcut>
                    <Kbd>↵</Kbd>
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {groupedResults.contacts.length > 0 && (
            <CommandGroup heading="Contacts">
              {groupedResults.contacts.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.id}
                  onSelect={() => handleSelect(result)}
                  onMouseEnter={() => setHoveredItem(result)}
                  className="relative"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-gray-400 flex-shrink-0">{result.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{result.title}</div>
                      <div className="text-xs text-gray-500 truncate">{result.metadata}</div>
                    </div>
                  </div>
                  <CommandShortcut>
                    <Kbd>↵</Kbd>
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {groupedResults.tasks.length > 0 && (
            <CommandGroup heading="Tasks">
              {groupedResults.tasks.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.id}
                  onSelect={() => handleSelect(result)}
                  onMouseEnter={() => setHoveredItem(result)}
                  className="relative"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-gray-400 flex-shrink-0">{result.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{result.title}</div>
                      <div className="text-xs text-gray-500 truncate">{result.metadata}</div>
                    </div>
                  </div>
                  <CommandShortcut>
                    <Kbd>↵</Kbd>
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {groupedResults.spaces.length > 0 && (
            <CommandGroup heading="Spaces">
              {groupedResults.spaces.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.id}
                  onSelect={() => handleSelect(result)}
                  onMouseEnter={() => setHoveredItem(result)}
                  className="relative"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-gray-400 flex-shrink-0">{result.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{result.title}</div>
                      <div className="text-xs text-gray-500 truncate">{result.metadata}</div>
                    </div>
                  </div>
                  <CommandShortcut>
                    <Kbd>↵</Kbd>
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>

        {/* Hover Preview */}
        {hoveredItem && (
          <div className="border-t border-gray-200 p-4 bg-gray-50/50 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="text-gray-400 mt-0.5 flex-shrink-0">{hoveredItem.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 mb-1">{hoveredItem.title}</div>
                <div className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                  {hoveredItem.description}
                </div>
                {hoveredItem.metadata && (
                  <div className="text-xs text-gray-500 mt-1">{hoveredItem.metadata}</div>
                )}
              </div>
            </div>
          </div>
        )}
    </CommandDialog>
  );
}
