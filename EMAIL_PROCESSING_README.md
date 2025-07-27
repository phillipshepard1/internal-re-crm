# Automated Email-to-Lead Parsing System

## Overview

This system automatically monitors Gmail inboxes for incoming emails from configured lead sources and converts them into leads in the CRM. The system uses AI-powered detection to identify and extract lead information from emails.

## Features

### 🔍 **Smart Lead Detection**
- **AI-Powered Analysis**: Uses machine learning to identify potential leads from emails
- **Configurable Lead Sources**: Admin can configure email patterns, domains, and keywords
- **Confidence Scoring**: Each detected lead gets a confidence score (0-100%)
- **Duplicate Prevention**: Automatically checks for existing leads to prevent duplicates

### 📧 **Email Processing**
- **Automated Monitoring**: Continuously monitors Gmail inboxes for new emails
- **Batch Processing**: Processes multiple emails efficiently
- **Error Handling**: Robust error handling with detailed logging
- **Processing History**: Tracks all processed emails for analytics

### 🎯 **Lead Extraction**
- **Contact Information**: Extracts name, email, phone numbers
- **Property Details**: Identifies property addresses, types, and preferences
- **Price Information**: Extracts price ranges and budget information
- **Timeline Data**: Identifies urgency and timeline preferences
- **Company Information**: Extracts company names and positions

### 📊 **Admin Dashboard**
- **Real-time Statistics**: Shows processing performance and success rates
- **Lead Source Analytics**: Performance metrics by lead source
- **Recent Activity**: Latest email processing results
- **Manual Trigger**: Ability to manually trigger email processing

## System Architecture

### Core Components

1. **Gmail Integration** (`src/lib/gmailIntegration.ts`)
   - Handles Gmail API authentication and email fetching
   - Processes emails in batches
   - Tracks processed emails to prevent duplicates

2. **Lead Detection Service** (`src/lib/leadDetection.ts`)
   - AI-powered email analysis
   - Extracts lead information using pattern matching
   - Calculates confidence scores

3. **Email Processing** (`src/lib/emailProcessing.ts`)
   - Main processing logic
   - Creates lead records in the database
   - Handles validation and error cases

4. **Admin Dashboard** (`src/components/admin/EmailProcessingDashboard.tsx`)
   - Real-time monitoring interface
   - Statistics and analytics
   - Manual processing controls

### Database Tables

1. **`lead_sources`** - Configured lead sources and detection rules
2. **`processed_emails`** - Tracks all processed emails
3. **`people`** - Lead records created from emails
4. **`activities`** - Audit trail of lead creation

## Configuration

### Setting Up Lead Sources

1. **Access Admin Panel**: Go to Admin → Lead Sources
2. **Add New Source**: Click "Add Lead Source"
3. **Configure Patterns**:
   - **Email Patterns**: Specific email addresses (e.g., `noreply@zillow.com`)
   - **Domain Patterns**: Domain patterns (e.g., `*.zillow.com`)
   - **Keywords**: Keywords in subject/body that indicate leads

### Example Lead Source Configuration

```json
{
  "name": "Zillow Leads",
  "description": "Leads from Zillow.com",
  "email_patterns": ["noreply@zillow.com", "leads@zillow.com"],
  "domain_patterns": ["zillow.com"],
  "keywords": ["property inquiry", "home inquiry", "zillow"],
  "is_active": true
}
```

## Usage

### Automated Processing

The system runs automatically via cron job every 15-30 minutes:

```bash
# Cron job configuration
*/15 * * * * curl -X POST https://your-domain.com/api/cron/email-processing \
  -H "Authorization: Bearer YOUR_CRON_SECRET_TOKEN"
```

### Manual Processing

1. **Admin Dashboard**: Go to Admin → Email Processing
2. **Click "Process Emails Now"**: Manually trigger processing
3. **Monitor Results**: View real-time processing statistics

### Manual Email Processing

1. **Inbox Page**: Go to Inbox
2. **Select Email**: Choose an email to process
3. **Click "Process as Lead"**: Convert email to lead manually

## Data Extraction

