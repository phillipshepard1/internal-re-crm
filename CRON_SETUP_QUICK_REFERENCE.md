# Cron Job Setup - Quick Reference

## 🚀 Essential Commands for Digital Ocean Server

### 1. Generate Secret Token
```bash
# Generate a secure token for cron job authentication
openssl rand -hex 32
```

### 2. Create Cron Job Script
```bash
# Create the script file
nano /home/crmuser/cron-email-processing.sh
```

**Script Content:**
```bash
#!/bin/bash

# Load environment variables
source /home/crmuser/crm-app/.env

# Set variables
API_URL="https://your-domain.com/api/cron/email-processing"
SECRET_TOKEN="$CRON_SECRET_TOKEN"

# Make API call
curl -X POST "$API_URL" \
  -H "Authorization: Bearer $SECRET_TOKEN" \
  -H "Content-Type: application/json" \
  --max-time 300 \
  --silent \
  --output /dev/null \
  --write-out "HTTP Status: %{http_code}\n"

# Log the execution
echo "$(date): Email processing cron job executed" >> /home/crmuser/cron-email-processing.log
```

### 3. Make Script Executable
```bash
chmod +x /home/crmuser/cron-email-processing.sh
```

### 4. Test Script Manually
```bash
./cron-email-processing.sh
```

### 5. Setup Cron Job
```bash
# Edit crontab
crontab -e

# Add this line (runs every 15 minutes)
*/15 * * * * /home/crmuser/cron-email-processing.sh
```

### 6. Verify Cron Job
```bash
# List all cron jobs
crontab -l

# Check cron service status
systemctl status cron
```

## 🔧 Alternative: Direct Cron Command

If you prefer not to use a script file:

```bash
# Edit crontab
crontab -e

# Add this line (replace with your actual values)
*/15 * * * * curl -X POST https://your-domain.com/api/cron/email-processing -H "Authorization: Bearer your-secret-token" -H "Content-Type: application/json" > /dev/null 2>&1
```

## 📊 Monitoring Commands

### Check Cron Job Status
```bash
# View cron logs
tail -f /var/log/cron

# View script logs
tail -f /home/crmuser/cron-email-processing.log

# Check if cron service is running
systemctl status cron
```

### Test API Endpoint
```bash
# Test the endpoint manually
curl -X POST https://your-domain.com/api/cron/email-processing \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json"
```

### Check Application Status
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs crm-app
```

## 🔧 Troubleshooting

### If Cron Job Not Running
```bash
# Restart cron service
sudo systemctl restart cron

# Check cron permissions
ls -la /home/crmuser/cron-email-processing.sh

# Test script manually
/home/crmuser/cron-email-processing.sh
```

### If Application Not Responding
```bash
# Restart application
pm2 restart crm-app

# Check environment variables
pm2 env crm-app
```

## ⏰ Cron Schedule Examples

```bash
# Every 15 minutes
*/15 * * * * /path/to/script.sh

# Every 30 minutes
*/30 * * * * /path/to/script.sh

# Every hour
0 * * * * /path/to/script.sh

# Every 2 hours
0 */2 * * * /path/to/script.sh

# Daily at 2 AM
0 2 * * * /path/to/script.sh
```

## 🔒 Security Notes

1. **Keep your `CRON_SECRET_TOKEN` secure**
2. **Use HTTPS for API calls**
3. **Monitor logs regularly**
4. **Set appropriate file permissions**

## 📞 Quick Help

- **Cron syntax**: `minute hour day month weekday command`
- **Log location**: `/var/log/cron`
- **Service name**: `cron` (not `crontab`)
- **User crontab**: `crontab -e` (edits current user's crontab)
- **System crontab**: `/etc/crontab` (system-wide crontab) 