# Automated Email-to-Lead Processing System

This document describes the automated email-to-lead processing system that monitors Gmail inboxes and automatically creates leads in the CRM.

## 🎯 Overview

The system automatically:
- Monitors connected Gmail accounts for new emails
- Uses AI-powered lead detection to identify potential leads
- Extracts contact information and property details
- Creates leads in the CRM staging area
- Provides monitoring and control through the admin dashboard

## 🏗️ Architecture

### Components

1. **Lead Detection Service** (`src/lib/leadDetection.ts`)
   - AI-powered email analysis
   - Pattern matching against lead sources
   - Data extraction from email content

2. **Gmail Integration** (`src/lib/gmailIntegration.ts`)
   - OAuth2 authentication
   - Email fetching and processing
   - Token management

3. **Automated Processing** (`src/app/api/cron/email-processing/route.ts`)
   - Cron job endpoint
   - Batch email processing
   - Error handling and logging

4. **Admin Dashboard** (`src/components/admin/EmailProcessingDashboard.tsx`)
   - Processing statistics
   - Gmail integration status
   - Manual processing triggers

## 🚀 Setup

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Gmail API Configuration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret

# Cron Job Security
CRON_SECRET_TOKEN=your_secret_token

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Gmail API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/gmail/setup` (development)
   - `https://your-domain.com/api/gmail/setup` (production)

### 3. Deploy Cron Jobs

#### Option A: Vercel Cron Jobs (Recommended)

The `vercel.json` file is already configured. Deploy to Vercel and cron jobs will be automatically set up.

#### Option B: Traditional Cron Jobs

Add to your server's crontab:

```bash
# Check for new emails every 15 minutes
*/15 * * * * curl -X POST https://your-app.vercel.app/api/cron/email-processing \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json"
```

#### Option C: GitHub Actions

Create `.github/workflows/email-processing.yml`:

```yaml
name: Email Processing
on:
  schedule:
    - cron: "*/15 * * * *"
jobs:
  process-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Process Emails
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/email-processing \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}" \
            -H "Content-Type: application/json"
```

## 📧 Lead Sources Configuration

### Default Lead Sources

The system comes with pre-configured lead sources:

- **Zillow**: `noreply@zillow.com`, `leads@zillow.com`
- **Realtor.com**: `noreply@realtor.com`, `leads@realtor.com`
- **HomeStack**: `noreply@homestack.com`, `leads@homestack.com`
- **Website Form**: Generic contact form patterns
- **Referral**: Referral-based leads

### Adding Custom Lead Sources

1. Go to Admin Panel → Lead Sources
2. Click "Add Lead Source"
3. Configure:
   - **Name**: Display name for the lead source
   - **Email Patterns**: Email addresses to match (e.g., `form@yourdomain.com`)
   - **Domain Patterns**: Domain patterns (e.g., `yourdomain.com`)
   - **Keywords**: Keywords in subject or body
   - **Status**: Active/Inactive

### Lead Detection Rules

You can create custom detection rules with:
- Subject keywords
- Body keywords
- Sender patterns
- Domain patterns
- Confidence thresholds

## 🔍 Data Extraction

The system extracts the following information from emails:

### Contact Information
- **Name**: First and last name
- **Email**: Email addresses
- **Phone**: Phone numbers
- **Company**: Company name
- **Position**: Job title

### Property Information
- **Property Address**: Street addresses
- **Property Details**: Bedrooms, bathrooms, square footage
- **Price Range**: Budget and price preferences
- **Location Preferences**: Preferred areas and neighborhoods
- **Property Type**: Single-family, condo, townhouse, etc.
- **Timeline**: Buying timeline and urgency

### Message Content
- **Full Message**: Complete email body
- **Notes**: Extracted information summary

## 📊 Monitoring

### Admin Dashboard

Access the email processing dashboard at `/admin` → "Email Processing" tab:

- **Statistics**: Total leads processed, success rate, active integrations
- **Gmail Integrations**: Status of connected accounts
- **Processing Results**: Last run results and details
- **Manual Processing**: Trigger processing on demand

### Logs and Debugging

1. **Vercel Function Logs**: Check Vercel dashboard for function logs
2. **Database Activities**: Monitor the `activities` table for processing events
3. **Gmail Token Status**: Check `user_gmail_tokens` table for integration health

### Key Metrics

- **Total Leads Processed**: All-time count of processed leads
- **Success Rate**: Percentage of successful processing
- **Active Integrations**: Number of connected Gmail accounts
- **Last Run**: Timestamp of last automated processing

## 🔧 Troubleshooting

### Common Issues

#### 1. "Failed to Import Lead" Error

**Causes:**
- Missing required fields (name, email)
- Database constraint violations
- Gmail authentication issues
- Low confidence detection

**Solutions:**
- Check email content for required information
- Verify database schema and constraints
- Refresh Gmail tokens
- Adjust lead detection confidence threshold

#### 2. Gmail Authentication Errors

**Causes:**
- Expired access tokens
- Invalid refresh tokens
- Missing OAuth permissions

**Solutions:**
- Reconnect Gmail in the inbox page
- Check OAuth configuration
- Verify API credentials

#### 3. No Emails Being Processed

**Causes:**
- No active Gmail integrations
- Cron job not running
- Email filtering issues

**Solutions:**
- Connect Gmail accounts in inbox
- Verify cron job configuration
- Check email filters and labels

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG_EMAIL_PROCESSING=true
```

This will log detailed information about:
- Email analysis results
- Lead detection confidence scores
- Data extraction details
- Processing errors

## 🔒 Security

### Authentication

- **Cron Jobs**: Protected with `CRON_SECRET_TOKEN`
- **Gmail API**: OAuth2 authentication
- **Admin Access**: Role-based permissions

### Data Privacy

- Emails are processed securely
- No email content is stored permanently
- Only extracted lead data is saved
- Gmail tokens are encrypted

## 📈 Performance

### Optimization

- **Batch Processing**: Multiple emails processed together
- **Caching**: Lead source patterns cached
- **Rate Limiting**: Respects Gmail API limits
- **Error Handling**: Graceful failure recovery

### Scaling

- **Multiple Integrations**: Supports multiple Gmail accounts
- **Parallel Processing**: Concurrent email processing
- **Queue Management**: Handles processing backlogs

## 🚀 Advanced Features

### Custom Data Extraction

Extend the system by adding custom extraction patterns in `src/lib/leadDetection.ts`:

```typescript
private static extractCustomField(text: string): string {
  // Add your custom extraction logic
  const pattern = /your-pattern/g
  const match = text.match(pattern)
  return match ? match[0] : ''
}
```

### Webhook Integration

Set up webhooks for real-time notifications:

```typescript
// Add to lead creation process
await fetch('your-webhook-url', {
  method: 'POST',
  body: JSON.stringify({
    type: 'lead_created',
    lead: newLead,
    source: 'email_processing'
  })
})
```

### Custom Lead Sources

Create specialized lead sources for different industries:

```sql
INSERT INTO lead_sources (name, email_patterns, keywords) VALUES
('Mortgage Leads', ARRAY['mortgage@example.com'], ARRAY['mortgage', 'loan', 'refinance']),
('Rental Leads', ARRAY['rental@example.com'], ARRAY['rental', 'lease', 'apartment']);
```

## 📞 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review Vercel function logs
3. Check database for error details
4. Contact support with specific error messages

## 🔄 Updates

The system is designed to be easily extensible. Future updates may include:

- Enhanced AI detection models
- Additional data extraction fields
- Real-time processing capabilities
- Advanced filtering options
- Integration with more email providers 