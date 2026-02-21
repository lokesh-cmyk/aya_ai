import { Router } from "express";
import { sessionManager } from "../session-manager";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    activeSessions: sessionManager.getActiveSessionCount(),
    uptime: process.uptime(),
  });
});

export default router;
