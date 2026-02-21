import { Router } from "express";
import { prisma } from "../prisma";
import { sessionManager } from "../session-manager";

const router = Router();

// Create a new session and start QR flow
router.post("/sessions", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const session = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await sessionManager.createSession(sessionId);
    res.json({ success: true, sessionId });
  } catch (err: any) {
    console.error("Create session error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete/disconnect a session
router.delete("/sessions/:id", async (req, res) => {
  try {
    await sessionManager.destroySession(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Destroy session error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get session status
router.get("/sessions/:id/status", async (req, res) => {
  try {
    const session = await prisma.whatsAppSession.findUnique({
      where: { id: req.params.id },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({
      id: session.id,
      status: session.status,
      phone: session.phone,
      displayName: session.displayName,
      socketActive: sessionManager.getStatus(session.id) === "active",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Request pairing code (alternative to QR)
router.post("/sessions/:id/pairing-code", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "phone is required" });
    }

    const code = await sessionManager.getPairingCode(req.params.id, phone);
    res.json({ success: true, code });
  } catch (err: any) {
    console.error("Pairing code error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
