# Vendor Tracker Design

## Overview

A standalone Vendor Tracker module for AYA AI that enables teams to onboard and manage vendors, track SLAs, handle change requests with AI-powered impact analysis, monitor risks via a probability/impact heatmap, and leverage pre-built playbooks for mitigation strategies.

## Architecture Decision

**Approach: Standalone Module** -- Vendors have distinct lifecycle concerns (contracts, SLAs, renewals) that don't fit the CRM task model. The Vendor Tracker follows the same pattern as Command Center, Meetings, and Analytics: a top-level module with focused purpose, its own Prisma models, API routes, and UI pages.

## Data Model

### Vendor

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | Vendor/company name |
| category | String | Vendor category (e.g., "SaaS", "Consulting", "Infrastructure") |
| status | VendorStatus | ONBOARDING, ACTIVE, INACTIVE, OFFBOARDING |
| website | String? | Vendor website URL |
| description | String? | Notes about the vendor |
| contractStart | DateTime? | Contract start date |
| contractEnd | DateTime? | Contract end date |
| renewalDate | DateTime? | Next renewal date |
| renewalType | RenewalType | AUTO or MANUAL |
| billingCycle | BillingCycle | MONTHLY, QUARTERLY, ANNUAL |
| contractValue | Decimal? | Contract value |
| tags | String[] | Categorization tags |
| customFields | Json? | Extensible custom data |
| teamId | String | FK to Team |
| createdById | String | FK to User who added the vendor |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Relations:** has many VendorContact, SLA, ChangeRequest, Risk

### VendorContact

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | Contact person name |
| email | String? | Email address |
| phone | String? | Phone number |
| role | String? | Role/title at vendor company |
| isPrimary | Boolean | Primary point of contact |
| vendorId | String | FK to Vendor |
| createdAt | DateTime | |

### SLA (Service Level Agreement)

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | SLA name (e.g., "Uptime SLA") |
| description | String? | What this SLA covers |
| metric | String | What's measured (e.g., "uptime_percent", "response_time_hours") |
| target | String | Target value (e.g., "99.9%", "< 4 hours") |
| currentValue | String? | Latest measured value |
| status | SLAStatus | MET, AT_RISK, BREACHED |
| lastMeasuredAt | DateTime? | When last evaluated |
| vendorId | String | FK to Vendor |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### ChangeRequest

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| title | String | Short title |
| description | String? | Detailed description |
| requestedBy | String? | Vendor contact name who requested |
| status | ChangeRequestStatus | DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, IMPLEMENTED |
| priority | ChangeRequestPriority | LOW, NORMAL, HIGH, URGENT |
| originalPlan | Json? | What was originally agreed |
| requestedChange | Json? | What vendor wants to change |
| impactAnalysis | Json? | AI-prefilled: { cost, timeline, scope, risk } |
| approvedById | String? | FK to User (ADMIN) |
| approvedAt | DateTime? | When approved/rejected |
| rejectedReason | String? | Why rejected |
| sourceMessageId | String? | FK to Message (if AI-extracted from inbox) |
| vendorId | String | FK to Vendor |
| createdById | String | FK to User |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Risk

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| title | String | Risk title |
| description | String? | Risk description |
| probability | Int | 1-5 scale |
| impact | Int | 1-5 scale |
| riskScore | Int | probability x impact (computed) |
| category | RiskCategory | SLA_BREACH, CONTRACT, DELIVERY, FINANCIAL, OPERATIONAL, SECURITY |
| status | RiskStatus | OPEN, MITIGATING, RESOLVED, ACCEPTED |
| mitigationPlan | String? | Current mitigation approach |
| aiSuggestions | Json? | AI-generated mitigation suggestions |
| vendorId | String? | FK to Vendor (nullable for standalone project risks) |
| changeRequestId | String? | FK to ChangeRequest (nullable) |
| createdById | String | FK to User |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Playbook

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | Playbook name |
| description | String? | What this playbook covers |
| category | RiskCategory | Matches risk categories |
| triggerCondition | String? | When to use (e.g., "SLA breach > 3 days") |
| steps | Json | Array of action steps |
| isSystemProvided | Boolean | true = AYA pre-built, false = team-created |
| isActive | Boolean | Team can toggle on/off |
| teamId | String | FK to Team |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Enums

```
VendorStatus: ONBOARDING, ACTIVE, INACTIVE, OFFBOARDING
RenewalType: AUTO, MANUAL
BillingCycle: MONTHLY, QUARTERLY, ANNUAL
SLAStatus: MET, AT_RISK, BREACHED
ChangeRequestStatus: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, IMPLEMENTED
ChangeRequestPriority: LOW, NORMAL, HIGH, URGENT
RiskCategory: SLA_BREACH, CONTRACT, DELIVERY, FINANCIAL, OPERATIONAL, SECURITY
RiskStatus: OPEN, MITIGATING, RESOLVED, ACCEPTED
```

## UI Pages & Navigation

### Sidebar
New top-level item "Vendors" with `Building2` icon (lucide-react), positioned after CRM.

### Page Structure

#### 1. `/vendors` -- Vendor Dashboard
- Summary cards: Total Vendors, Active SLAs, Open Change Requests, High Risks
- Quick stats: upcoming renewals (next 30 days), SLA breaches (last 7 days)
- Recent activity feed (latest change requests, SLA updates)

#### 2. `/vendors/list` -- Vendor List
- Table/card view with search, filter by status/category/tags
- Each card: name, status badge, contract end, SLA health indicator, open CRs count
- Bulk actions: export, archive
- "Add Vendor" multi-step onboarding dialog

