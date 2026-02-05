"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Hash, Lock, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface SlackChannelSelectorProps {
  open: boolean;
  onClose: () => void;
  integrationId: string;
}

export function SlackChannelSelector({ open, onClose, integrationId }: SlackChannelSelectorProps) {
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch available channels
  const { data: channelsData, isLoading: channelsLoading, error: channelsError } = useQuery({
    queryKey: ['slack-channels', integrationId],
    queryFn: async () => {
      const res = await fetch('/api/integrations/slack/channels');
      if (!res.ok) throw new Error('Failed to fetch channels');
      return res.json();
    },
    enabled: open && !!integrationId,
  });

  const channels: Channel[] = channelsData?.channels || [];

  // Save selected channels
  const saveMutation = useMutation({
    mutationFn: async (channelIds: string[]) => {
      const res = await fetch('/api/integrations/slack/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId,
          channelIds,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save channels');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db-integrations'] });
      queryClient.invalidateQueries({ queryKey: ['slack-channels'] });
      onClose();
    },
  });

  const handleToggleChannel = (channelId: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const [showError, setShowError] = useState(false);

  const handleSave = () => {
    if (selectedChannels.size === 0) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }
    saveMutation.mutate(Array.from(selectedChannels));
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-hidden flex flex-col rounded-3xl border-gray-200/60 bg-white/80 backdrop-blur-xl shadow-xl p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200/60">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">Select Slack Channels</DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-0.5">
                  Choose which channels to monitor in your inbox
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Error message */}
        {showError && (
          <div className="mx-6 mt-4 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <X className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-sm font-medium text-red-700">Please select at least one channel</p>
          </div>
        )}

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {channelsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
              <p className="text-gray-600 font-medium">Loading channels...</p>
              <p className="text-sm text-gray-400 mt-1">This may take a moment</p>
            </div>
          ) : channelsError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 backdrop-blur-sm border border-red-500/20 flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-red-600 font-medium mb-1">Failed to load channels</p>
              <p className="text-sm text-gray-500 mb-4 text-center max-w-xs">
                {channelsError instanceof Error ? channelsError.message : 'An unexpected error occurred'}
              </p>
              <Button
                variant="outline"
                onClick={() => queryClient.refetchQueries({ queryKey: ['slack-channels'] })}
                className="rounded-2xl border-gray-200/60 bg-white/60 backdrop-blur-sm"
              >
                Try Again
              </Button>
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-gray-500/10 backdrop-blur-sm border border-gray-200/60 flex items-center justify-center mb-4">
                <Hash className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-1">No channels found</p>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                Make sure your Slack app has the required permissions.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Selection count */}
              {selectedChannels.size > 0 && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-indigo-500/10 backdrop-blur-sm rounded-2xl border border-indigo-500/20">
                  <Check className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-700">
                    {selectedChannels.size} channel{selectedChannels.size !== 1 ? 's' : ''} selected
                  </span>
                </div>
              )}

              {channels.map((channel) => {
                const isSelected = selectedChannels.has(channel.id);
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleToggleChannel(channel.id)}
                    className={`
                      w-full text-left p-4 rounded-2xl border backdrop-blur-sm transition-all duration-200 ease-out
                      ${isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/30'
                        : 'bg-white/60 border-gray-200/60 hover:bg-white/80 hover:border-gray-300/60'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Custom checkbox */}
                        <div
                          className={`
                            w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ease-out
                            ${isSelected
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-gray-300 bg-white'
                            }
                          `}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Channel icon */}
                        <div className={`
                          w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-sm border
                          ${channel.isPrivate
                            ? 'bg-amber-500/10 border-amber-500/20'
                            : 'bg-gray-500/10 border-gray-200/60'
                          }
                        `}>
                          {channel.isPrivate ? (
                            <Lock className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Hash className="w-4 h-4 text-gray-500" />
                          )}
                        </div>

                        {/* Channel info */}
                        <div>
                          <p className={`font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                            #{channel.name}
                          </p>
                          {channel.isPrivate && (
                            <p className="text-xs text-amber-600">Private channel</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200/60 bg-gray-50/50">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={saveMutation.isPending}
            className="text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saveMutation.isPending}
              className="rounded-2xl border-gray-200/60 bg-white/60 backdrop-blur-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || selectedChannels.size === 0}
              className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-300 ease-out min-w-[120px]"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save {selectedChannels.size > 0 ? `(${selectedChannels.size})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
