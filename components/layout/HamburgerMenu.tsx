"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  BarChart3,
  Settings,
  Users,
  Building2,
  MessageSquare,
  Sparkles,
  Menu,
  X,
  CircleDashedIcon,
  MessageCircle,
  FolderKanban,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: CircleDashedIcon },
  { name: "Chat", href: "/chat", icon: MessageCircle },
  { name: "AI Chat", href: "/ai-chat", icon: Sparkles },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "CRM", href: "/crm", icon: FolderKanban },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Messages", href: "/messages", icon: MessageSquare },
];

const settings = [
  { name: "Organization", href: "/settings/organization", icon: Building2 },
  { name: "Integrations", href: "/settings/integrations", icon: Plug },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 transition-all duration-300">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="font-semibold text-gray-900">AYA AI</span>
        <span className="text-gray-300">/</span>
        <span>AI Chat</span>
      </div>

      <div className="relative" ref={menuRef}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
        >
          {isOpen ? (
            <X className="w-5 h-5 text-gray-700" />
          ) : (
            <Menu className="w-5 h-5 text-gray-700" />
          )}
        </Button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            <div className="p-2">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left",
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0",
                          isActive ? "text-blue-600" : "text-gray-400"
                        )}
                      />
                      <span className="flex-1">{item.name}</span>
                      {isActive && (
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="px-3 mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Settings
                  </p>
                </div>
                <div className="space-y-1">
                  {settings.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleNavigation(item.href)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left",
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 flex-shrink-0",
                            isActive ? "text-blue-600" : "text-gray-400"
                          )}
                        />
                        <span className="flex-1">{item.name}</span>
                        {isActive && (
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
