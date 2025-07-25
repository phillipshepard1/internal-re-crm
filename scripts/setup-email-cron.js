#!/usr/bin/env node

/**
 * Email Processing Cron Job Setup Script for Digital Ocean Server
 * 
 * This script helps you set up automated email processing using cron jobs
 * on a Digital Ocean server with PM2 deployment.
 */

const fs = require('fs')
const path = require('path')

console.log('📧 Email Processing Cron Job Setup - Digital Ocean Server')
console.log('==========================================================\n')

// Check if environment variables are set
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'CRON_SECRET_TOKEN'
]

console.log('🔍 Checking environment variables...')
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:')
  missingVars.forEach(varName => console.log(`   - ${varName}`))
  console.log('\nPlease set these variables in your .env file on the server')
  process.exit(1)
}

console.log('✅ All required environment variables are set\n')

// Generate CRON_SECRET_TOKEN if not set
if (!process.env.CRON_SECRET_TOKEN) {
  const crypto = require('crypto')
  const token = crypto.randomBytes(32).toString('hex')
  console.log('🔑 Generated CRON_SECRET_TOKEN:')
  console.log(`   ${token}`)
  console.log('\nAdd this to your .env file on the server:\n')
  console.log(`CRON_SECRET_TOKEN=${token}\n`)
}

// Create cron job examples
const cronExamples = [
  {
    name: 'Every 15 minutes',
    schedule: '*/15 * * * *',
    description: 'Check for new emails every 15 minutes'
  },
  {
    name: 'Every 30 minutes',
    schedule: '*/30 * * * *',
    description: 'Check for new emails every 30 minutes'
  },
  {
    name: 'Every hour',
    schedule: '0 * * * *',
    description: 'Check for new emails every hour'
  },
  {
    name: 'Every 2 hours',
    schedule: '0 */2 * * *',
    description: 'Check for new emails every 2 hours'
  }
]

console.log('⏰ Cron Job Examples:')
console.log('====================\n')

cronExamples.forEach(example => {
  console.log(`${example.name}:`)
  console.log(`   Schedule: ${example.schedule}`)
  console.log(`   Description: ${example.description}`)
  console.log('')
})

// Create curl command examples
console.log('🔧 Manual Testing Commands:')
console.log('===========================\n')

const serverUrl = process.env.SERVER_URL || 'https://your-domain.com'
const token = process.env.CRON_SECRET_TOKEN || 'your-secret-token'

console.log('Test the email processing endpoint:')
console.log(`curl -X POST ${serverUrl}/api/cron/email-processing \\`)
console.log(`  -H "Authorization: Bearer ${token}" \\`)
console.log(`  -H "Content-Type: application/json"`)
console.log('')

console.log('Get processing statistics:')
console.log(`curl ${serverUrl}/api/admin/email-processing/stats`)
console.log('')

// Create server deployment instructions
console.log('🚀 Digital Ocean Server Deployment Instructions:')
console.log('================================================\n')

console.log('1. SSH into your Digital Ocean server:')
console.log('   ssh root@your-server-ip')
console.log('')

console.log('2. Navigate to your application directory:')
console.log('   cd /path/to/your/app')
console.log('')

console.log('3. Set up environment variables:')
console.log('   nano .env')
console.log('   # Add all required environment variables')
console.log('')

console.log('4. Install dependencies and build:')
console.log('   npm install')
console.log('   npm run build')
console.log('')

console.log('5. Start the application with PM2:')
console.log('   pm2 start npm --name "crm-app" -- start')
console.log('   pm2 save')
console.log('   pm2 startup')
console.log('')

console.log('6. Set up the cron job:')
console.log('   crontab -e')
console.log('   # Add the following line:')
console.log('   # Check for new emails every 15 minutes')
console.log('   */15 * * * * curl -X POST https://your-domain.com/api/cron/email-processing \\')
console.log('     -H "Authorization: Bearer your-secret-token" \\')
console.log('     -H "Content-Type: application/json" > /dev/null 2>&1')
console.log('')

