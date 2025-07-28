# N8N Deployment Guide

## Quick Start Options

### Option 1: N8N Cloud (Recommended for Production)
1. **Sign up** at [n8n.cloud](https://n8n.cloud)
2. **Choose plan**: Start with Professional ($20/month)
3. **Create workspace** and get your instance URL
4. **Configure environment variables** in N8N settings

### Option 2: Self-Hosted (Docker)
```bash
# Create docker-compose.yml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your-secure-password
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=https://your-domain.com
      - GENERIC_TIMEZONE=UTC
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped

volumes:
  n8n_data:
```

### Option 3: Railway/Heroku Deployment
```bash
# Railway deployment
railway login
railway init
railway add n8nio/n8n
railway up
```

## Environment Variables Setup

### Required Variables in N8N
```bash
# CRM Webhook Configuration
CRM_WEBHOOK_URL=https://your-crm-domain.com/api/n8n/process-lead
CRM_WEBHOOK_TOKEN=your-secure-webhook-token

# AI Configuration
OPENAI_API_KEY=your-openai-api-key
CLAUDE_API_KEY=your-claude-api-key

# Gmail OAuth (will be configured per user)
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
```

## Step-by-Step Setup

### 1. Deploy N8N Instance
- Choose deployment option above
- Access N8N interface (usually http://localhost:5678)
- Create admin account

### 2. Configure Credentials
1. **Gmail OAuth2**:
   - Go to Credentials → Add Credential
   - Select "Gmail OAuth2 API"
   - Configure OAuth2 settings
   - Test connection

2. **OpenAI API**:
   - Add "OpenAI API" credential
   - Enter your API key
   - Test connection

3. **HTTP Request** (for CRM webhook):
   - Add "HTTP Request" credential
   - Set authentication type to "Header Auth"
   - Add Authorization header with your webhook token

### 3. Import Workflow
1. Go to Workflows → Import from File
2. Upload `docs/n8n-workflow-example.json`
3. Configure the imported workflow:
   - Update webhook URL to your CRM endpoint
   - Test Gmail connection
   - Verify AI API connection

### 4. Test Workflow
1. **Manual Test**:
   - Send test email to connected Gmail account
   - Check workflow execution in N8N
   - Verify data reaches CRM webhook

2. **Monitor Execution**:
   - Check execution logs
   - Verify AI analysis results
   - Confirm lead creation in CRM

## Security Considerations

### 1. Access Control
- Use strong passwords for N8N admin
- Enable 2FA if available
- Restrict access to authorized users only

### 2. API Security
- Use environment variables for sensitive data
- Rotate API keys regularly
- Monitor API usage and costs

### 3. Data Privacy
- Ensure N8N instance is secure
- Encrypt data in transit
- Follow GDPR compliance if applicable

## Monitoring Setup

### 1. N8N Monitoring
- Enable execution logging
- Set up error notifications
- Monitor workflow performance

### 2. External Monitoring
- Set up health checks for webhook endpoint
- Monitor AI API usage and costs
- Track lead processing success rates

## Troubleshooting

### Common Issues
1. **Gmail OAuth errors**: Check OAuth2 configuration
2. **AI API failures**: Verify API key and quota
3. **Webhook timeouts**: Check CRM endpoint availability
4. **Workflow not triggering**: Verify Gmail trigger configuration

### Debug Steps
1. Check N8N execution logs
2. Verify credential configurations
3. Test individual nodes
4. Check network connectivity 