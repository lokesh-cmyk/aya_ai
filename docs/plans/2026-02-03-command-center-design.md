# Command Center - Intelligent Activity Feed

## Overview

An intelligent sidebar that gives founders and project managers instant clarity on what's actually moving, stuck, or needs attention - cutting through the noise of scattered data across CRM, tasks, and communications.

**Problem Statement:**
- Information overload - too much data scattered across screens
- Accountability gaps - hard to know if things actually moved or just got discussed
- Hidden blockers - problems stay buried until they become crises
- Progress ambiguity - "In Progress" tells nothing about actual movement

**Solution:** A "truth feed" that surfaces reality, not vanity metrics.

---

## Placement & Access

### Desktop Experience
- **Collapsed state:** ~45px width, single radar/pulse icon with badge count
- **Expanded state:** ~320px width, hover to expand (like macOS dock)
- **Behavior:** Slides over content, doesn't push layout
- **Availability:** Persistent on every page

### Mobile Experience
- **Placement:** Full page accessible from main navigation menu
- **Adaptation:** Touch-optimized, no hover states
- **Actions:** Visible by default, "More" button for secondary actions

### Collapsed State Visual
- Single icon with badge showing total signals needing attention (e.g., "12")
- Green checkmark + "All clear" message when zero items (celebration state)

---

## Permission Model

| Role | Access |
|------|--------|
| ADMIN | Sees all spaces and all signals across the team |
| EDITOR | Sees only signals from spaces they are members of |
| VIEWER | Sees only signals from spaces they are members of |

---

## Signal Types

### 7 Signal Categories

| Signal | Icon | Detection Rule | Severity |
|--------|------|----------------|----------|
| **Shipped** | ✓ | Task status changed to Done/Closed in last 7 days | Info (positive) |
| **Stale** | ⏸ | In Progress + (<20% progress over 14 days OR no updates per priority threshold) | Warning |
| **Blocked** | 🔴 | Task status = "Need Resolving" or explicitly marked blocked | Critical |
| **Overdue** | ⚠️ | Due date < today AND status ≠ Done/Closed | Critical |
| **Bottleneck** | 👤 | User has 3+ tasks where they are the blocker (others waiting on them) | Critical |
| **Comm Gap** | 💬 | Contact thread with last inbound message > 3 days, no outbound response | Warning |
| **Velocity Shift** | 📉 | This week's completed tasks < 50% of last week's average | Info (trend) |

### Staleness Detection Rules

Progress-based: Task has moved less than 20% in 14 days

Priority-based time thresholds (no updates):
- **Urgent:** 4 days
- **Normal:** 8-9 days
- **Low:** 14 days

### Display Priority (Top to Bottom)
1. Blocked & Overdue (critical)
2. Bottleneck people (systemic risk)
3. Stale items (fake progress)
4. Communication gaps (relationship risk)
5. Velocity shifts (trend awareness)
6. Shipped (wins - always visible at bottom)

---

## Filtering & Grouping

- **Space Filter:** Dropdown to focus on single Space, defaults to "All"
- **Smart Grouping:** Signals grouped by Space with collapsible headers
- **Collapse/Expand:** Click Space header to toggle visibility

---

## Card Design

### Compact Card Structure (~60px height)

```
┌─────────────────────────────────────────────────┐
│ 🔴  Task "API Integration" is blocked           │
│     John · Project Alpha · 3 days stuck         │
└─────────────────────────────────────────────────┘
```

**Layout:**
- **Left:** Signal type icon (color-coded by severity)
- **Line 1:** One-line summary (truncated with ellipsis)
- **Line 2:** Assignee · Space name · Time context (muted text)

### Hover State - Actions Revealed

```
┌─────────────────────────────────────────────────┐
│ 🔴  Task "API Integration" is blocked           │
│     John · Project Alpha · 3 days stuck         │
│ [✓ Done] [👤 Assign] [! Prio] [💤 Snooze] [✕]  │
└─────────────────────────────────────────────────┘
```

**Quick Actions:**
- **Done** - Mark task complete instantly
- **Assign** - Reassign (dropdown with team members)
- **Priority** - Change priority (dropdown)

**Triage Actions:**
- **Snooze** - Hide for 1, 3, or 7 days
- **Dismiss** - Remove from feed permanently (with confirmation)

### Click Behavior
- Clicking anywhere on card (not on action buttons) navigates to full detail view

---

## AI Summary on Highlight

When user hovers/focuses on a card for extended time (~1 second), show tooltip:

```
┌─────────────────────────────────────────────────┐
│ 📋 Context                                      │
│ Created 3 weeks ago by Sarah. Assigned to John  │
│ on Jan 10. Moved to "In Progress" Jan 15.       │
│ No updates since.                               │
│                                                 │
│ ⚡ Impact                                       │
│ Blocking 2 tasks: "Mobile App Release" and      │
│ "QA Sign-off". Sprint 4 deadline at risk.       │
└─────────────────────────────────────────────────┘
```

**Content:**
1. **Context recap** - Timeline and history of the item
2. **Impact analysis** - What's at risk, what's being blocked

---

## Data Freshness Strategy

### Hybrid Update Approach

