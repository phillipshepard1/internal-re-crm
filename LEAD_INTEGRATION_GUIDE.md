# Lead Integration Guide

## Overview

Your CRM now supports **automatic lead capture** from multiple sources, just like Follow Up Boss and other leading real estate CRMs. This guide explains how to set up and use these integrations.

## 🎯 **Key Features Implemented**

### 1. **Email Lead Processing (Gmail Integration)**
- **Automatic email parsing** from real estate portals
- **Gmail API integration** for real-time lead capture
- **Smart email pattern recognition** for Zillow, Realtor.com, HomeStack, and generic forms
- **Round Robin assignment** of leads to agents

### 2. **HomeStack API Integration**
- **Direct API connection** to HomeStack app
- **Webhook support** for real-time lead capture
- **Automatic contact creation** with property details

### 3. **Admin Management Panel**
- **Integration configuration** interface
- **Manual lead processing** tools
- **Processing history** and statistics

---

## 📧 **Gmail Integration Setup**

### **Step 1: Google Cloud Console Setup**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Download the credentials (you'll need Client ID and Client Secret)

### **Step 2: Get Refresh Token**
1. Use Google's OAuth 2.0 playground or a simple script
2. Authorize your Gmail account
3. Get the refresh token

### **Step 3: Configure in CRM**
1. Go to **Admin Panel → Integrations**
2. Enable Gmail Integration
3. Enter your credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
   - **Refresh Token**: From OAuth process
   - **Email Address**: Your Gmail address

### **Step 4: Test Integration**
1. Click **"Process Recent Emails"** to test
2. Check if leads are created in your People module

---

## 🏠 **HomeStack Integration Setup**

### **Step 1: Get API Credentials**
1. Contact HomeStack support for API access
2. Get your API key and base URL
3. (Optional) Set up webhook for real-time updates

### **Step 2: Configure in CRM**
1. Go to **Admin Panel → Integrations**
2. Enable HomeStack Integration
3. Enter your credentials:
   - **API Key**: From HomeStack
   - **Base URL**: HomeStack API endpoint
   - **Webhook Secret**: (Optional) For webhook verification

### **Step 3: Test Integration**
1. Click **"Import Recent Leads"** to test
2. Verify leads appear in your People module

---

## 🔄 **How Lead Processing Works**

### **Email Processing Flow**
1. **Email Received**: Lead notification email hits your Gmail
2. **Pattern Recognition**: System identifies the source (Zillow, Realtor.com, etc.)
3. **Data Extraction**: Name, email, phone, property details extracted
4. **Contact Creation**: New person record created in CRM
5. **Round Robin Assignment**: Lead assigned to next available agent
6. **Activity Logging**: System logs the lead capture

### **HomeStack Processing Flow**
1. **API Call**: System fetches recent leads from HomeStack
2. **Data Transformation**: Converts HomeStack format to CRM format
3. **Contact Creation**: New person record created
4. **Round Robin Assignment**: Lead assigned to agent
5. **Activity Logging**: System logs the import

---

## 📊 **Supported Email Sources**

### **Automatically Detected Sources**
- ✅ **Zillow** - Property inquiry emails
- ✅ **Realtor.com** - Lead notification emails
- ✅ **HomeStack** - Custom lead emails
- ✅ **Generic Forms** - Contact form submissions
- ✅ **Other Sources** - Fallback pattern matching

### **Data Extracted**
- **Contact Info**: Name, email, phone
- **Property Details**: Address, property description
- **Message Content**: Lead inquiry details
- **Source Tracking**: Which platform the lead came from

---

## ⚙️ **Admin Panel Features**

### **Integration Management**
- **Enable/Disable** integrations
- **Configuration** storage
- **Test connections** before going live
- **Processing history** and statistics

### **Manual Processing**
- **Process recent emails** (Gmail)
- **Import recent leads** (HomeStack)
- **View processing results** and counts

### **Monitoring**
- **Last processed** timestamps
- **Success/failure** tracking
- **Error logging** for troubleshooting

---

## 🔧 **Environment Variables**

Add these to your `.env.local` file:

```bash
# Gmail Integration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
GMAIL_EMAIL_ADDRESS=your_email@gmail.com

# HomeStack Integration
HOMESTACK_API_KEY=your_homestack_api_key
HOMESTACK_BASE_URL=https://api.homestack.com
HOMESTACK_WEBHOOK_SECRET=your_webhook_secret
```

---

## 🚀 **Next Steps**

### **Immediate Actions**
1. **Set up Gmail integration** (highest priority - most leads come via email)
2. **Configure HomeStack API** (if you have API access)
3. **Test both integrations** with recent data
4. **Train your team** on the new lead capture process

### **Advanced Features** (Future)
- **Real-time webhooks** for instant lead capture
- **Email templates** for automated responses
- **Lead scoring** and prioritization
- **Advanced filtering** and routing rules

---

## 📞 **Support**

### **Common Issues**
- **Gmail API errors**: Check OAuth credentials and permissions
- **HomeStack API errors**: Verify API key and base URL
- **No leads processed**: Check email patterns and source detection

### **Getting Help**
1. Check the **Admin Panel → Integrations** for error messages
2. Review **browser console** for detailed error logs
3. Contact support with specific error messages

---

## 🎉 **Benefits**

### **Like Follow Up Boss**
- ✅ **Automatic lead capture** from email
- ✅ **Real-time processing** of inquiries
- ✅ **Round Robin assignment** to agents
- ✅ **Activity tracking** and logging
- ✅ **Property details** extraction

### **Your Custom Features**
- ✅ **HomeStack integration** (not available in FUB)
- ✅ **Custom email parsing** patterns
- ✅ **Admin control panel** for management
- ✅ **Flexible configuration** options

---

**Your CRM now has enterprise-level lead capture capabilities! 🚀** 