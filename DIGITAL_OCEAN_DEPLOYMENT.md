# Digital Ocean Server Deployment Guide

This guide covers deploying the CRM application to a Digital Ocean server with PM2 process management and automated email processing via cron jobs.

## 🚀 Prerequisites

- Digital Ocean droplet (Ubuntu 20.04+ recommended)
- Domain name pointing to your server
- SSH access to your server
- Basic knowledge of Linux commands

## 📋 Server Setup

### 1. Initial Server Configuration

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git nginx certbot python3-certbot-nginx

# Install Node.js 18+ (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install and configure firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

### 2. Create Application User

```bash
# Create a non-root user for the application
adduser crmuser
usermod -aG sudo crmuser

# Switch to the new user
su - crmuser
```

### 3. Clone and Setup Application

```bash
# Navigate to home directory
cd /home/crmuser

# Clone your repository
git clone https://github.com/your-username/your-repo.git crm-app
cd crm-app

# Install dependencies
npm install

# Create environment file
cp .env.example .env
nano .env
```

### 4. Environment Variables

Add these to your `.env` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Gmail API Configuration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret

# Cron Job Security
CRON_SECRET_TOKEN=your_generated_secret_token

# Server Configuration
NODE_ENV=production
PORT=3000
```

## 🏗️ Application Deployment

### 1. Build Application

```bash
# Build the application
npm run build

# Test the build
npm start
# Press Ctrl+C to stop
```

### 2. Configure PM2

```bash
# Start application with PM2
pm2 start npm --name "crm-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided
```

### 3. Configure Nginx

```bash
# Switch back to root user
exit

# Create Nginx configuration
nano /etc/nginx/sites-available/crm-app
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase max upload size for file uploads
    client_max_body_size 10M;
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/crm-app /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### 4. SSL Certificate

```bash
# Install SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
certbot renew --dry-run
```

## ⏰ Cron Job Setup

### 1. Create Cron Job Script

```bash
# Switch to application user
su - crmuser

# Create cron job script
nano /home/crmuser/cron-email-processing.sh
```

Add this content:

```bash
#!/bin/bash

# Email Processing Cron Job Script
# This script triggers the email processing API endpoint

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

```bash
# Make script executable
chmod +x /home/crmuser/cron-email-processing.sh

# Test the script manually
./cron-email-processing.sh
```

### 2. Setup Cron Job

```bash
# Edit crontab
crontab -e

# Add the following line (runs every 15 minutes)
*/15 * * * * /home/crmuser/cron-email-processing.sh

# Verify cron job is set
crontab -l
```

### 3. Alternative Cron Job (Direct curl)

If you prefer not to use a script file:

```bash
# Edit crontab
crontab -e

# Add this line (replace with your actual values)
*/15 * * * * curl -X POST https://your-domain.com/api/cron/email-processing -H "Authorization: Bearer your-secret-token" -H "Content-Type: application/json" > /dev/null 2>&1
```

## 📊 Monitoring and Management

### 1. PM2 Commands

```bash
# View all processes
pm2 status

# View logs
pm2 logs crm-app

# Monitor in real-time
pm2 monit

# Restart application
pm2 restart crm-app

# Stop application
pm2 stop crm-app

# Delete application from PM2
pm2 delete crm-app
```

### 2. Application Logs

```bash
# View PM2 logs
pm2 logs crm-app

# View specific log file
tail -f /home/crmuser/.pm2/logs/crm-app-out.log
tail -f /home/crmuser/.pm2/logs/crm-app-error.log

# View cron job logs
tail -f /home/crmuser/cron-email-processing.log
```

### 3. System Monitoring

```bash
# Monitor system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Monitor network connections
netstat -tulpn
```

### 4. Cron Job Monitoring

```bash
# Check cron service status
systemctl status cron

# View cron logs
tail -f /var/log/cron

# List all cron jobs
crontab -l

# Test cron job manually
/home/crmuser/cron-email-processing.sh
```

## 🔧 Troubleshooting

### 1. Application Issues

```bash
# Check if application is running
pm2 status

