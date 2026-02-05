import { Loader2 } from "lucide-react";

export default function InviteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading invitation...</p>
      </div>
    </div>
  );
}
