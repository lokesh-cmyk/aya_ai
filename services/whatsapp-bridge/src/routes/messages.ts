import { Router } from "express";
import multer from "multer";
import { sessionManager } from "../session-manager";

const router = Router();
const upload = multer({ limits: { fileSize: 16 * 1024 * 1024 } }); // 16MB limit

// Get chats for a session
router.get("/sessions/:id/chats", async (req, res) => {
  try {
    const chats = await sessionManager.getChats(req.params.id);
    res.json({ chats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a chat
router.get("/sessions/:id/chats/:chatId/messages", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await sessionManager.getMessages(
      req.params.id,
      req.params.chatId,
      limit
    );
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send text message
router.post("/sessions/:id/send/text", async (req, res) => {
  try {
    const { chatId, text } = req.body;
    if (!chatId || !text) {
      return res.status(400).json({ error: "chatId and text are required" });
    }

    const result = await sessionManager.sendText(req.params.id, chatId, text);
    res.json({ success: true, messageId: result?.key.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send media (image, video, document)
router.post("/sessions/:id/send/media", upload.single("file"), async (req, res) => {
  try {
    const { chatId, caption } = req.body;
    const file = req.file;

    if (!chatId || !file) {
      return res.status(400).json({ error: "chatId and file are required" });
    }

    const result = await sessionManager.sendMedia(
      req.params.id as string,
      String(chatId),
      file.buffer,
      String(file.mimetype),
      file.originalname,
      caption
    );
    res.json({ success: true, messageId: result?.key.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send audio/voice note
router.post("/sessions/:id/send/audio", upload.single("audio"), async (req, res) => {
  try {
    const { chatId } = req.body;
    const file = req.file;

    if (!chatId || !file) {
      return res.status(400).json({ error: "chatId and audio file are required" });
    }

    const result = await sessionManager.sendAudio(
      req.params.id as string,
      String(chatId),
      file.buffer
    );
    res.json({ success: true, messageId: result?.key.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