# Check application logs
pm2 logs crm-app

# Restart application
pm2 restart crm-app

# Check environment variables
pm2 env crm-app
```

### 2. Cron Job Issues

```bash
# Check cron service
systemctl status cron

# Restart cron service
sudo systemctl restart cron

# Check cron logs
tail -f /var/log/cron

# Test cron job manually
/home/crmuser/cron-email-processing.sh

# Check cron job permissions
ls -la /home/crmuser/cron-email-processing.sh
```

### 3. Nginx Issues

```bash
# Check Nginx status
systemctl status nginx

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Check Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### 4. SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Renew certificate manually
certbot renew

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout | grep "Not After"
```

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# Check firewall status
ufw status

# Allow only necessary ports
ufw allow ssh
ufw allow 'Nginx Full'
ufw deny 22/tcp  # If using different SSH port
ufw enable
```

### 2. SSH Security

```bash
# Edit SSH configuration
nano /etc/ssh/sshd_config

# Add/modify these lines:
Port 2222  # Change default port
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH
systemctl restart sshd
```

### 3. Regular Updates

```bash
# Create update script
nano /home/crmuser/update-system.sh
```

Add this content:

```bash
#!/bin/bash
# System update script

echo "Starting system update..."
apt update && apt upgrade -y

echo "Updating Node.js packages..."
npm update -g

echo "Updating PM2..."
pm2 update

echo "System update completed at $(date)" >> /home/crmuser/update.log
```

```bash
# Make executable and add to cron
chmod +x /home/crmuser/update-system.sh
crontab -e

# Add weekly update (every Sunday at 2 AM)
0 2 * * 0 /home/crmuser/update-system.sh
```

## 📈 Performance Optimization

### 1. PM2 Configuration

Create a PM2 ecosystem file:

```bash
nano /home/crmuser/crm-app/ecosystem.config.js
```

Add this content:

```javascript
module.exports = {
  apps: [{
    name: 'crm-app',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

### 2. Nginx Optimization

Add to your Nginx configuration:

```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# Cache static files
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔄 Backup Strategy

### 1. Database Backup

```bash
# Create backup script
nano /home/crmuser/backup-database.sh
```

Add this content:

```bash
#!/bin/bash
# Database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/crmuser/backups"
mkdir -p $BACKUP_DIR

# Backup Supabase data (if using pg_dump)
# pg_dump your_database > $BACKUP_DIR/db_backup_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /home/crmuser/crm-app

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed at $(date)" >> /home/crmuser/backup.log
```

### 2. Automated Backups

```bash
# Make executable
chmod +x /home/crmuser/backup-database.sh

# Add to cron (daily at 3 AM)
crontab -e
0 3 * * * /home/crmuser/backup-database.sh
```

## 📞 Support and Maintenance

### 1. Regular Maintenance Tasks

- Monitor application logs daily
- Check system resources weekly
- Update system monthly
- Review security logs monthly
- Test backup restoration quarterly

### 2. Emergency Procedures

```bash
# Emergency restart
pm2 restart crm-app

# Emergency rollback (if needed)
cd /home/crmuser/crm-app
git checkout previous-commit
npm install
npm run build
pm2 restart crm-app

# Emergency backup
/home/crmuser/backup-database.sh
```

### 3. Contact Information

- Server provider: Digital Ocean
- Domain provider: Your domain registrar
- SSL provider: Let's Encrypt
- Application support: Your development team

## ✅ Deployment Checklist

- [ ] Server setup completed
- [ ] Application deployed with PM2
- [ ] Nginx configured and SSL installed
- [ ] Environment variables set
- [ ] Cron job configured and tested
- [ ] Monitoring tools set up
- [ ] Backup strategy implemented
- [ ] Security measures applied
- [ ] Performance optimization completed
- [ ] Documentation updated

Your CRM application is now fully deployed on Digital Ocean with automated email processing via cron jobs! 