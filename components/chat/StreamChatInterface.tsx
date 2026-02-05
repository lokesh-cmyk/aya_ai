"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useStreamClient } from "@/lib/stream/stream-client-browser";
import {
  Chat,
  Channel,
  MessageList,
  Message,
  Thread,
  Window,
  useChannelStateContext,
  TypingIndicator,
  useMessageContext,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  X,
  Users,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

interface StreamChatInterfaceProps {
  channelId?: string;
  channelType?: 'messaging' | 'team';
  memberIds?: string[];
}

export function StreamChatInterface({
  channelId,
  channelType = 'messaging',
  memberIds
}: StreamChatInterfaceProps) {
  const { data: session } = useSession();
  const { client, isConnected, error } = useStreamClient();
  const [channel, setChannel] = useState<any>(null);

  // Initialize channel - must be in useEffect, not conditional
  useEffect(() => {
    if (!client || !session?.user?.id) return;

    const initChannel = async () => {
      try {
        let newChannel;
        
        if (channelId) {
          // Get existing channel
          newChannel = client.channel(channelType, channelId);
          await newChannel.watch();
        } else if (memberIds && memberIds.length > 0) {
          // Create 1-on-1 or group chat
          const allMembers = [session.user.id, ...memberIds].filter(Boolean) as string[];
          // Sort member IDs to create consistent channel IDs for 1-on-1 chats
          const sortedMembers = [...allMembers].sort();
          
          // Create a hash of member IDs to ensure channel ID is under 64 characters
          const createChannelId = async (members: string[]): Promise<string> => {
            const combined = members.join('-');
            // If combined is already short enough, use it
            if (combined.length <= 60) {
              return combined;
            }
            
            // Create a hash using Web Crypto API for consistent, short IDs
            try {
              const encoder = new TextEncoder();
              const data = encoder.encode(combined);
              const hashBuffer = await crypto.subtle.digest('SHA-256', data);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
              // Use first 32 characters of hash (64 hex chars = 32 bytes, but we need shorter)
              // Use base36 encoding for shorter ID
              const hashNum = BigInt('0x' + hashHex.substring(0, 16));
              return `dm-${hashNum.toString(36)}`;
            } catch (err) {
              // Fallback to simple hash if crypto is not available
              let hash = 0;
              for (let i = 0; i < combined.length; i++) {
                const char = combined.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
              }
              return `dm-${Math.abs(hash).toString(36)}`;
            }
          };
          
          const channelIdForDM = await createChannelId(sortedMembers);

          // Ensure all members exist in Stream before create (avoids "users don't exist" 400)
          try {
            await fetch("/api/chat/ensure-stream-users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userIds: allMembers }),
            });
          } catch (ensureErr) {
            console.warn("[StreamChat] ensure-stream-users failed:", ensureErr);
          }

          // Try to find existing channel first
          try {
            const [existingChannel] = await client.queryChannels({
              type: channelType,
              members: { $in: allMembers },
              member_count: allMembers.length,
            });
            
            if (existingChannel) {
              newChannel = existingChannel;
              await newChannel.watch();
            } else {
              // Create new channel with both members
              newChannel = client.channel(channelType, channelIdForDM, {
                members: allMembers,
              } as any);
              // Create the channel on the server - this ensures both users are members
              const created = await newChannel.create();
              console.log('Created channel:', created);
              
              // Ensure all members are added
              if (created && allMembers.length > 1) {
                // Add any missing members
                for (const memberId of allMembers) {
                  try {
                    await newChannel.addMembers([memberId]);
                  } catch (err) {
                    // Member might already be added, ignore
                    console.warn(`Member ${memberId} might already be in channel`);
                  }
                }
              }
              
              await newChannel.watch();
            }
          } catch (queryError) {
            // If query fails, try to create directly
            console.warn('Query channels failed, creating new channel:', queryError);
            newChannel = client.channel(channelType, channelIdForDM, {
              members: allMembers,
            } as any);
            await newChannel.create();
            await newChannel.watch();
          }
        } else {
          // Don't create a default team channel - require member selection
          return;
        }
        
        setChannel(newChannel);
        
        // Listen for new messages to ensure they appear
        const handleNewMessage = (event: any) => {
          console.log('[StreamChatInterface] New message event:', event);
          console.log('[StreamChatInterface] Message:', event.message);
          console.log('[StreamChatInterface] Channel messages count:', newChannel.state.messages.length);
        };
        
        newChannel.on('message.new', handleNewMessage);
        newChannel.on('message.updated', handleNewMessage);
        newChannel.on('message.deleted', () => {
          console.log('[StreamChatInterface] Message deleted');
        });
        
        // Cleanup listeners on unmount
        return () => {
          newChannel.off('message.new', handleNewMessage);
          newChannel.off('message.updated', handleNewMessage);
        };
      } catch (error) {
        console.error('Error initializing channel:', error);
      }
    };

    initChannel();
  }, [client, channelId, channelType, memberIds, session?.user?.id]);

  // Early return AFTER all hooks
  if (!client || !isConnected) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          {error ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Error
              </h2>
              <p className="text-gray-500 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Retry Connection
              </Button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Connecting to chat...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white">
      <Chat client={client}>
        <Channel channel={channel}>
          <Window>
            <div className="flex flex-col h-full">
              {/* Custom Header with Typing Indicator */}
              <StreamChatHeader />
              
              {/* Message List - Custom Message component for audio files */}
              <div className="flex-1 overflow-hidden">
                <MessageList 
                  Message={CustomMessage}
                  // Ensure all messages are loaded, including file messages
                  loadMore={async () => {
                    try {
                      await channel.query({ messages: { limit: 20 } });
                    } catch (err) {
                      console.warn('Error loading more messages:', err);
                    }
                  }}
                />
              </div>

              {/* Typing Indicator */}
              <TypingIndicator />

              {/* Custom Message Input with File Upload */}
              <StreamMessageInput />
            </div>
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
}

// Use Stream's default Message component for all messages
// Stream handles text, images, files, and audio with its built-in UI
function CustomMessage() {
  const messageContext = useMessageContext();
  const message = messageContext?.message;

  if (!message) {
    return null;
  }

  // Use Stream's default Message component for everything
  // It provides a clean, intuitive UI for all attachment types
  return <Message message={message} />;
}

// Custom Header Component with Typing Indicator
function StreamChatHeader() {
  const { channel } = useChannelStateContext();
  const [typingUsers, setTypingUsers] = useState<Array<{ name: string; id: string }>>([]);

  useEffect(() => {
    if (!channel) return;

    const handleTyping = (event: any) => {
      const typing = event.typing || {};
      const currentUserId = channel.state.membership?.user?.id;
      
      const users = Object.keys(typing)
        .filter((userId) => userId !== currentUserId)
        .map((userId) => {
          const member = channel.state.members[userId];
          const user = member?.user;
          return {
            id: userId,
            name: user?.name || user?.id || 'Someone',
          };
        });
      
      setTypingUsers(users);
    };

    channel.on('typing.start', handleTyping);
    channel.on('typing.stop', handleTyping);

    return () => {
      channel.off('typing.start', handleTyping);
      channel.off('typing.stop', handleTyping);
    };
  }, [channel]);

  const typingText = typingUsers.length > 0
    ? `${typingUsers.length === 1 ? typingUsers[0].name : `${typingUsers.length} people`} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`
    : null;

  const channelName = (channel?.data as any)?.name || 
    (channel?.state?.members && Object.keys(channel.state.members).length === 2
      ? Object.values(channel.state.members).find((m: any) => m.user?.id !== channel.state.membership?.user?.id)?.user?.name || 'Direct Message'
      : 'Team Chat');

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3 rounded-t-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {channelName}
          </h2>
          {typingText && (
            <p className="text-sm text-blue-600 italic animate-pulse truncate">
              {typingText}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Users className="w-5 h-5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <UserPlus className="w-5 h-5 text-gray-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper to send notification for chat messages
async function sendChatNotification(messagePreview: string, channelId?: string, channelName?: string) {
  try {
    await fetch('/api/chat/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messagePreview, channelId, channelName }),
    });
  } catch (error) {
    // Silent fail - notifications are non-critical
    console.warn('[StreamChat] Notification failed:', error);
  }
}

// Custom Message Input with File Upload and Audio
function StreamMessageInput() {
  const { channel } = useChannelStateContext();
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Manually trigger typing events for Stream.io
  const triggerTyping = useCallback(() => {
    if (!channel) return;
    
    try {
      // Send typing.start event
      channel.keystroke();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        try {
          channel.stopTyping();
        } catch (err) {
          // Ignore errors when stopping typing
        }
      }, 3000);
    } catch (err) {
      // Ignore typing errors
      console.warn('Typing indicator error:', err);
    }
  }, [channel]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      channel?.stopTyping();
    };
  }, [channel]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && channel) {
      // Check file size (Stream has a 100MB limit, but let's set 20MB for chat)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        toast.error(`File too large. Maximum size is 20MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
        if (e.target) e.target.value = '';
        return;
      }

      const uploadToast = toast.loading(`Uploading ${file.name}...`);

      try {
        let response;
        let attachmentType: string;

        if (file.type.startsWith('image/')) {
          response = await channel.sendImage(file);
          attachmentType = 'image';
        } else if (file.type.startsWith('video/')) {
          response = await channel.sendFile(file);
          attachmentType = 'video';
        } else {
          response = await channel.sendFile(file);
          attachmentType = 'file';
        }

        if (response?.file) {
          await channel.sendMessage({
            text: '',
            attachments: [{
              type: attachmentType,
              asset_url: response.file,
              title: file.name,
              file_size: file.size,
              mime_type: file.type,
            }],
          });
          toast.success(`${file.name} sent successfully`, { id: uploadToast });

          // Trigger notification for team members
          sendChatNotification(`Shared a file: ${file.name}`, channel.id, (channel.data as any)?.name);
        }
      } catch (error: any) {
        console.error("Error uploading file:", error);
        toast.error(`Failed to upload: ${error?.message || 'Unknown error'}`, { id: uploadToast });
      }
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleSend = async () => {
    if (!channel) return;

    if (audioBlob) {
      // Upload audio as file to Stream CDN, then send message with attachment
      const audioFile = new File([audioBlob], `audio-message-${Date.now()}.webm`, {
        type: "audio/webm",
      });

      const audioToast = toast.loading("Sending voice message...");
      try {
        console.log('[StreamMessageInput] Uploading audio file:', {
          name: audioFile.name,
          type: audioFile.type,
          size: audioFile.size,
        });

        // Step 1: Upload file to Stream CDN
        const uploadResponse = await channel.sendFile(audioFile);
        console.log('[StreamMessageInput] Upload response:', uploadResponse);

        if (uploadResponse?.file) {
          // Step 2: Send message with the audio attachment
          const messageResponse = await channel.sendMessage({
            text: '',
            attachments: [{
              type: 'audio',
              asset_url: uploadResponse.file,
              title: audioFile.name,
              file_size: audioFile.size,
              mime_type: audioFile.type,
            }],
          });
          console.log('[StreamMessageInput] Message sent:', messageResponse);
          toast.success("Voice message sent", { id: audioToast });

          // Trigger notification for team members
          sendChatNotification('Voice message', channel.id, (channel.data as any)?.name);
        }

        // Clear audio state after successful send
        setAudioBlob(null);
        setAudioUrl(null);
      } catch (error: any) {
        console.error("[StreamMessageInput] Error sending audio:", error);
        toast.error(`Failed to send voice message: ${error?.message || 'Unknown error'}`, { id: audioToast });
        // Don't clear state on error so user can retry
      }
    } else if (messageText.trim()) {
      const textToSend = messageText.trim();
      try {
        // Stop typing before sending
        try {
          channel.stopTyping();
        } catch (err) {
          // Ignore typing errors
        }

        await channel.sendMessage({
          text: textToSend,
        });
        setMessageText('');

        // Trigger notification for team members
        sendChatNotification(textToSend, channel.id, (channel.data as any)?.name);
      } catch (error: any) {
        console.error("Error sending message:", error);
        toast.error(`Failed to send message: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* Audio Preview */}
      {audioUrl && (
        <div className="mb-3 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-3">
          <audio controls src={audioUrl} className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setAudioBlob(null);
              setAudioUrl(null);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File Upload Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full"
        >
          <Paperclip className="w-5 h-5 text-gray-500" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="*/*"
        />

        {/* Image Upload Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file && channel) {
                // Check file size
                const maxSize = 20 * 1024 * 1024; // 20MB
                if (file.size > maxSize) {
                  toast.error(`Image too large. Maximum size is 20MB.`);
                  return;
                }

                const uploadToast = toast.loading(`Uploading ${file.name}...`);
                try {
                  // Upload image to Stream CDN
                  const response = await channel.sendImage(file);

                  // Send message with image attachment
                  if (response?.file) {
                    await channel.sendMessage({
                      text: '',
                      attachments: [{
                        type: 'image',
                        image_url: response.file,
                        asset_url: response.file,
                        title: file.name,
                        file_size: file.size,
                        mime_type: file.type,
                      }],
                    });
                    toast.success(`Image sent successfully`, { id: uploadToast });

                    // Trigger notification for team members
                    sendChatNotification('Shared an image', channel.id, (channel.data as any)?.name);
                  }
                } catch (error: any) {
                  console.error("Error uploading image:", error);
                  toast.error(`Failed to upload image: ${error?.message || 'Unknown error'}`, { id: uploadToast });
                }
              }
            };
            input.click();
          }}
          className="rounded-full"
        >
          <ImageIcon className="w-5 h-5 text-gray-500" />
        </Button>

        {/* Text Input - Manually trigger typing events for Stream.io */}
        <div className="flex-1 relative">
          <Input
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              // Trigger typing indicator
              triggerTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                // Stop typing when sending
                channel?.stopTyping();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="rounded-full pr-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Audio Recording Button */}
        {!isRecording ? (
          <Button
            variant="ghost"
            size="icon"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            className="rounded-full"
          >
            <Mic className="w-5 h-5 text-gray-500" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={stopRecording}
            className="rounded-full bg-red-100 text-red-600 hover:bg-red-200"
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!messageText.trim() && !audioBlob}
          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}