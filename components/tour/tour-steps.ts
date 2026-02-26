// components/tour/tour-steps.ts
import type { DriveStep } from "driver.js";

export const TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="sidebar-nav"]',
    popover: {
      title: "Your Navigation Hub",
      description: "All your tools are organized right here in the sidebar. Let me show you around!",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: "Dashboard",
      description: "Your home base — see tasks, metrics, and recent activity at a glance.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-inbox"]',
    popover: {
      title: "Unified Inbox",
      description: "All messages from Email, WhatsApp, Slack — in one place. No more tab-switching!",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-aya"]',
    popover: {
      title: "Meet AYA",
      description: "Your AI assistant. Ask questions, get summaries, and automate tasks.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-chat"]',
    popover: {
      title: "Team Chat",
      description: "Real-time messaging with your team. Stay connected without leaving the platform.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-meetings"]',
    popover: {
      title: "Meetings",
      description: "Schedule, join, and review meeting notes — all synced with your calendar.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-crm"]',
    popover: {
      title: "CRM",
      description: "Manage your contacts, deals, and customer relationships.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-kb"]',
    popover: {
      title: "Knowledge Base",
      description: "Store and search your team's documents and files.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-vendors"]',
    popover: {
      title: "Vendors",
      description: "Track vendor relationships, risks, and compliance.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-analytics"]',
    popover: {
      title: "Analytics",
      description: "Insights and reports on team and workspace performance.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="command-palette-hint"]',
    popover: {
      title: "Quick Command",
      description: "Press Ctrl+K anytime to search anything instantly. It's like magic!",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-settings"]',
    popover: {
      title: "Settings",
      description: "Configure your workspace, integrations, and preferences.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="replay-tour"]',
    popover: {
      title: "Replay Anytime!",
      description: "Want to see this tour again? Just click here. Have fun exploring!",
      side: "right",
      align: "start",
    },
  },
];