console.log('7. Verify cron job is set:')
console.log('   crontab -l')
console.log('')

// Create PM2 specific instructions
console.log('📦 PM2 Management Commands:')
console.log('===========================\n')

console.log('Start application:')
console.log('   pm2 start npm --name "crm-app" -- start')
console.log('')

console.log('Stop application:')
console.log('   pm2 stop crm-app')
console.log('')

console.log('Restart application:')
console.log('   pm2 restart crm-app')
console.log('')

console.log('View logs:')
console.log('   pm2 logs crm-app')
console.log('')

console.log('Monitor processes:')
console.log('   pm2 monit')
console.log('')

console.log('Save PM2 configuration:')
console.log('   pm2 save')
console.log('')

console.log('Setup PM2 to start on boot:')
console.log('   pm2 startup')
console.log('')

// Create monitoring instructions
console.log('📊 Server Monitoring:')
console.log('=====================\n')

console.log('1. PM2 Monitoring:')
console.log('   - pm2 monit (real-time monitoring)')
console.log('   - pm2 logs crm-app (application logs)')
console.log('   - pm2 status (process status)')
console.log('')

console.log('2. Cron Job Monitoring:')
console.log('   - Check cron logs: tail -f /var/log/cron')
console.log('   - Verify cron is running: systemctl status cron')
console.log('   - Test cron job manually')
console.log('')

console.log('3. Application Monitoring:')
console.log('   - Check application logs: pm2 logs crm-app')
console.log('   - Monitor API endpoints')
console.log('   - Check database connections')
console.log('')

console.log('4. Server Resources:')
console.log('   - Monitor CPU: htop')
console.log('   - Monitor memory: free -h')
console.log('   - Monitor disk: df -h')
console.log('')

// Create troubleshooting section
console.log('🔧 Troubleshooting:')
console.log('===================\n')

console.log('1. If cron job is not running:')
console.log('   - Check cron service: systemctl status cron')
console.log('   - Restart cron: systemctl restart cron')
console.log('   - Check cron logs: tail -f /var/log/cron')
console.log('')

console.log('2. If application is not responding:')
console.log('   - Check PM2 status: pm2 status')
console.log('   - Restart application: pm2 restart crm-app')
console.log('   - Check logs: pm2 logs crm-app')
console.log('')

console.log('3. If environment variables are missing:')
console.log('   - Check .env file exists and has correct values')
console.log('   - Restart PM2 after changing .env: pm2 restart crm-app')
console.log('')

console.log('4. If Gmail integration fails:')
console.log('   - Check Gmail API credentials')
console.log('   - Verify OAuth redirect URIs')
console.log('   - Check application logs for errors')
console.log('')

// Create security recommendations
console.log('🔒 Security Recommendations:')
console.log('============================\n')

console.log('1. Firewall Configuration:')
console.log('   - Only allow necessary ports (80, 443, 22)')
console.log('   - Use UFW: ufw enable && ufw allow ssh && ufw allow http && ufw allow https')
console.log('')

console.log('2. SSL Certificate:')
console.log('   - Install Let\'s Encrypt: certbot --nginx')
console.log('   - Auto-renewal: crontab -e (add certbot renew)')
console.log('')

console.log('3. Regular Updates:')
console.log('   - Update system: apt update && apt upgrade')
console.log('   - Update Node.js and npm regularly')
console.log('')

console.log('4. Backup Strategy:')
console.log('   - Backup database regularly')
console.log('   - Backup application files')
console.log('   - Test restore procedures')
console.log('')

console.log('✅ Setup complete!')
console.log('\nNext steps:')
console.log('1. Deploy your application to Digital Ocean')
console.log('2. Set up PM2 for process management')
console.log('3. Configure the cron job using crontab')
console.log('4. Connect Gmail accounts in the inbox page')
console.log('5. Monitor processing in the admin dashboard')
console.log('')

console.log('For more information, check the documentation or contact support.') 