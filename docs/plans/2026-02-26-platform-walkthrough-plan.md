# Platform Walkthrough Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an interactive platform walkthrough with an animated owl mascot that guides new users through all major features, triggered after onboarding, replayable from the sidebar.

**Architecture:** Driver.js handles overlay/spotlight/positioning. A custom popover template renders an animated SVG owl mascot with Framer Motion. Tour state is managed via React context and persisted in localStorage. A "Platform Tour" button in the sidebar lets users replay anytime.

**Tech Stack:** Driver.js, Framer Motion, React Context, localStorage, Lucide icons, Tailwind CSS

---

### Task 1: Install Driver.js

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `npm install driver.js`

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add driver.js for platform walkthrough"
```

---

### Task 2: Create the Owl Mascot SVG Component

**Files:**
- Create: `components/tour/OwlMascot.tsx`

**Step 1: Create the owl mascot component**

```tsx
"use client";

import { motion } from "framer-motion";

interface OwlMascotProps {
  mood?: "happy" | "wave" | "point";
  size?: number;
}

export function OwlMascot({ mood = "happy", size = 56 }: OwlMascotProps) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="flex-shrink-0"
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ y: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        {/* Body */}
        <ellipse cx="60" cy="70" rx="38" ry="40" fill="url(#owlGradient)" />

        {/* Belly */}
        <ellipse cx="60" cy="78" rx="22" ry="24" fill="#E8EAFF" opacity="0.6" />

        {/* Left eye white */}
        <circle cx="44" cy="55" r="14" fill="white" />
        {/* Right eye white */}
        <circle cx="76" cy="55" r="14" fill="white" />

        {/* Left pupil */}
        <motion.circle
          cx="46"
          cy="56"
          r="7"
          fill="#1E293B"
          animate={mood === "wave" ? { cx: [46, 48, 46] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
        {/* Right pupil */}
        <motion.circle
          cx="78"
          cy="56"
          r="7"
          fill="#1E293B"
          animate={mood === "wave" ? { cx: [78, 80, 78] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />

        {/* Eye shine */}
        <circle cx="43" cy="53" r="3" fill="white" opacity="0.9" />
        <circle cx="75" cy="53" r="3" fill="white" opacity="0.9" />

        {/* Beak */}
        <path d="M55 65 L60 72 L65 65 Z" fill="#F59E0B" />

        {/* Left ear tuft */}
        <path d="M30 38 Q35 20 42 35" fill="url(#owlGradient)" />
        {/* Right ear tuft */}
        <path d="M90 38 Q85 20 78 35" fill="url(#owlGradient)" />

        {/* Left wing */}
        <motion.path
          d="M22 60 Q10 70 18 90 Q22 80 26 75"
          fill="#6366F1"
          opacity="0.7"
          animate={mood === "wave" ? { rotate: [0, -15, 0], originX: "26px", originY: "75px" } : {}}
          transition={{ repeat: Infinity, duration: 0.6 }}
        />
        {/* Right wing */}
        <path d="M98 60 Q110 70 102 90 Q98 80 94 75" fill="#6366F1" opacity="0.7" />

        {/* Feet */}
        <ellipse cx="48" cy="108" rx="8" ry="4" fill="#F59E0B" />
        <ellipse cx="72" cy="108" rx="8" ry="4" fill="#F59E0B" />

        {/* Graduation cap */}
        <rect x="38" y="26" width="44" height="4" rx="1" fill="#1E293B" />
        <polygon points="60,12 38,28 82,28" fill="#1E293B" />
        <line x1="80" y1="28" x2="86" y2="40" stroke="#F59E0B" strokeWidth="2" />
        <circle cx="86" cy="42" r="3" fill="#F59E0B" />

        <defs>
          <linearGradient id="owlGradient" x1="22" y1="30" x2="98" y2="110" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818CF8" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </motion.svg>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add components/tour/OwlMascot.tsx
git commit -m "feat(tour): add animated owl mascot SVG component"
```

---

### Task 3: Define Tour Steps

**Files:**
- Create: `components/tour/tour-steps.ts`

**Step 1: Create the steps configuration**

The sidebar nav links don't have `id` attributes yet, so we'll use `data-tour` attributes for targeting. This is the step definition file — we'll add the `data-tour` attributes to the sidebar in a later task.

```ts
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
```

**Step 2: Commit**

```bash
git add components/tour/tour-steps.ts
git commit -m "feat(tour): define 13 walkthrough steps"
```

---

### Task 4: Create the Tour Provider and Custom Popover

**Files:**
- Create: `components/tour/PlatformTourProvider.tsx`

**Step 1: Create the provider with custom Driver.js popover**

```tsx
"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TOUR_STEPS } from "./tour-steps";

interface TourContextValue {
  startTour: () => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  isActive: false,
});

export const useTour = () => useContext(TourContext);

const STORAGE_KEY = "platform-tour-completed";

export function PlatformTourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null);

  useEffect(() => {
    const d = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 12,
      popoverOffset: 12,
      showButtons: ["next", "previous"],
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Finish!",
      progressText: "{{current}} of {{total}}",
      popoverClass: "aya-tour-popover",
      steps: TOUR_STEPS,
      onDestroyStarted: () => {
        localStorage.setItem(STORAGE_KEY, "true");
        setIsActive(false);
        d.destroy();
      },
    });
    setDriverInstance(d);
    return () => d.destroy();
  }, []);

  const startTour = useCallback(() => {
    if (driverInstance) {
      setIsActive(true);
      driverInstance.drive();
    }
  }, [driverInstance]);

  // Auto-trigger after onboarding (check URL param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "start") {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (completed !== "true") {
        // Small delay to let dashboard render
        const timer = setTimeout(() => startTour(), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [startTour]);

  return (
    <TourContext.Provider value={{ startTour, isActive }}>
      {children}
    </TourContext.Provider>
  );
}
```

**Step 2: Commit**

```bash
git add components/tour/PlatformTourProvider.tsx
git commit -m "feat(tour): add PlatformTourProvider with driver.js integration"
```

---

### Task 5: Create Custom Tour CSS with Owl Mascot

**Files:**
- Create: `components/tour/tour-styles.css`

**Step 1: Create custom CSS for tour popover styling and owl**

Driver.js supports CSS customization. We style the popover to include the owl and match the platform's blue/purple palette.

```css
/* components/tour/tour-styles.css */

