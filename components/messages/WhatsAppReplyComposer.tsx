"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppReplyComposerProps {
  sessionId: string;
  chatId: string;
  onMessageSent?: () => void;
}

export function WhatsAppReplyComposer({
  sessionId,
  chatId,
  onMessageSent,
}: WhatsAppReplyComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sendText = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/integrations/whatsapp-inbox/sessions/${sessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, text: text.trim() }),
        }
      );
      if (res.ok) {
        setText("");
        onMessageSent?.();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send message");
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const sendFile = async (file: File) => {
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chatId", chatId);

      const res = await fetch(
        `/api/integrations/whatsapp-inbox/sessions/${sessionId}/send-media`,
        { method: "POST", body: formData }
      );
      if (res.ok) {
        toast.success("File sent");
        onMessageSent?.();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send file");
      }
    } catch {
      toast.error("Failed to send file");
    } finally {
      setSending(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });

        setSending(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, "voice.webm");
          formData.append("chatId", chatId);

          const res = await fetch(
            `/api/integrations/whatsapp-inbox/sessions/${sessionId}/send-audio`,
            { method: "POST", body: formData }
          );
          if (res.ok) {
            toast.success("Voice note sent");
            onMessageSent?.();
          } else {
            const data = await res.json();
            toast.error(data.error || "Failed to send voice note");
          }
        } catch {
          toast.error("Failed to send voice note");
        } finally {
          setSending(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  return (
    <div className="border-t border-gray-200 p-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) sendFile(file);
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <Paperclip className="w-5 h-5 text-gray-500" />
        </Button>

        <Input
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendText();
            }
          }}
          disabled={sending || recording}
          className="flex-1"
        />

        {text.trim() ? (
          <Button
            size="icon"
            className="shrink-0 bg-green-600 hover:bg-green-700"
            onClick={sendText}
            disabled={sending}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        ) : (
          <Button
            variant={recording ? "destructive" : "ghost"}
            size="icon"
            className="shrink-0"
            onClick={toggleRecording}
            disabled={sending}
          >
            {recording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5 text-gray-500" />
            )}
          </Button>
        )}
      </div>

      {recording && (
        <p className="text-xs text-red-500 mt-1 animate-pulse">
          Recording... Tap the mic button to stop and send.
        </p>
      )}
    </div>
  );
}
