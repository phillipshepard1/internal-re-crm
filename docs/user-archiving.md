# User Archiving System

## Overview

The Internal-Re-CRM system now supports user archiving instead of permanent deletion. This preserves all user data while removing their access to the system.

## Features

### User Status
- **Active**: Users can log in and access the system normally
- **Archived**: Users cannot log in and are immediately signed out if they were already logged in

### Archiving Benefits
- **Data Preservation**: All user-related data (leads, notes, tasks, etc.) remains intact
- **Audit Trail**: Track when and who archived each user
- **Reversible**: Archived users can be restored at any time
- **Security**: Prevents accidental data loss

## Database Changes

### New Fields Added to `users` Table
- `status`: VARCHAR(20) - 'active' or 'archived' (default: 'active')
- `archived_at`: TIMESTAMP - When the user was archived
- `archived_by`: UUID - Who archived the user (references users.id)

### Migration
The migration `20250709121201_add_status_to_users_table.sql` adds these fields and sets all existing users to 'active' status.

## API Changes

### Updated Endpoints

#### GET `/api/admin/users`
- **Query Parameters**:
  - `includeArchived=true` - Include archived users in response
- **Default Behavior**: Only returns active users

#### PATCH `/api/admin/users` (replaces DELETE)
- **Request Body**:
  ```json
  {
    "userId": "user-uuid",
    "action": "archive" | "restore",
    "archivedBy": "admin-user-uuid" // Optional, for archive action
  }
  ```

### Archive Action
- Sets user status to 'archived'
- Records timestamp and admin who performed the action
- Prevents archiving the last admin user

### Restore Action
- Sets user status back to 'active'
- Clears archived_at and archived_by fields

## UI Changes

### Admin Panel Updates
1. **Status Column**: Shows 'Active' or 'Archived' badge
2. **Action Buttons**: 
   - Archive icon (📦) for active users
   - Restore icon (🔄) for archived users
3. **Toggle Switch**: Show/hide archived users
4. **Summary Cards**: 
   - Total Users → Active Users
   - Admin Users → Active Admin Users
   - New: Archived Users count

### Confirmation Modal
- Updated to show "Confirm User Archive" instead of deletion
- Explains that data is preserved and user can be restored

## Usage

### Archiving a User
1. Go to Admin Panel → User Management
2. Find the user in the table
3. Click the archive icon (📦)
4. Confirm in the modal
5. User status changes to 'Archived'

### Restoring a User
1. Toggle "Show archived users" switch
2. Find the archived user
3. Click the restore icon (🔄)
4. User status changes back to 'Active'

### Viewing Archived Users
1. In User Management tab, toggle "Show archived users"
2. Archived users appear with gray badges
3. Only restore action is available for archived users

## Authentication & Access Control

### Login Blocking
- **Immediate Block**: Archived users cannot log in with email/password
- **Clear Error Message**: Shows "Your account has been archived. Please contact an administrator for assistance."
- **Session Termination**: If already logged in, they are immediately signed out
- **OAuth Protection**: Google OAuth users are also blocked from accessing the system

### Session Validation
- **Periodic Checks**: Active sessions are validated every 5 minutes
- **Automatic Sign Out**: Archived users are automatically signed out during validation
- **Role Caching**: User roles are cached but invalidated for archived users

## Security Considerations

### Admin Protection
- Cannot archive the last admin user
- Prevents system lockout scenarios

### Data Integrity
- All foreign key relationships are preserved
- No cascade deletions occur
- Historical data remains accessible

## Testing

Run the test script to verify functionality:
```bash
node scripts/test-user-archiving.js
```

This script will:
1. List all users and their status
2. Test archiving an agent user
3. Test restoring the user
4. Show final status

## Migration Notes

### Existing Users
- All existing users are automatically set to 'active' status
- No data loss occurs during migration

### API Compatibility
- The DELETE endpoint has been replaced with PATCH
- Existing integrations may need updates

## Future Enhancements

Potential improvements:
- Bulk archive/restore operations
- Archive reasons/notes
- Automatic archiving after inactivity
- Archive retention policies
- Export archived user data 