/* Override driver.js popover */
.aya-tour-popover {
  background: white !important;
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
  padding: 0 !important;
  max-width: 340px !important;
}

.aya-tour-popover .driver-popover-arrow {
  display: block;
}

/* Title area with owl */
.aya-tour-popover .driver-popover-title {
  font-size: 16px !important;
  font-weight: 700 !important;
  color: #1e293b !important;
  padding: 20px 20px 0 20px !important;
  display: flex;
  align-items: center;
  gap: 8px;
}

.aya-tour-popover .driver-popover-title::before {
  content: "🦉";
  font-size: 24px;
  display: inline-block;
  animation: owlBounce 2s ease-in-out infinite;
}

@keyframes owlBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.aya-tour-popover .driver-popover-description {
  font-size: 14px !important;
  color: #64748b !important;
  line-height: 1.6 !important;
  padding: 8px 20px 16px 20px !important;
}

/* Footer with buttons */
.aya-tour-popover .driver-popover-footer {
  padding: 12px 20px !important;
  border-top: 1px solid #f1f5f9 !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.aya-tour-popover .driver-popover-progress-text {
  font-size: 12px !important;
  color: #94a3b8 !important;
  font-weight: 500 !important;
}

.aya-tour-popover .driver-popover-prev-btn {
  background: #f8fafc !important;
  color: #475569 !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  padding: 6px 14px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  cursor: pointer;
  transition: all 0.15s;
}

.aya-tour-popover .driver-popover-prev-btn:hover {
  background: #f1f5f9 !important;
}

.aya-tour-popover .driver-popover-next-btn,
.aya-tour-popover .driver-popover-close-btn-text {
  background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
  color: white !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 6px 14px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  cursor: pointer;
  transition: all 0.15s;
}

