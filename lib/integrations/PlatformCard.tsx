// components/integrations/PlatformCard.tsx
"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, RefreshCw, XCircle, ExternalLink, Clock } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface PlatformCardProps {
  platform: {
    id: string;
    name: string;
    icon: LucideIcon;
    description: string;
    color: string;
    bgColor: string;
  };
  account: any | null;
  isConnecting: boolean;
  isHighlighted: boolean;
  isSyncing?: boolean;
  onConnect: () => void;
  onDisconnect: (accountId: string) => void;
  onSync?: () => void;
  canSync?: boolean;
}

export function PlatformCard({
  platform,
  account,
  isConnecting,
  isHighlighted,
  isSyncing = false,
  onConnect,
  onDisconnect,
  onSync,
  canSync = false,
}: PlatformCardProps) {
  const Icon = platform.icon;
  const isConnected = !!account;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div
      className={`
        group relative bg-white/60 backdrop-blur-xl rounded-3xl border shadow-sm
        hover:shadow-lg hover:bg-white/80 transition-all duration-300 ease-out
        ${isHighlighted
          ? "border-indigo-500/40 ring-2 ring-indigo-500/20"
          : "border-gray-200/60 hover:border-gray-300/60"
        }
        ${isConnected ? "border-t-2 border-t-emerald-500/50" : ""}
      `}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 ease-out">
            <Icon className="w-6 h-6 text-indigo-600" />
          </div>
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-500/10 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-500/20">
              Not connected
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors duration-200">
          {platform.name}
        </h3>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed line-clamp-2">
          {platform.description}
        </p>

        {/* Connected State */}
        {isConnected && account ? (
          <div className="space-y-3">
            {/* Connection info */}
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-500/5 backdrop-blur-sm rounded-2xl px-3 py-2 border border-gray-200/60">
              <Clock className="w-3.5 h-3.5" />
              <span>Connected {account.created_at || account.createdAt
                ? formatDate(account.created_at || account.createdAt)
                : 'recently'}</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {canSync && onSync && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10 rounded-2xl border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm hover:bg-indigo-500/10 hover:border-indigo-500/30 text-indigo-700 font-medium transition-all duration-300 ease-out"
                  onClick={onSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className={`${canSync ? 'flex-1' : 'w-full'} h-10 rounded-2xl border-gray-200/60 bg-white/60 backdrop-blur-sm hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-600 font-medium transition-all duration-300 ease-out`}
                onClick={() => onDisconnect(account.id || account.account_id)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          /* Not Connected State */
          <Button
            className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-300 ease-out"
            onClick={onConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect {platform.name}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