### Supported Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | First and last name | "John Doe" |
| **Email** | Email addresses | "john@example.com" |
| **Phone** | Phone numbers | "(555) 123-4567" |
| **Company** | Company name | "ABC Corp" |
| **Position** | Job title | "Manager" |
| **Property Address** | Property location | "123 Main St, City, State" |
| **Property Type** | Type of property | "Single family home" |
| **Price Range** | Budget/price info | "$500k - $750k" |
| **Timeline** | Urgency/timeline | "Need to move in 3 months" |

### Extraction Patterns

The system uses advanced pattern matching to extract information:

```javascript
// Price range patterns
/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g

// Property type detection
['single family home', 'condo', 'apartment', 'townhouse']

// Timeline patterns
/(?:buy|purchase|move).*?(?:in|within|by).*?(?:month|year|week)/gi
```

## Error Handling

### Common Issues

1. **"Failed to import Lead"**
   - **Cause**: Insufficient information in email
   - **Solution**: Check email content and lead source configuration

2. **Duplicate Leads**
   - **Cause**: Email already processed
   - **Solution**: System automatically prevents duplicates

3. **Low Confidence Scores**
   - **Cause**: Email doesn't match lead source patterns
   - **Solution**: Adjust lead source configuration

### Debugging

1. **Check Logs**: Monitor console logs for processing details
2. **Review Configuration**: Verify lead source settings
3. **Test Email**: Use manual processing to test specific emails

## Monitoring & Analytics

### Key Metrics

- **Total Processed**: Number of emails processed
- **Leads Created**: Successful lead conversions
- **Success Rate**: Percentage of successful conversions
- **Lead Source Performance**: Success rates by source

### Dashboard Features

- **Real-time Updates**: Live statistics and activity feed
- **Performance Trends**: 24-hour processing statistics
- **Error Tracking**: Failed processing attempts
- **Lead Source Analytics**: Performance by source

## Security

### Authentication

- **Gmail OAuth**: Secure Gmail API access
- **Admin Access**: Role-based access control
- **API Protection**: Cron job authentication

### Data Protection

- **Encrypted Storage**: All data encrypted at rest
- **Access Logs**: Complete audit trail
- **Privacy Compliance**: GDPR-compliant data handling

## Troubleshooting

### Setup Issues

1. **Gmail Integration Not Working**
   ```bash
   # Check Gmail API credentials
   # Verify OAuth configuration
   # Test Gmail connection
   ```

2. **Migration Errors**
   ```bash
   # Run migration script
   node scripts/run-email-processing-migration.js
   ```

3. **Cron Job Not Running**
   ```bash
   # Verify cron job configuration
   # Check server logs
   # Test manual trigger
   ```

### Performance Issues

1. **Slow Processing**
   - Reduce batch size
   - Optimize database queries
   - Check server resources

2. **High Error Rates**
   - Review lead source configuration
   - Check email format compatibility
   - Monitor system logs

## API Endpoints

### Email Processing

- `POST /api/cron/email-processing` - Automated processing
- `POST /api/leads/process-email` - Manual email processing
- `GET /api/admin/email-processing/stats` - Processing statistics

### Lead Sources

- `GET /api/admin/lead-sources` - List lead sources
- `POST /api/admin/lead-sources` - Create lead source
- `PUT /api/admin/lead-sources` - Update lead source
- `DELETE /api/admin/lead-sources` - Delete lead source

## Development

### Adding New Lead Sources

1. **Create Migration**: Add new lead source patterns
2. **Update Detection**: Enhance pattern matching
3. **Test Processing**: Verify extraction accuracy
4. **Monitor Performance**: Track success rates

### Customizing Extraction

1. **Pattern Matching**: Add new regex patterns
2. **Field Extraction**: Extend extraction logic
3. **Confidence Scoring**: Adjust scoring algorithms
4. **Validation Rules**: Customize validation logic

## Support

For technical support or questions about the email processing system:

1. **Check Documentation**: Review this README
2. **Monitor Logs**: Check system logs for errors
3. **Test Configuration**: Verify lead source settings
4. **Contact Support**: Reach out to development team

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: Production Ready 