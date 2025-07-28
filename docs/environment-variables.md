# Environment Variables for N8N Integration

## Required Environment Variables

Add these to your `.env.local` file or deployment environment:

```bash
# N8N Webhook Configuration
N8N_WEBHOOK_TOKEN=your-secure-webhook-token-here

# AI Configuration (for enhanced processing)
OPENAI_API_KEY=your-openai-api-key
CLAUDE_API_KEY=your-claude-api-key

# Existing variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
CRON_SECRET_TOKEN=your-cron-secret-token
```

## Generate Secure Webhook Token

```bash
# Generate a secure random token
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Vercel Deployment

If deploying to Vercel, add these in your Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable above
4. Redeploy your application

## Local Development

Create `.env.local` file in your project root:

```bash
# Copy from .env.example if it exists
cp .env.example .env.local

# Add the new variables
echo "N8N_WEBHOOK_TOKEN=your-token-here" >> .env.local
echo "OPENAI_API_KEY=your-openai-key" >> .env.local
echo "CLAUDE_API_KEY=your-claude-key" >> .env.local
```

## Security Notes

- **Never commit** `.env.local` to version control
- **Rotate tokens** regularly (every 90 days)
- **Use different tokens** for development and production
- **Monitor API usage** to control costs 