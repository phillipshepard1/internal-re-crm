# Google OAuth Setup Guide

## Overview

This guide will help you set up Google OAuth authentication for your CRM system. The integration includes domain-based role assignment, where users with company email domains are automatically assigned admin roles.

## 🚀 Quick Start

### 1. Google Cloud Console Setup

#### Step 1: Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing if not already enabled

#### Step 2: Enable Google+ API
1. Navigate to **APIs & Services** → **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click on it and press **Enable**

#### Step 3: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Configure the OAuth consent screen if prompted:
   - **User Type**: External (or Internal if using Google Workspace)
   - **App name**: Your CRM Name
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - **Authorized domains**: Add your domain

#### Step 4: Configure OAuth Client
1. **Application type**: Web application
2. **Name**: CRM OAuth Client
3. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://your-domain.com
   ```
4. **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/callback
   https://your-domain.com/auth/callback
   ```
5. Click **Create**
6. **Save the Client ID and Client Secret** (you'll need these)

### 2. Supabase Configuration

#### Step 1: Enable Google Provider
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click **Enable**
4. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. **Save the configuration**

#### Step 2: Configure Redirect URLs
1. In Supabase, go to **Authentication** → **URL Configuration**
2. Set your site URL: `https://your-domain.com` (or `http://localhost:3000` for development)
3. Add redirect URLs:
   ```
   https://your-domain.com/auth/callback
   http://localhost:3000/auth/callback
   ```

### 3. Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth (optional - for additional features)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Admin Domain Configuration
NEXT_PUBLIC_ADMIN_DOMAINS=yourcompany.com,admin.yourcompany.com
```

### 4. Test the Integration

1. Start your development server: `npm run dev`
2. Go to the login page
3. Click "Continue with Google"
4. Sign in with a Google account
5. Verify the user is created with the correct role

## 🔧 Advanced Configuration

### Domain-Based Role Assignment

The system automatically assigns roles based on email domains:

```bash
# Example: Users with these domains get admin access
NEXT_PUBLIC_ADMIN_DOMAINS=yourcompany.com,admin.yourcompany.com,management.yourcompany.com
```

**How it works:**
- Users with emails from configured domains → **Admin role**
- All other users → **Agent role**

### Custom Role Assignment

You can manually change user roles in the admin panel:
1. Go to **Admin Panel** → **Role Management**
2. Use the dropdown to change user roles
3. Changes are applied immediately

## 🔒 Security Considerations

### Recommended Security Practices

1. **Domain Restrictions**:
   - Only allow company email domains for admin access
   - Use specific subdomains for different admin levels

2. **Google Workspace Integration**:
   - If using Google Workspace, set OAuth consent to "Internal"
   - This restricts access to your organization only

3. **Environment Variables**:
   - Never commit `.env.local` to version control
   - Use different credentials for development/production

4. **Redirect URLs**:
   - Always use HTTPS in production
   - Limit redirect URLs to your domains only

### Production Deployment

1. **Update Google OAuth Settings**:
   - Add your production domain to authorized origins
   - Add production redirect URLs
   - Remove localhost URLs

2. **Environment Variables**:
   - Set production environment variables
   - Use production Supabase project
   - Configure production admin domains

3. **SSL Certificate**:
   - Ensure your domain has valid SSL certificate
   - Google OAuth requires HTTPS in production

## 🐛 Troubleshooting

### Common Issues

#### 1. "Invalid redirect URI" Error
**Solution**: Check that your redirect URI in Google Cloud Console matches exactly with Supabase configuration.

#### 2. "Access denied" After Google Login
**Solution**: 
- Check if user is created in the `users` table
- Verify role assignment logic
- Check admin domain configuration

#### 3. Google Login Button Not Working
**Solution**:
- Verify Google provider is enabled in Supabase
- Check browser console for errors
- Ensure environment variables are set correctly

#### 4. Role Assignment Not Working
**Solution**:
- Check `NEXT_PUBLIC_ADMIN_DOMAINS` environment variable
- Verify domain format (no spaces, comma-separated)
- Check browser console for role assignment errors

### Debug Steps

1. **Check Browser Console**:
   - Look for authentication errors
   - Check for role assignment logs

2. **Verify Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Check for authentication events

3. **Test Environment Variables**:
   ```javascript
   // Add this to your login page temporarily
   console.log('Admin domains:', process.env.NEXT_PUBLIC_ADMIN_DOMAINS)
   ```

## 📊 Monitoring & Analytics

### User Activity Tracking

The system automatically logs:
- User sign-ins (Google vs Email/Password)
- Role assignments
- Role changes by admins

### Admin Panel Features

- **User Management**: View all users and their roles
- **Role Management**: Change user roles manually
- **Domain Configuration**: View configured admin domains
- **Authentication Status**: Monitor OAuth provider status

## 🔄 Migration from Email/Password

### Existing Users

- Existing users can continue using email/password login
- Google login is an additional option, not a replacement
- Users can switch between authentication methods

### Data Migration

- No data migration required
- User roles and permissions remain intact
- All existing functionality continues to work

## 📞 Support

### Getting Help

1. **Check this guide** for common issues
2. **Review browser console** for error messages
3. **Check Supabase logs** for authentication events
4. **Verify environment variables** are set correctly

### Useful Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

## ✅ Checklist

- [ ] Google Cloud Console project created
- [ ] Google+ API enabled
- [ ] OAuth 2.0 credentials created
- [ ] Supabase Google provider enabled
- [ ] Environment variables configured
- [ ] Admin domains configured
- [ ] Test login with Google account
- [ ] Verify role assignment
- [ ] Test admin panel access
- [ ] Production environment configured

**Your Google OAuth integration is now ready! 🎉** 