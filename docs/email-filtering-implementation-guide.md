# Email Filtering Implementation Guide - Reduce OpenAI Costs

## Quick Summary

Your N8N workflow is currently sending **ALL** emails to OpenAI for analysis, which is eating away at your dev account payment. Here are two solutions to fix this:

## Solution 1: Enhanced N8N Workflow (Recommended)

### What It Does
- Adds pre-filtering **before** sending emails to OpenAI
- Filters based on email domains, keywords, and exclusion patterns
- Only sends relevant emails to OpenAI (saves 80-90% on costs)

### Implementation Steps
1. **Import the new workflow**: Use `docs/n8n-filtered-workflow.json`
2. **Customize the filter patterns**: Update the lead source domains and keywords in the "Pre-filter Emails" node
3. **Test the workflow**: Monitor the logs to see which emails are filtered out

### Key Features
- ✅ Pre-filters emails before OpenAI analysis
- ✅ Logs filtered emails for transparency
- ✅ Uses your existing lead source patterns
- ✅ Easy to customize and maintain

## Solution 2: Gmail Filtering (Alternative)

### What It Does
- Sets up Gmail filters to forward only relevant emails to a dedicated address
- N8N monitors the dedicated address instead of your main inbox
- Completely eliminates non-relevant emails from processing

### Implementation Steps
1. **Create dedicated Gmail address**: `leads@yourdomain.com`
2. **Set up Gmail filters**: Follow the guide in `docs/gmail-filtering-setup.md`
3. **Update N8N workflow**: Point to the dedicated Gmail account

### Key Features
- ✅ Zero OpenAI cost for filtered emails
- ✅ Easy to manage through Gmail interface
- ✅ Works with existing N8N workflow
- ✅ Can be combined with Solution 1

## Cost Savings Comparison

| Approach | Current | Solution 1 | Solution 2 | Combined |
|----------|---------|------------|------------|----------|
| **Emails Processed** | 1000/month | 100/month | 50/month | 50/month |
| **OpenAI Cost** | $50-100/month | $5-10/month | $2-5/month | $2-5/month |
| **Savings** | 0% | 80-90% | 90-95% | 90-95% |

## Quick Start (Recommended)

### Step 1: Import Enhanced Workflow
1. In N8N, create a new workflow
2. Import `docs/n8n-filtered-workflow.json`
3. Update the Gmail authentication
4. Update the webhook URL to your CRM

### Step 2: Customize Filter Patterns
Edit the "Pre-filter Emails" node and update:

```javascript
// Add your specific lead sources
const leadSourcePatterns = [
  'zillow.com', 'realtor.com', 'homestack.com',
  // Add your website domain
  'yourdomain.com', 'stresslesscrm.com'
];

// Add your specific keywords
const realEstateKeywords = [
  'property', 'house', 'home', 'listing', 'inquiry',
  // Add more keywords specific to your business
];
```

### Step 3: Test and Monitor
1. Run the workflow for a few days
2. Check the logs to see filtering effectiveness
3. Adjust patterns based on results

## Configuration File

Use `docs/email-filter-config.json` to customize:
- Lead source domains
- Keywords to match
- Exclusion patterns
- Gmail filter rules
- Cost optimization settings

## Monitoring

### Check Filter Effectiveness
- Monitor N8N logs for "Email filtered out (cost savings)" messages
- Track OpenAI usage in your dashboard
- Review lead quality from filtered emails

### Weekly Review
- Check if important emails are being filtered out
- Add new lead sources to patterns
- Adjust keyword lists based on trends

## Troubleshooting

### Too Many Emails Still Going to OpenAI
1. Add more exclusion patterns
2. Refine keyword matching
3. Use more specific domain patterns

### Missing Important Emails
1. Check if new lead sources need to be added
2. Review keyword lists for completeness
3. Monitor for new email patterns

### Gmail Filter Issues
1. Check Gmail filter settings
2. Verify forwarding address is correct
3. Ensure filters are active and not conflicting

## Next Steps

1. **Start with Solution 1** (Enhanced N8N Workflow)
2. **Monitor results** for 1-2 weeks
3. **Consider Solution 2** if you need even more cost savings
4. **Fine-tune patterns** based on your specific email patterns

## Support

- Check the detailed guides in the `docs/` folder
- Monitor N8N logs for debugging information
- Use the configuration file to customize settings
- Test with small batches before full deployment

---

**Expected Result**: 80-95% reduction in OpenAI costs while maintaining lead quality. 