#### 3. `/vendors/[id]` -- Vendor Detail (Tabbed)
- **Overview**: Vendor info, contract details, key contacts, renewal countdown
- **SLAs**: SLA metrics with status badges, history chart
- **Change Requests**: Vendor-specific CR list, create new
- **Risks**: Vendor-specific risks, linked mitigations
- **Notes**: Internal team notes (reuse existing Note pattern)
- **Activity**: Audit log

#### 4. `/vendors/change-requests` -- Change Request Center
- Kanban: DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED/REJECTED -> IMPLEMENTED
- Cards: title, vendor, priority badge, impact summary
- Detail view: side-by-side plan vs. change comparison
- AI-prefilled impact analysis (editable)
- ADMIN approval/rejection workflow with reason

#### 5. `/vendors/risks` -- Risk Heatmap
- 5x5 grid (probability x impact)
- Risks as colored dots by category
- Click cell to see risks in that zone
- Filter: vendor, category, status
- Side panel: risk details + AI mitigations + applicable playbooks
- Portfolio summary: total by severity, trend over time

#### 6. `/vendors/playbooks` -- Playbook Library
- Grid of playbook cards (system-provided + team-created)
- Toggle active/inactive
- Create custom playbook dialog
- Preview playbook steps

## Key Workflows

### 1. Vendor Onboarding
1. EDITOR clicks "Add Vendor" -> multi-step form (basic info -> contacts -> SLA definitions -> contract dates)
2. System creates Vendor + VendorContacts + SLAs
3. Applicable playbooks auto-suggested based on vendor category
4. Status: ONBOARDING -> ADMIN reviews -> ACTIVE

### 2. Change Request with AI Impact Analysis
1. EDITOR creates ChangeRequest, fills `requestedChange`
2. System auto-populates `originalPlan` from vendor's current SLA/contract
3. Claude AI generates prefilled impact analysis:
   - Cost impact: estimated cost delta
   - Timeline impact: schedule shift in days/weeks
   - Scope impact: features/deliverables affected
   - Risk assessment: new risks introduced
4. EDITOR reviews/edits AI analysis, submits for approval
5. ADMIN notified -> reviews side-by-side comparison
6. ADMIN approves/rejects with reason
7. On approval, new risks auto-created from impact analysis

### 3. AI-Assisted Change Detection from Inbox
1. Message arrives in Unified Inbox from a VendorContact email/phone match
2. Inngest background job triggers Claude to analyze the message
3. Claude determines if message contains a change request, SLA concern, or renewal discussion
4. If change request detected:
   - Auto-creates ChangeRequest in DRAFT status
   - Populates requestedChange with AI-extracted details
   - Pre-fills impactAnalysis
   - Notifies team member: "AYA detected a change request from [Vendor]. Review draft?"
5. Team member reviews, edits, submits for ADMIN approval
6. Safeguards: always DRAFT status, requires human review, confidence threshold

### 4. Risk Assessment + Mitigation
1. Risks created manually OR auto-generated from SLA breaches / CR approvals
2. Risk appears on heatmap by probability x impact
3. Claude AI generates mitigation suggestions using:
   - Risk category and description
   - Vendor history and SLA track record
   - Active playbooks for this risk category
   - Similar past risks and resolutions
4. User selects playbook steps or accepts AI suggestions
5. Status: OPEN -> MITIGATING -> RESOLVED/ACCEPTED

### 5. Renewal & SLA Monitoring (Inngest Background Jobs)
- **Daily**: Check upcoming renewals (30/14/7 days) -> notifications
- **Daily**: Evaluate SLA metrics -> update status (MET/AT_RISK/BREACHED)
- **On SLA breach**: Auto-create Risk, trigger playbooks, notify ADMIN
- **On renewal approaching**: Notify team, surface as Command Center signal

### 6. Command Center Integration
New signal types added to existing Command Center:
- **SLA Breach**: Vendor SLA below target
- **Renewal Due**: Contract renewal within 14 days
- **Change Request Pending**: CR awaiting approval 2+ days
- **High Risk Alert**: New risk with score >= 16

## Authorization

Uses existing role system:
- **ADMIN**: Full access. Can approve/reject change requests, manage playbooks, resolve risks.
- **EDITOR**: Can create vendors, submit change requests, add risks. Cannot approve CRs.
- **VIEWER**: Read-only access to all vendor data, heatmaps, and reports.

## Tech Stack (matches existing patterns)

- **Database**: Prisma models in existing schema
- **API**: Next.js route handlers at `/app/api/vendors/`, `/app/api/change-requests/`, `/app/api/risks/`, `/app/api/playbooks/`
- **UI**: shadcn/ui components + Tailwind CSS
- **State**: React Query for data fetching/caching
- **AI**: Anthropic Claude via existing `@ai-sdk/anthropic` for impact analysis and mitigation suggestions
- **Background**: Inngest for daily SLA/renewal monitoring and AI extraction jobs
- **Notifications**: Existing notification system for alerts

## Pre-Built Playbooks (System-Provided)

AYA ships with these default playbooks that teams can activate:

1. **SLA Breach Response**: Escalation steps when a vendor misses SLA targets
2. **Contract Renewal Prep**: Checklist for evaluating and renegotiating contracts
3. **Vendor Offboarding**: Steps to safely transition away from a vendor
4. **Security Incident Response**: Actions when a vendor has a security issue
5. **Cost Overrun Management**: Steps when vendor costs exceed budget
6. **Delivery Delay Mitigation**: Actions when vendor deliverables are late
7. **Compliance Gap Remediation**: Steps when vendor fails compliance checks
8. **Emergency Vendor Replacement**: Fast-track process for critical vendor failure
