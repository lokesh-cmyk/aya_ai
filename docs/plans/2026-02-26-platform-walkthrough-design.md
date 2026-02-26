# Platform Walkthrough with Owl Mascot

**Date:** 2026-02-26
**Status:** Approved

## Overview

An interactive, step-by-step platform walkthrough guided by a cute owl mascot. Automatically triggers after onboarding completes. Users can replay it anytime via a button in the sidebar.

## Tech Stack

- **Driver.js** — Lightweight (~5KB) tour library for overlay, spotlight, and positioning
- **Framer Motion** — Owl mascot animations (entrance, idle bobbing, wave on exit)
- **Inline SVG/CSS** — Owl character rendered as SVG inside the custom popover
- **localStorage** — Persist tour completion state (`platform-tour-completed`)

## Architecture

```
PlatformTourProvider (context)
├── TourContext (current step, active state, startTour/endTour)
├── OwlMascot (animated SVG in popover)
├── Custom Driver.js Popover (owl + title + description + nav buttons)
└── ReplayTourButton (sidebar, below settings)
```

### Components

1. **`PlatformTourProvider`** — Context wrapping `AppLayoutClient`. Holds tour state and exposes `startTour()` / `endTour()`.

2. **`OwlMascot`** — Inline SVG owl (~60x60px). Animated with Framer Motion:
   - Bounce-in on step change
   - Idle bobbing animation during step
   - Wave animation on final step

3. **`TourPopover`** — Custom popover template for Driver.js containing:
   - Owl mascot (top-left of bubble)
   - Step title (bold)
   - Description text
   - Step counter ("3 of 13")
   - Back / Next buttons
   - Skip tour link

4. **`ReplayTourButton`** — Added to AppSidebar bottom section. Compass icon + "Platform Tour" text.

## Trigger Logic

- **Auto-trigger:** After onboarding flow completes → redirect to dashboard → tour starts
- **Manual replay:** Click "Platform Tour" button in sidebar
- **Completion tracking:** `localStorage.setItem('platform-tour-completed', 'true')`
- **Skip:** Sets completion flag same as finishing

## Tour Steps (13)

| # | Target Element | Title | Description |
|---|----------------|-------|-------------|
| 1 | Sidebar nav container | Your Navigation Hub | All your tools are organized right here. Let me show you around! |
| 2 | Dashboard nav link | Dashboard | Your home base — see tasks, metrics, and recent activity at a glance. |
| 3 | Inbox nav link | Unified Inbox | All messages from Email, WhatsApp, Slack — in one place. No more tab-switching! |
| 4 | AYA AI nav link | Meet AYA | Your AI assistant. Ask questions, get summaries, and automate tasks. |
| 5 | Team Chat nav link | Team Chat | Real-time messaging with your team. |
| 6 | Meetings nav link | Meetings | Schedule, join, and review meeting notes — all synced with your calendar. |
| 7 | CRM nav link | CRM | Manage your contacts, deals, and customer relationships. |
| 8 | Knowledge Base nav link | Knowledge Base | Store and search your team's documents and files. |
| 9 | Vendors nav link | Vendors | Track vendor relationships, risks, and compliance. |
| 10 | Analytics nav link | Analytics | Insights and reports on team and workspace performance. |
| 11 | Header area / Ctrl+K hint | Quick Command | Press Ctrl+K anytime to search anything instantly. |
| 12 | Settings nav link | Settings | Configure your workspace, integrations, and preferences. |
| 13 | Replay tour button | Replay Anytime! | Want to see this tour again? Just click here. Have fun exploring! |

## Sidebar Integration

Add "Platform Tour" button to `AppSidebar.tsx` in the bottom settings section:
- Icon: `Compass` from lucide-react
- Text: "Platform Tour"
- Position: Below "Settings" link, above user info
- onClick: calls `startTour()` from TourContext

## Owl Character Design

CSS/SVG owl with:
- Round body in blue/purple gradient (matches platform palette)
- Large expressive eyes
- Small beak
- Tiny wing tips
- Optional graduation cap for the "wise guide" vibe

## File Structure

```
components/
  tour/
    PlatformTourProvider.tsx   — Context provider + driver.js integration
    TourPopover.tsx            — Custom popover with owl + nav buttons
    OwlMascot.tsx              — Animated SVG owl character
    tour-steps.ts              — Step definitions (target, title, description)
    ReplayTourButton.tsx       — Sidebar button component
```

## Onboarding Integration

In `components/onboarding/OnboardingFlow.tsx`, after the final step completes:
1. Set `platform-tour-completed` to `false` (ensure tour triggers)
2. Redirect to `/dashboard`
3. `PlatformTourProvider` detects first visit + tour not completed → auto-starts

## Decisions

- **Driver.js over custom build** — handles overlay math, scroll, resize, z-index edge cases
- **Owl mascot** — cute character over plain tooltips for personality
- **13 steps** — comprehensive coverage of all platform sections
- **localStorage** — simple persistence, no API needed
- **Auto-trigger post-onboarding** — catches users at the right moment
