"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode, Keyboard, CheckCircle2 } from "lucide-react";

interface WhatsAppConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
  sessionId: string | null;
  slot: number;
}

type Tab = "qr" | "pairing";

export function WhatsAppConnectModal({
  open,
  onClose,
  onConnected,
  sessionId,
  slot,
}: WhatsAppConnectModalProps) {
  const [tab, setTab] = useState<Tab>("qr");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("connecting");
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection for real-time QR + status updates
  useEffect(() => {
    if (!open || !sessionId) return;

    const bridgeBaseUrl = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_URL;
    const bridgeApiKey = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_API_KEY;
    if (!bridgeBaseUrl || !bridgeApiKey) return;

    const wsUrl = bridgeBaseUrl.replace(/^http/, "ws") + `/ws?apiKey=${encodeURIComponent(bridgeApiKey)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", sessionId }));
    };

    ws.onmessage = (event) => {
      try {
        const { channel, data } = JSON.parse(event.data);

        if (channel === `wa:qr:${sessionId}`) {
          setQrImage(data.qr);
          setStatus("qr_ready");
        }

        if (channel === `wa:status:${sessionId}`) {
          setStatus(data.status);
          if (data.status === "connected") {
            setTimeout(() => {
              onConnected();
              onClose();
            }, 1500);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = () => setStatus("error");

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [open, sessionId, onConnected, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setQrImage(null);
      setStatus("connecting");
      setPairingCode(null);
      setPairingPhone("");
      setTab("qr");
    }
  }, [open]);

  const requestPairingCode = async () => {
    if (!sessionId || !pairingPhone) return;
    setPairingLoading(true);
    try {
      const res = await fetch(
        `/api/integrations/whatsapp-inbox/sessions/${sessionId}/pairing-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: pairingPhone }),
        }
      );
      const data = await res.json();
      if (data.code) {
        setPairingCode(data.code);
      }
    } catch {
      // Handle error
    } finally {
      setPairingLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect WhatsApp (Slot {slot})</DialogTitle>
        </DialogHeader>

        {status === "connected" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-lg font-medium text-green-700">Connected!</p>
          </div>
        ) : (
          <>
            {/* Tab switcher */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={tab === "qr" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("qr")}
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
              <Button
                variant={tab === "pairing" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("pairing")}
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Pairing Code
              </Button>
            </div>

            {tab === "qr" && (
              <div className="flex flex-col items-center gap-4">
                {qrImage ? (
                  <>
                    <img
                      src={qrImage}
                      alt="WhatsApp QR Code"
                      className="w-64 h-64 rounded-lg border"
                    />
                    <p className="text-sm text-gray-500 text-center">
                      Open WhatsApp on your phone, go to Settings &gt; Linked
                      Devices &gt; Link a Device, then scan this QR code.
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    <p className="text-sm text-gray-500">Generating QR code...</p>
                  </div>
                )}
              </div>
            )}

            {tab === "pairing" && (
              <div className="flex flex-col gap-4">
                {!pairingCode ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Enter your WhatsApp phone number to get a pairing code.
                    </p>
                    <Input
                      placeholder="+1234567890"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                    />
                    <Button
                      onClick={requestPairingCode}
                      disabled={!pairingPhone || pairingLoading}
                    >
                      {pairingLoading && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Get Pairing Code
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Enter this code in WhatsApp: Settings &gt; Linked Devices
                      &gt; Link a Device &gt; Link with Phone Number
                    </p>
                    <div className="text-3xl font-mono font-bold text-center tracking-widest py-4">
                      {pairingCode}
                    </div>
                  </>
                )}
              </div>
            )}

            {status === "error" && (
              <p className="text-sm text-red-500 text-center mt-2">
                Connection error. Please try again.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
