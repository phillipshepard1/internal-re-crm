#!/usr/bin/env node

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

/**
 * Gmail Token Cleanup Script
 * 
 * This script can be used to:
 * 1. Manually trigger token cleanup
 * 2. Set up as a cron job for automatic cleanup
 * 3. Test token validation and refresh functionality
 * 
 * Usage:
 * - Manual: node scripts/cleanup-gmail-tokens.js
 * - Cron: Add to crontab to run every 6 hours
 */

// Cron example: 0 */6 * * * cd /path/to/your/app && node scripts/cleanup-gmail-tokens.js

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const CLEANUP_ENDPOINT = '/api/gmail/cleanup-tokens';
const API_KEY = process.env.CLEANUP_API_KEY;

// Check if API key is configured
if (!API_KEY) {
  console.warn('⚠️  CLEANUP_API_KEY not found in environment variables.');
  console.warn('   The cleanup endpoint may reject the request if it requires authentication.');
  console.warn('   Add CLEANUP_API_KEY to your .env.local file for secure cleanup operations.');
  console.log('');
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` }),
        ...options.headers
      },
      ...options
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: { raw: data }
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function cleanupTokens() {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Starting Gmail token cleanup...`);
  
  try {
    const url = `${BASE_URL}${CLEANUP_ENDPOINT}`;
    const result = await makeRequest(url);
    
    if (result.statusCode === 200) {
      const { data } = result;
      console.log(`[${new Date().toISOString()}] ✅ Cleanup completed successfully`);
      console.log(`   Message: ${data.message}`);
      console.log(`   Processed: ${data.processed} tokens`);
      console.log(`   Refreshed: ${data.refreshed} tokens`);
      console.log(`   Deactivated: ${data.deactivated} tokens`);
      console.log(`   Valid: ${data.summary.valid} tokens`);
      
      if (data.deactivated > 0) {
        console.log(`   ⚠️  ${data.deactivated} invalid connections were deactivated`);
      }
      if (data.refreshed > 0) {
        console.log(`   🔄 ${data.refreshed} tokens were automatically refreshed`);
      }
    } else {
      console.error(`[${new Date().toISOString()}] ❌ Cleanup failed with status ${result.statusCode}`);
      console.error(`   Response:`, result.data);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Cleanup failed with error:`, error.message);
  }
  
  const endTime = new Date();
  const duration = endTime.getTime() - startTime.getTime();
  console.log(`[${endTime.toISOString()}] Cleanup completed in ${duration}ms`);
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupTokens()
    .then(() => {
      console.log('Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupTokens }; 