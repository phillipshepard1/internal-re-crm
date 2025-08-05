# Gmail Filtering Setup Guide - Reduce OpenAI Costs

## Overview
This guide shows you how to set up Gmail filters to automatically forward only relevant real estate emails to a dedicated Gmail address, which N8N will monitor. This approach can significantly reduce your OpenAI API costs by filtering emails before they reach the AI analysis.

## Benefits
- **Cost Savings**: Only relevant emails are sent to OpenAI
- **Better Accuracy**: Pre-filtered emails are more likely to be leads
- **Easy Management**: Gmail filters are easy to modify and maintain
- **No Code Changes**: Works with your existing N8N workflow

## Setup Steps

### Step 1: Create a Dedicated Gmail Address
1. Create a new Gmail account specifically for lead processing (e.g., `leads@yourdomain.com` or `n8n-leads@gmail.com`)
2. This will be the address that receives only filtered emails

### Step 2: Set Up Gmail Filters

#### Filter 1: Known Lead Sources
**Filter Name**: "Real Estate Lead Sources"

**Criteria**:
- **From**: `*@zillow.com OR *@realtor.com OR *@homestack.com OR *@redfin.com OR *@trulia.com`
- **OR**
- **From**: `*@realtor.ca OR *@remax.ca OR *@century21.ca OR *@royallepage.ca OR *@sothebysrealty.ca`

**Actions**:
- ✅ Forward to: `leads@yourdomain.com`
- ✅ Skip the inbox
- ✅ Apply the label: "Lead Sources"

#### Filter 2: Website Contact Forms
**Filter Name**: "Website Contact Forms"

**Criteria**:
- **From**: `*@yourdomain.com OR *@stresslesscrm.com`
- **Subject**: `contact OR inquiry OR form OR lead`

**Actions**:
- ✅ Forward to: `leads@yourdomain.com`
- ✅ Skip the inbox
- ✅ Apply the label: "Website Leads"

#### Filter 3: Real Estate Keywords
**Filter Name**: "Real Estate Keywords"

**Criteria**:
- **Subject**: `property OR house OR home OR listing OR inquiry OR interest OR buy OR sell OR invest`
- **OR**
- **Has the words**: `property inquiry OR house viewing OR home interest OR real estate OR agent help`

**Actions**:
- ✅ Forward to: `leads@yourdomain.com`
- ✅ Skip the inbox
- ✅ Apply the label: "Keyword Matches"

#### Filter 4: Exclude Non-Leads
**Filter Name**: "Exclude Non-Leads"

**Criteria**:
- **From**: `*@noreply.* OR *@no-reply.* OR *@donotreply.* OR *@mailer-daemon.* OR *@postmaster.* OR *@bounce.* OR *@spam.* OR *@newsletter.* OR *@marketing.*`

**Actions**:
- ✅ Never send it to Spam
- ✅ Skip the inbox
- ✅ Delete it

### Step 3: Update N8N Workflow

#### Option A: Use Dedicated Gmail Account
1. In your N8N workflow, update the Gmail Trigger node:
   - **Account**: Use the dedicated `leads@yourdomain.com` account
   - **Authentication**: Set up OAuth2 for the new account

#### Option B: Use Gmail API with Filtering
1. Keep using your main Gmail account
2. Add a filter node before OpenAI analysis:

```javascript
// Gmail Filter Node
const emailData = $input.first().json;

// Check if email has lead-related labels
const labels = emailData.labelIds || [];
const hasLeadLabel = labels.some(label => 
  label.includes('Lead') || 
  label.includes('Real Estate') ||
  label.includes('Inquiry')
);

// Check email domain
const fromEmail = emailData.from?.text || emailData.from || '';
const emailDomain = fromEmail.split('@')[1]?.toLowerCase() || '';

const leadDomains = [
  'zillow.com', 'realtor.com', 'homestack.com', 'redfin.com', 'trulia.com',
  'realtor.ca', 'remax.ca', 'century21.ca', 'royallepage.ca', 'sothebysrealty.ca',
  'yourdomain.com', 'stresslesscrm.com'
];

const isFromLeadDomain = leadDomains.some(domain => 
  emailDomain.includes(domain)
);

// Check for real estate keywords
const subject = (emailData.subject || '').toLowerCase();
const body = (emailData.text || emailData.snippet || '').toLowerCase();

const realEstateKeywords = [
  'property', 'house', 'home', 'listing', 'inquiry', 'interest',
  'buy', 'buying', 'sell', 'selling', 'invest', 'investment',
  'real estate', 'realtor', 'agent', 'viewing', 'schedule'
];

const hasKeywords = realEstateKeywords.some(keyword =>
  subject.includes(keyword) || body.includes(keyword)
);

const shouldProcess = hasLeadLabel || isFromLeadDomain || hasKeywords;

return [{ json: { ...emailData, should_process: shouldProcess } }];
```

### Step 4: Test Your Filters

1. **Send Test Emails**:
   - Send an email from `test@zillow.com` with subject "Property Inquiry"
   - Send an email from `noreply@newsletter.com` with subject "Weekly Newsletter"
   - Check that only the first email reaches your dedicated address

2. **Monitor N8N Logs**:
   - Check that only relevant emails are processed by OpenAI
   - Verify cost savings in your OpenAI dashboard

### Step 5: Fine-tune Filters

Based on your results, adjust the filters:

#### Add More Lead Sources
```
*@opendoor.com OR *@offerpad.com OR *@knock.com OR *@ibuyer.com
```

#### Add More Keywords
```
Subject: "viewing OR showing OR appointment OR consultation OR estimate OR quote"
```

#### Exclude More Non-Leads
```
From: "*@social.* OR *@notification.* OR *@alert.* OR *@update.*"
```

## Cost Savings Estimation

### Before Filtering
- **Total Emails**: 1000/month
- **OpenAI Cost**: $50-100/month (depending on email length)

### After Filtering
- **Filtered Emails**: 50-100/month (5-10% of total)
- **OpenAI Cost**: $5-10/month
- **Savings**: 80-90% reduction in costs

## Monitoring and Maintenance

### Weekly Tasks
1. Check Gmail filter effectiveness
2. Review emails that were incorrectly filtered
3. Adjust filter criteria as needed

### Monthly Tasks
1. Review OpenAI usage and costs
2. Add new lead sources to filters
3. Update keyword lists based on trends

### Quarterly Tasks
1. Analyze lead quality from filtered emails
2. Optimize filter criteria for better accuracy
3. Review and update excluded domains

## Troubleshooting

### Emails Not Being Forwarded
1. Check Gmail filter settings
2. Verify forwarding address is correct
3. Ensure filters are active and not conflicting

### Too Many False Positives
1. Add more exclusion filters
2. Refine keyword matching
3. Use more specific domain patterns

### Missing Important Emails
1. Check if new lead sources need to be added
2. Review keyword lists for completeness
3. Monitor for new email patterns

## Advanced Filtering Options

### Use Gmail Search Operators
```
from:(zillow.com OR realtor.com) subject:(property OR house OR home)
```

### Filter by Email Size
```
larger:10M  // Only process emails larger than 10MB (likely have attachments)
```

### Filter by Date
```
newer_than:7d  // Only process emails from last 7 days
```

## Integration with Existing System

This filtering approach works seamlessly with your existing:
- N8N workflow
- Lead source management system
- CRM processing logic
- AI analysis pipeline

The only change needed is updating the Gmail account in your N8N trigger or adding the filter node before OpenAI analysis. 