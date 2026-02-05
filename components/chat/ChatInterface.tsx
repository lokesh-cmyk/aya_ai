"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  X,
  Play,
  Pause,
  Download,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useChatWebSocket } from "@/lib/hooks/useChatWebSocket";
import Link from "next/link";

interface ChatMessage {
  id: string;
  content: string;
  type: string;
  senderId: string;
  createdAt: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  parent?: {
    id: string;
    content: string;
    sender?: {
      name: string;
    };
  };
}

interface ChatInterfaceProps {
  teamId: string;
}

export function ChatInterface({ teamId }: ChatInterfaceProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket connection for real-time updates
  const handleNewMessage = useCallback(
    (newMessage: ChatMessage) => {
      queryClient.setQueryData(["chat-messages", teamId], (old: any) => {
        if (!old) return { messages: [newMessage] };
        // Check if message already exists
        if (old.messages.some((m: ChatMessage) => m.id === newMessage.id)) {
          return old;
        }
        return {
          ...old,
          messages: [...old.messages, newMessage],
        };
      });
      scrollToBottom();
    },
    [teamId, queryClient]
  );

  const { isConnected: wsConnected } = useChatWebSocket(teamId, handleNewMessage);

  // Update isConnected state when WebSocket connection changes
  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["chat-messages", teamId],
    queryFn: async () => {
      const response = await fetch(`/api/chat?limit=50`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    refetchInterval: isConnected ? false : 3000, // Poll every 3 seconds if WebSocket not connected
  });

  const messages: ChatMessage[] = messagesData?.messages || [];

  // Update refetch interval based on WebSocket connection
  useEffect(() => {
    if (isConnected) {
      // If WebSocket is connected, disable polling
      queryClient.setQueryData(["chat-messages", teamId], (old: any) => old);
    }
  }, [isConnected, teamId, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: {
      content: string;
      type: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    }) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", teamId] });
      scrollToBottom();
    },
  });

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", file.type.startsWith("image/") ? "image" : "file");

      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload file");
      return response.json();
    },
    onSuccess: (data) => {
      sendMessageMutation.mutate({
        content: data.fileName || "File",
        type: data.type,
        fileUrl: data.url,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      });
    },
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() && !audioBlob) return;

    if (audioBlob) {
      // Upload audio first
      const audioFile = new File([audioBlob], "audio-message.webm", {
        type: "audio/webm",
      });
      uploadFileMutation.mutate(audioFile);
      setAudioBlob(null);
      setAudioUrl(null);
    } else if (message.trim()) {
      sendMessageMutation.mutate({
        content: message.trim(),
        type: "text",
      });
    }
  };

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate(file);
    }
  };

  // Extract URLs from message content for hyperlinking
  const extractLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <Link
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <LinkIcon className="w-3 h-3" />
            {part}
          </Link>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white">
      {/* Connection Status */}
      {!isConnected && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-sm text-yellow-800">
          Reconnecting to chat...
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-6" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            const isOwn = msg.senderId === session?.user?.id;
            const senderName = msg.sender?.name || msg.sender?.email || "Unknown";
            const senderInitials = senderName.charAt(0).toUpperCase();

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 group",
                  isOwn ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {msg.sender?.image ? (
                    <img
                      src={msg.sender.image}
                      alt={senderName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                      {senderInitials}
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div
                  className={cn(
                    "flex flex-col gap-1 max-w-[70%]",
                    isOwn ? "items-end" : "items-start"
                  )}
                >
                  {/* Sender Name & Time */}
                  {!isOwn && (
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-xs font-medium text-gray-700">
                        {senderName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(msg.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 shadow-sm transition-all",
                      isOwn
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                    )}
                  >
                    {/* Reply Preview */}
                    {msg.parent && (
                      <div
                        className={cn(
                          "mb-2 pb-2 border-l-2 pl-2 text-xs opacity-75",
                          isOwn ? "border-white/30" : "border-gray-300"
                        )}
                      >
                        <div className="font-medium">
                          {msg.parent.sender?.name || "Unknown"}
                        </div>
                        <div className="truncate">{msg.parent.content}</div>
                      </div>
                    )}

                    {/* Text Message */}
                    {msg.type === "text" && (
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {extractLinks(msg.content)}
                      </div>
                    )}

                    {/* Image Message */}
                    {msg.type === "image" && msg.fileUrl && (
                      <div className="space-y-2">
                        <img
                          src={msg.fileUrl}
                          alt={msg.fileName || "Image"}
                          className="max-w-full rounded-lg"
                        />
                        {msg.content && msg.content !== msg.fileName && (
                          <div className="text-sm mt-2">{extractLinks(msg.content)}</div>
                        )}
                      </div>
                    )}

                    {/* Audio Message */}
                    {msg.type === "audio" && msg.fileUrl && (
                      <div className="flex items-center gap-3">
                        <audio controls className="max-w-xs">
                          <source src={msg.fileUrl} type={msg.mimeType || "audio/webm"} />
                        </audio>
                      </div>
                    )}

                    {/* File Message */}
                    {msg.type === "file" && msg.fileUrl && (
                      <div className="flex items-center gap-3 p-2 bg-black/5 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {msg.fileName || "File"}
                          </div>
                          {msg.fileSize && (
                            <div className="text-xs opacity-75">
                              {(msg.fileSize / 1024).toFixed(1)} KB
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className={cn(
                            "h-8 w-8 p-0",
                            isOwn ? "text-white hover:bg-white/20" : ""
                          )}
                        >
                          <a href={msg.fileUrl} download>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    )}

                    {/* Time Stamp */}
                    <div
                      className={cn(
                        "text-xs mt-1 opacity-70",
                        isOwn ? "text-right" : "text-left"
                      )}
                    >
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Audio Preview */}
      {audioUrl && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
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

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
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
            accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
          />

          {/* Image Upload Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) uploadFileMutation.mutate(file);
              };
              input.click();
            }}
            className="rounded-full"
          >
            <ImageIcon className="w-5 h-5 text-gray-500" />
          </Button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
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
              <Pause className="w-5 h-5" />
            </Button>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!message.trim() && !audioBlob}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