| Signal Type | Update Method | Reason |
|-------------|---------------|--------|
| Shipped | Real-time push | Instant positive feedback |
| Blocked | Real-time push | Critical, needs immediate visibility |
| Overdue | Real-time push | Becomes critical at midnight |
| Stale | Poll (60s) | Not time-sensitive to the minute |
| Bottleneck | Poll (60s) | Aggregated calculation |
| Comm Gap | Poll (60s) | Not time-sensitive |
| Velocity | Poll (60s) | Trend, not urgent |

### Polling Behavior
- Fetch every 60 seconds when sidebar is expanded
- Pause polling when sidebar is collapsed
- Resume immediately on hover/expand
- Auto-refresh if last fetch > 60 seconds when expanding

### Badge Count
- Updates real-time for critical signals
- Subtle pulse animation on new items
- Count excludes "Shipped" signals (wins, not attention items)

### Freshness Indicator
- "Updated 30s ago" timestamp
- Manual refresh button available

---

## Mobile Experience

### Layout

```
┌─────────────────────────────────────────┐
│ ← Command Center              🔄 Filter │
├─────────────────────────────────────────┤
│ [All Spaces ▼]                          │
├─────────────────────────────────────────┤
│ ▼ Project Alpha (4)                     │
│ ┌─────────────────────────────────────┐ │
│ │ 🔴 API Integration blocked          │ │
│ │    John · 3 days     [Done] [More]  │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ▶ Project Beta (2)                      │
└─────────────────────────────────────────┘
```

### Mobile Adaptations
- Actions visible by default (no hover on touch)
- "More" button opens action sheet (Assign, Priority, Snooze, Dismiss)
- Long-press card shows AI summary as bottom sheet
- Pull-to-refresh for manual update
- Tap Space header to collapse/expand

---

## Empty & Celebration States

### Celebration State (Zero Attention Items)

```
┌─────────────────────────────────────────┐
│                                         │
│              ✓                          │
│                                         │
│         All clear                       │
│                                         │
│   No blocked, stale, or overdue items   │
│   Your team is executing well.          │
│                                         │
│   ────────────────────────────────      │
│                                         │
│   Recently shipped (7 days):            │
│   • API Integration ✓                   │
│   • User Dashboard ✓                    │
│   • Bug #234 fix ✓                      │
│                                         │
└─────────────────────────────────────────┘
```

### Empty State (New User/No Data)
- Brief explanation of what signals will appear
- Link to create first task or space

---

## Technical Architecture

### API Endpoints

**Main Signals Endpoint:**
```
GET /api/command-center/signals
  ?spaceId=optional (filter by space)
  &since=timestamp (for incremental polling)

Response:
{
  signals: [
    {
      id: string,
      type: "shipped" | "stale" | "blocked" | "overdue" | "bottleneck" | "comm_gap" | "velocity",
      severity: "critical" | "warning" | "info",
      title: string,
      subtitle: string,
      spaceId: string,
      spaceName: string,
      entityType: "task" | "contact" | "user",
      entityId: string,
      assignee?: { id, name, avatar },
      createdAt: timestamp,
      metadata: { ... signal-specific data }
    }
  ],
  summary: {
    total: number,
    byType: { shipped: 2, blocked: 3, ... },
    bySpace: { "space-id": 4, ... }
  },
  velocityTrend: {
    thisWeek: number,
    lastWeek: number,
    percentChange: number
  }
}
```

**AI Summary Endpoint:**
```
GET /api/command-center/signals/:id/summary

Response:
{
  context: "Created 3 weeks ago by Sarah...",
  impact: "Blocking 2 tasks..."
}
```

### Database Schema Addition

```prisma
model SignalDismissal {
  id          String    @id @default(cuid())
  userId      String
  signalKey   String    // "task:123:blocked" - unique identifier
  type        String    // "dismiss" | "snooze"
  snoozeUntil DateTime?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id])

  @@unique([userId, signalKey])
  @@index([userId])
  @@index([snoozeUntil])
}
```

### Real-time Events

```
Channel: command-center:{teamId}

Events:
  - signal.new     { signal object }  // New blocked, overdue, or shipped
  - signal.resolved { signalId }      // Task completed, unblocked, etc.
```

Leverage existing Stream Chat SDK infrastructure for real-time delivery.

### Component Structure

```
/components/command-center/
  CommandCenterSidebar.tsx    // Main container, hover logic, desktop
  CommandCenterMobile.tsx     // Full page mobile version
  CommandCenterProvider.tsx   // Context for state management
  SignalCard.tsx              // Individual card component
  SignalActions.tsx           // Quick action + triage buttons
  AISummaryTooltip.tsx        // AI context popup (desktop)
  AISummarySheet.tsx          // AI context bottom sheet (mobile)
  SpaceGroup.tsx              // Collapsible space section
  CelebrationState.tsx        // All-clear view
  EmptyState.tsx              // New user onboarding
  SignalBadge.tsx             // Collapsed state badge
```

---

## Success Metrics

- **Reduced time to identify blockers** - Blockers surfaced same-day vs discovered in standups
- **Decreased stale task count** - Fewer tasks sitting "in progress" without movement
- **Improved response times** - Communication gaps addressed faster
- **Founder confidence** - Qualitative feedback on clarity and control

---

## Out of Scope (Future Considerations)

- Suggested actions ("Consider reassigning to someone with capacity")
- Related activity from team chat
- Custom signal type creation
- Slack/email notifications for critical signals
- Historical trends dashboard
- Team comparison analytics
