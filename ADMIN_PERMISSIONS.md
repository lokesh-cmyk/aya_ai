# ADMIN Permissions Implementation

This document outlines how ADMIN roles have been granted full access across the CRM and entire organization.

## Overview

**ADMIN users** (users with `role: 'ADMIN'` in the User model) now have **full access** to:
- ✅ Create, update, delete any resource in CRM
- ✅ Assign, reassign, and remove members from spaces
- ✅ Manage all spaces, folders, task lists, and tasks
- ✅ Perform any action regardless of space membership
- ✅ Access all organization resources

## Implementation Details

### 1. Permission Utility (`lib/permissions.ts`)

Created utility functions to check permissions:

- `isTeamAdmin(userId)` - Checks if user is a team ADMIN
- `isTeamAdminForResource(userId, teamId)` - Checks if user is ADMIN of a specific team
- `canAccessSpace(userId, spaceId, requiredRole?)` - Checks space access, returns `{ allowed: boolean, isTeamAdmin: boolean }`

**Key Feature**: Team admins automatically have full access to all spaces in their team, bypassing space membership checks.

### 2. Updated API Routes

All CRM API routes now check for team ADMIN status first:

#### Spaces (`app/api/crm/spaces/`)
- ✅ **POST** - Create space: ADMIN can create (already allowed)
- ✅ **PATCH** - Update space: ADMIN has full access
- ✅ **DELETE** - Delete space: ADMIN can delete any space in their team

#### Tasks (`app/api/crm/tasks/`)
- ✅ **POST** - Create task: ADMIN can create in any space
- ✅ **PATCH** - Update task: ADMIN can update any task
- ✅ **DELETE** - Delete task: ADMIN can delete any task

#### Folders (`app/api/crm/folders/`)
- ✅ **POST** - Create folder: ADMIN can create in any space

#### Task Lists (`app/api/crm/task-lists/`)
- ✅ **POST** - Create task list: ADMIN can create in any space

#### Space Members (`app/api/crm/spaces/[id]/members/`)
- ✅ **POST** - Add member: ADMIN can add members to any space
- ✅ **DELETE** - Remove member: ADMIN can remove members from any space (NEW)

### 3. Permission Logic Flow

For all CRM operations:

1. **First Check**: Is the user a team ADMIN?
   - If YES → Allow all operations (bypass space membership)
   - If NO → Continue to space membership check

2. **Second Check**: Does the user have appropriate space membership?
   - Check space member role (ADMIN, EDITOR, VIEWER)
   - Enforce role-based permissions

### 4. Frontend Support

Created `lib/hooks/useUserRole.ts` hook to:
- Get current user's role
- Check if user is ADMIN
- Use in components to show/hide admin-only actions

**Note**: Frontend components will automatically work correctly because:
- Backend API routes now allow ADMIN to perform all actions
- If an action is attempted, the backend will allow it for ADMIN users
- UI can optionally use `useUserRole()` hook to show/hide buttons for better UX

## Examples

### Example 1: Admin Creating a Task
```typescript
// User is team ADMIN
// Space: "Project Alpha" (user is NOT a space member)
// Result: ✅ ALLOWED - Admin can create tasks in any space
```

### Example 2: Admin Deleting a Space
```typescript
// User is team ADMIN
// Space: "Project Beta" (user is NOT a space admin)
// Result: ✅ ALLOWED - Admin can delete any space in their team
```

### Example 3: Admin Removing Space Member
```typescript
// User is team ADMIN
// Space: "Project Gamma"
// Action: Remove member from space
// Result: ✅ ALLOWED - Admin can remove any member
```

### Example 4: Non-Admin User
```typescript
// User is EDITOR (not ADMIN)
// Space: "Project Delta" (user is NOT a space member)
// Result: ❌ DENIED - Must be space member or team admin
```

## API Route Examples

### Before (Restricted)
```typescript
// Only space members could perform actions
const spaceMember = await prisma.spaceMember.findUnique({...});
if (!spaceMember || spaceMember.role === 'VIEWER') {
  return NextResponse.json({ error: 'No permission' }, { status: 403 });
}
```

### After (Admin Full Access)
```typescript
// Check if team admin first
const { allowed, isTeamAdmin } = await canAccessSpace(userId, spaceId, 'EDITOR');
if (!allowed) {
  return NextResponse.json({ error: 'No permission' }, { status: 403 });
}
// Admin automatically has access, others need space membership
```

## Testing Checklist

- [x] ADMIN can create spaces
- [x] ADMIN can update any space
- [x] ADMIN can delete any space in their team
- [x] ADMIN can create tasks in any space
- [x] ADMIN can update any task
- [x] ADMIN can delete any task
- [x] ADMIN can create folders in any space
- [x] ADMIN can create task lists in any space
- [x] ADMIN can add members to any space
- [x] ADMIN can remove members from any space
- [x] Non-ADMIN users still follow space membership rules

## Security Notes

1. **Team Boundary**: ADMIN access is limited to resources within their team
2. **No Cross-Team Access**: ADMIN from Team A cannot access Team B resources
3. **Space Membership Still Works**: Non-admin users continue to use space membership
4. **Role Hierarchy Preserved**: VIEWER < EDITOR < ADMIN (for space members)

## Future Enhancements

1. Add frontend UI indicators for admin-only actions
2. Add audit logging for admin actions
3. Add admin dashboard for organization-wide management
4. Add bulk operations for admins
