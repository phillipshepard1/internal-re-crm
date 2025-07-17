# Gmail Session Handling

This document explains how Google session handling works in the inbox page and the improvements made to handle edge cases where users don't properly disconnect or when sessions expire.

## Overview

The Gmail integration uses OAuth 2.0 with refresh tokens to maintain long-term access to user Gmail accounts. The system now includes robust token validation, automatic refresh, and cleanup mechanisms.

## Architecture

### Token Storage
- **Database Table**: `user_gmail_tokens`
- **Fields**:
  - `access_token` (short-lived, ~1 hour)
  - `refresh_token` (long-lived, doesn't expire unless revoked)
  - `expires_at` (when access token expires)
  - `is_active` (boolean flag for active connections)
  - `gmail_email` (user's Gmail address)

### Session States
1. **Connected**: Valid tokens, ready to use
2. **Checking**: Validating connection status
3. **Expired**: Tokens expired, requires reconnection
4. **Error**: Connection failed or invalid
5. **Disconnected**: No connection established

## Enhanced Features

### 1. Real-time Token Validation
The `/api/gmail/status` endpoint now:
- Validates tokens with Google's API
- Automatically refreshes expired tokens
- Deactivates invalid connections
- Provides detailed status information

```typescript
// Example response
{
  "connected": true,
  "userConnected": true,
  "gmailEmail": "user@gmail.com",
  "tokenRefreshed": false,
  "requiresReconnect": false,
  "message": "Gmail connected: user@gmail.com"
}
```

### 2. Automatic Token Refresh
When access tokens expire:
1. System attempts to refresh using refresh token
2. Updates database with new token
3. Continues operation seamlessly
4. If refresh fails, marks connection as inactive

### 3. Periodic Validation
- Inbox page validates connection every 30 minutes
- Background cleanup script can run via cron job
- Automatic detection of invalid sessions

### 4. Enhanced User Feedback
- Visual status indicators (green/yellow/red dots)
- Detailed status messages
- Toast notifications for important events
- Different UI states for various connection statuses

## API Endpoints

### `/api/gmail/status`
**GET** - Check Gmail connection status
- Validates tokens with Google
- Attempts automatic refresh if needed
- Returns detailed connection information

### `/api/gmail/cleanup-tokens`
**POST** - Clean up invalid tokens
- Processes all active tokens
- Validates each token
- Refreshes or deactivates as needed
- Requires `CLEANUP_API_KEY` for security

## Error Handling

### Token Refresh Failures
When refresh tokens become invalid:
1. Connection is marked as inactive in database
2. User is notified to reconnect
3. UI shows "Reconnect Gmail" button
4. Clear error messages explain the issue

### Common Scenarios
- **User revokes access in Google Account**: Connection deactivated
- **Token too old**: Automatic refresh attempted
- **Password changed**: Refresh fails, connection deactivated
- **Security policy changes**: Connection deactivated

## Background Cleanup

### Manual Cleanup
```bash
node scripts/cleanup-gmail-tokens.js
```

### Automated Cleanup (Cron)
```bash
# Run every 6 hours
0 */6 * * * cd /path/to/your/app && node scripts/cleanup-gmail-tokens.js
```

### Environment Variables
```bash
CLEANUP_API_KEY=your-secret-key-here
NEXTAUTH_URL=https://your-domain.com
```

## User Experience Improvements

### Connection Status Display
- **Green dot**: Connected and working
- **Yellow dot**: Checking connection
- **Orange dot**: Connection expired
- **Red dot**: Connection failed

### Action Buttons
- **Connected**: Load emails, refresh labels, disconnect
- **Expired**: Reconnect, remove connection
- **Checking**: Disabled button with spinner
- **Disconnected**: Connect Gmail

### Notifications
- Success: Connection refreshed automatically
- Warning: Connection expired, please reconnect
- Error: Connection failed, requires manual intervention

## Security Considerations

### Token Security
- Access tokens are short-lived (1 hour)
- Refresh tokens are stored securely in database
- Automatic cleanup prevents stale tokens
- API key protection for cleanup endpoint

### Privacy
- Only necessary Gmail scopes are requested
- User can revoke access at any time
- No email content is stored permanently
- Tokens are user-specific and isolated

## Troubleshooting

### Common Issues

1. **"Connection expired" message**
   - User needs to reconnect Gmail
   - Click "Reconnect Gmail" button

2. **"Connection check failed"**
   - Network or server issue
   - Check server logs for details

3. **Tokens not refreshing**
   - Verify Gmail client credentials
   - Check database connection
   - Review server logs

### Debug Information
- Check browser console for client-side errors
- Review server logs for API errors
- Use cleanup script to validate all tokens
- Monitor database for token status changes

## Future Enhancements

### Planned Features
- Webhook-based token validation
- Real-time connection status updates
- Advanced error recovery mechanisms
- Connection health monitoring dashboard

### Monitoring
- Track token refresh success rates
- Monitor connection stability
- Alert on unusual patterns
- Performance metrics collection 