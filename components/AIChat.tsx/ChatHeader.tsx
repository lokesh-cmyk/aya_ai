"use client";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onOpenSidebar: () => void;
}

export function ChatHeader({ onOpenSidebar }: ChatHeaderProps) {
  return (
    <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSidebar}
        className="h-9 w-9"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </Button>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">AI Chat</h1>
      </div>
    </div>
  );
}