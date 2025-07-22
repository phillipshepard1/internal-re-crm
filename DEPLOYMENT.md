# Production Deployment Guide

## 🚀 **Live Environment Fixes**

### **Current Issue**
The live site at [https://app.stresslesscrm.com/](https://app.stresslesscrm.com/) is experiencing infinite loading issues after page refresh, while the local environment works correctly.

### **Root Causes & Solutions**

#### 1. **Environment Variables**
Ensure these environment variables are properly set in production:

```bash
# Required Environment Variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXTAUTH_URL=https://app.stresslesscrm.com
NODE_ENV=production

# Optional but recommended
NEXT_PUBLIC_APP_URL=https://app.stresslesscrm.com
```

#### 2. **Database Connection**
- **Supabase Project**: Verify the Supabase project is active and accessible
- **Database Permissions**: Ensure RLS policies allow authenticated access
- **Network Access**: Check if the production server can reach Supabase

#### 3. **Authentication Configuration**
- **OAuth Redirect URLs**: Update Google OAuth redirect URLs in Supabase
- **Cookie Domain**: Ensure cookies are set for the correct domain
- **CORS Settings**: Configure CORS for the production domain

### **Production-Specific Optimizations**

#### **Timeouts & Retries**
- **Auth Timeout**: 8 seconds (vs 10 seconds locally)
- **Database Timeout**: 3 seconds (vs 5 seconds locally)
- **Retry Attempts**: 2 attempts (vs 3 locally)
- **Guard Timeout**: 12 seconds (vs 15 seconds locally)

#### **Error Handling**
- **Graceful Degradation**: Fallback to default roles on database errors
- **User Feedback**: Clear error messages and recovery options
- **Automatic Recovery**: Timeout-based recovery mechanisms

### **Deployment Checklist**

#### **Pre-Deployment**
- [ ] Environment variables configured
- [ ] Supabase project settings updated
- [ ] OAuth redirect URLs configured
- [ ] Database permissions verified
- [ ] Build tested locally with production settings

#### **Deployment**
- [ ] Clear browser cache and storage
- [ ] Deploy with production environment
- [ ] Verify environment variables are loaded
- [ ] Test authentication flow
- [ ] Monitor error logs

#### **Post-Deployment**
- [ ] Test page refresh functionality
- [ ] Verify database connectivity
- [ ] Check authentication state management
- [ ] Monitor performance metrics
- [ ] Test error recovery mechanisms

### **Debugging Tools**

#### **Debug Page**
Visit `/debug` to access real-time diagnostic information:
- Authentication status
- Database connectivity
- Session information
- Environment details

#### **Console Logging**
Production logs include:
- Environment detection
- Timeout information
- Error details
- Performance metrics

### **Recovery Mechanisms**

#### **Automatic Recovery**
1. **Auth Timeout**: Forces completion after 8 seconds
2. **Guard Timeout**: Redirects to login after 12 seconds
3. **Database Fallback**: Uses default role on connection failure
4. **Error Boundary**: Catches and handles component errors

#### **Manual Recovery**
1. **Clear Storage**: Removes all local data
2. **Refresh Page**: Reloads the application
3. **Go Home**: Navigates to dashboard
4. **Try Again**: Retries failed operations

### **Monitoring & Alerts**

#### **Key Metrics**
- Authentication success rate
- Database connection time
- Page load performance
- Error frequency

#### **Alert Conditions**
- Authentication timeout > 10 seconds
- Database connection failures > 5%
- Error rate > 1%
- Page load time > 15 seconds

### **Troubleshooting Steps**

#### **If Still Experiencing Issues**

1. **Check Environment Variables**
   ```bash
   # Verify in production
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   echo $NODE_ENV
   ```

2. **Test Database Connection**
   - Visit `/debug` page
   - Check database status
   - Verify Supabase project settings

3. **Clear Browser Data**
   - Clear localStorage
   - Clear sessionStorage
   - Clear cookies
   - Hard refresh (Ctrl+Shift+R)

4. **Check Network Tab**
   - Look for failed requests
   - Check CORS errors
   - Verify API responses

5. **Monitor Console Logs**
   - Authentication errors
   - Database timeouts
   - Environment detection

### **Emergency Fixes**

#### **Immediate Actions**
1. **Restart Application**: Reload the production server
2. **Clear CDN Cache**: Purge any cached responses
3. **Rollback**: Revert to previous working version
4. **Maintenance Mode**: Show maintenance page temporarily

#### **Long-term Solutions**
1. **Database Optimization**: Improve query performance
2. **Caching Strategy**: Implement proper caching
3. **Load Balancing**: Distribute traffic across servers
4. **Monitoring**: Set up comprehensive monitoring

### **Contact Information**
For immediate assistance with production issues:
- **Support Email**: [support@stresslesscrm.com]
- **Emergency Contact**: [emergency contact]
- **Documentation**: [link to docs]

---

**Last Updated**: [Current Date]
**Version**: [Current Version]
**Environment**: Production 