.aya-tour-popover .driver-popover-next-btn:hover,
.aya-tour-popover .driver-popover-close-btn-text:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Overlay */
.driver-overlay {
  background: rgba(15, 23, 42, 0.6) !important;
}
```

**Step 2: Import the CSS in the provider**

Add to the top of `PlatformTourProvider.tsx`, after the driver.js CSS import:

```tsx
import "driver.js/dist/driver.css";
import "./tour-styles.css";
```

**Step 3: Commit**

```bash
git add components/tour/tour-styles.css components/tour/PlatformTourProvider.tsx
git commit -m "feat(tour): add custom tour popover styles with owl emoji mascot"
```

---

### Task 6: Add `data-tour` Attributes to AppSidebar

**Files:**
- Modify: `components/layout/AppSidebar.tsx`

**Step 1: Add a mapping from nav item href to data-tour attribute**

Create a `tourId` map and add `data-tour` to the nav `<nav>` element and each nav link.

The mapping:

```
/dashboard       → nav-dashboard
/command-center  → nav-command-center
/chat            → nav-chat
/ai-chat         → nav-aya
/meetings        → nav-meetings
/inbox           → nav-inbox
/crm             → nav-crm
/vendors         → nav-vendors
/knowledge-base  → nav-kb
/playbooks       → nav-playbooks
/analytics       → nav-analytics
/contacts        → nav-contacts
/messages        → nav-messages
/settings        → nav-settings
```

Add `data-tour` to:
1. The `<nav>` element: `data-tour="sidebar-nav"`
2. Each nav `<Link>` in the expanded view: `data-tour={TOUR_MAP[item.href]}`
3. The Settings link specifically: `data-tour="nav-settings"` on the `/settings` link

**Step 2: Add the Replay Tour button**

Import `Compass` from lucide-react and `useTour` from the tour provider. Add a "Platform Tour" button below the settings section, before the user info section.

In expanded mode:
```tsx
<button
  data-tour="replay-tour"
  onClick={() => startTour()}
  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-gray-700 hover:bg-gray-50 hover:text-gray-900 w-full"
>
  <Compass className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500" />
  <span className="flex-1 text-left">Platform Tour</span>
</button>
```

In collapsed mode:
```tsx
<button
  data-tour="replay-tour"
  onClick={() => startTour()}
  className="flex items-center justify-center rounded-lg p-2.5 transition-all text-gray-700 hover:bg-gray-50 w-full"
  title="Platform Tour"
>
  <Compass className="h-5 w-5 text-gray-400" />
</button>
```

**Step 3: Commit**

```bash
git add components/layout/AppSidebar.tsx
git commit -m "feat(tour): add data-tour attributes and replay button to sidebar"
```

---

### Task 7: Add `data-tour` to AppHeader for Command Palette

**Files:**
- Modify: `components/layout/AppHeader.tsx`

**Step 1: Find the Ctrl+K / search button area and add data-tour attribute**

Add `data-tour="command-palette-hint"` to the search/command palette trigger button in the header.

**Step 2: Commit**

```bash
git add components/layout/AppHeader.tsx
git commit -m "feat(tour): add data-tour attribute to command palette trigger"
```

---

### Task 8: Integrate PlatformTourProvider into App Layout

**Files:**
- Modify: `components/layout/AppLayoutClient.tsx`

**Step 1: Wrap children with PlatformTourProvider**

```tsx
import { PlatformTourProvider } from "@/components/tour/PlatformTourProvider";
```

Wrap the content inside the CommandCenterProvider:

```tsx
<CommandCenterProvider>
  <PlatformTourProvider>
    <div className="flex h-screen ...">
      ...
    </div>
  </PlatformTourProvider>
</CommandCenterProvider>
```

**Step 2: Commit**

```bash
git add components/layout/AppLayoutClient.tsx
git commit -m "feat(tour): integrate PlatformTourProvider into app layout"
```

---

### Task 9: Trigger Tour After Onboarding

**Files:**
- Modify: `app/(app)/onboarding/page.tsx`

**Step 1: Update onboarding completion to trigger tour**

In `handleComplete`, change the router push to include a `tour=start` query param:

```tsx
const handleComplete = () => {
  setPhase("complete");
  localStorage.setItem("platform-tour-completed", "false");
  setTimeout(() => {
    router.push("/dashboard?tour=start");
  }, 1000);
};
```

The `PlatformTourProvider` already watches for `?tour=start` and auto-starts the tour.

**Step 2: Commit**

```bash
git add app/(app)/onboarding/page.tsx
git commit -m "feat(tour): trigger walkthrough after onboarding completes"
```

---

### Task 10: Test and Polish

**Step 1: Manual test checklist**

1. Go to `/onboarding` → complete flow → verify tour auto-starts on dashboard
2. Click through all 13 steps → verify each element highlights correctly
3. Click "Back" → verify it goes to previous step
4. Click skip (X) → verify tour closes and `platform-tour-completed` is set in localStorage
5. Click "Platform Tour" in sidebar → verify tour replays
6. Collapse sidebar → verify the compass icon button works
7. Complete tour → verify last step highlights the replay button
8. Refresh page → verify tour does NOT auto-start again (localStorage flag)

**Step 2: Final commit**

```bash
git add -A
git commit -m "feat(tour): platform walkthrough with owl mascot - complete"
```
