import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Search } from "lucide-react";
import { ChatPageShell } from "@/components/chat/ChatPageShell";

// Loading fallback component
function ChatLoadingFallback() {
  return (
    <div className="flex h-full bg-white">
      {/* Team Members Sidebar - Static Shell */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50/50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Chat</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search team members..."
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
              disabled
            />
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-2 space-y-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-100 animate-pulse"
            >
              <div className="w-12 h-12 rounded-full bg-gray-200"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-linear-to-br from-gray-50 to-white">
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border border-gray-200">
          <div className="w-16 h-16 rounded-xl bg-gray-100 animate-pulse"></div>
          <span className="text-sm font-medium text-gray-400">Loading...</span>
        </div>
      </div>
    </div>
  );
}

// Async component that handles authentication
async function ChatContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">Please log in to access chat</p>
        </div>
      </div>
    );
  }

  return <ChatPageShell />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatLoadingFallback />}>
      <ChatContent />
    </Suspense>
  );
}
