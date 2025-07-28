# N8N + AI Email Processing Integration Plan

## Overview
Replace the current custom Gmail integration with N8N workflows that use AI for intelligent email analysis and lead extraction.

## Benefits
- **Better AI**: Advanced LLM integration with structured prompts
- **Reliability**: N8N's battle-tested Gmail node
- **Flexibility**: Visual workflow builder for complex logic
- **Scalability**: Handle multiple Gmail accounts easily
- **Monitoring**: Built-in workflow monitoring and debugging

## Architecture

### Current Flow
```
Gmail API → Custom Code → Lead Detection → CRM Database
```

### New Flow
```
Gmail → N8N → AI Analysis → CRM Webhook → Database
```

## N8N Workflow Design

### 1. Gmail Trigger Node
- **Trigger**: New email received
- **Filters**: 
  - Skip emails from specific domains (noreply, etc.)
  - Skip emails already processed
  - Only process emails from last 24 hours

### 2. Email Preprocessing Node
- **Extract**: From, Subject, Body, Date, Attachments
- **Clean**: Remove HTML, normalize text
- **Enrich**: Add metadata (email size, has attachments, etc.)

### 3. AI Analysis Node (OpenAI/Claude)
```json
{
  "model": "gpt-4",
  "prompt": "Analyze this real estate email and extract lead information in JSON format:",
  "system_prompt": "You are a real estate lead detection AI. Extract structured data from emails.",
  "output_schema": {
    "is_lead": "boolean",
    "confidence": "number (0-1)",
    "lead_data": {
      "first_name": "string",
      "last_name": "string", 
      "email": "string[]",
      "phone": "string[]",
      "company": "string",
      "position": "string",
      "property_address": "string",
      "property_details": "string",
      "price_range": "string",
      "property_type": "string",
      "timeline": "string",
      "message": "string",
      "lead_source": "string",
      "urgency": "high|medium|low"
    },
    "analysis": {
      "intent": "buying|selling|investing|general_inquiry",
      "property_type": "residential|commercial|land",
      "budget_range": "string",
      "location_preferences": "string[]"
    }
  }
}
```

### 4. Validation Node
- **Check**: Required fields present
- **Validate**: Email format, phone format
- **Score**: Data quality score
- **Filter**: Only process high-quality leads

### 5. CRM Webhook Node
- **Endpoint**: `/api/n8n/process-lead`
- **Method**: POST
- **Payload**: Structured lead data
- **Headers**: Authentication token

## CRM API Endpoint

### New Endpoint: `/api/n8n/process-lead`
```typescript
interface N8NLeadData {
  email_id: string
  from: string
  subject: string
  body: string
  date: string
  ai_analysis: {
    is_lead: boolean
    confidence: number
    lead_data: LeadExtractionResult
    analysis: {
      intent: string
      property_type: string
      budget_range: string
      location_preferences: string[]
    }
  }
  attachments?: Array<{
    filename: string
    mime_type: string
    size: number
    data: string // base64
  }>
}
```

## Implementation Steps

### Phase 1: Setup N8N
1. **Deploy N8N** (self-hosted or cloud)
2. **Configure Gmail OAuth** for all team members
3. **Create base workflow** with Gmail trigger
4. **Test email reception**

### Phase 2: AI Integration
1. **Setup OpenAI/Claude API** connection
2. **Create AI analysis node** with structured prompts
3. **Test AI extraction** with sample emails
4. **Optimize prompts** based on results

### Phase 3: CRM Integration
1. **Create webhook endpoint** in CRM
2. **Implement lead processing** logic
3. **Add authentication** for webhook security
4. **Test end-to-end flow**

### Phase 4: Advanced Features
1. **Add conditional logic** for different email types
2. **Implement retry mechanisms** for failed processing
3. **Add monitoring** and alerting
4. **Create admin dashboard** for workflow management

## Migration Strategy

### 1. Parallel Processing
- Keep existing system running
- Deploy N8N workflows alongside
- Compare results for accuracy
- Gradually shift traffic

### 2. Data Migration
- Export existing Gmail tokens
- Import into N8N
- Update user settings
- Test with small subset

### 3. Rollout
- Start with admin accounts
- Expand to agent accounts
- Monitor performance
- Decommission old system

## Configuration

### Environment Variables
```bash
# N8N Configuration
N8N_BASE_URL=https://your-n8n-instance.com
N8N_WEBHOOK_SECRET=your-secret-key

# AI Configuration  
OPENAI_API_KEY=your-openai-key
CLAUDE_API_KEY=your-claude-key

# CRM Webhook
CRM_WEBHOOK_URL=https://your-crm.com/api/n8n/process-lead
CRM_WEBHOOK_TOKEN=your-crm-token
```

### N8N Workflow Export
- Export workflow as JSON
- Version control in repository
- Easy deployment across environments

## Monitoring & Analytics

### N8N Dashboard
- Workflow execution status
- Success/failure rates
- Processing times
- Error logs

### CRM Dashboard
- Leads processed via N8N
- AI confidence scores
- Processing accuracy
- Performance metrics

## Cost Analysis

### Current Costs
- Gmail API usage
- Custom development time
- Maintenance overhead

### N8N Costs
- N8N hosting (self-hosted or cloud)
- AI API calls (OpenAI/Claude)
- Additional infrastructure

### ROI Benefits
- Better lead quality
- Reduced false positives
- Faster processing
- Less maintenance

## Security Considerations

### Authentication
- Webhook signature verification
- API key rotation
- Rate limiting

### Data Privacy
- Email content encryption
- PII handling compliance
- Audit logging

### Access Control
- N8N user management
- Workflow permissions
- API access controls 