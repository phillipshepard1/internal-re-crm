#!/usr/bin/env node

/**
 * Test script for N8N webhook endpoint
 * Usage: node scripts/test-n8n-webhook.js
 */

const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Configuration
const config = {
  webhookUrl: process.env.CRM_WEBHOOK_URL || 'http://localhost:3000/api/n8n/process-lead',
  webhookToken: process.env.N8N_WEBHOOK_TOKEN || 'test-token',
  useHttps: process.env.CRM_WEBHOOK_URL?.startsWith('https') || false
};

// Sample test data
const testLeadData = {
  email_id: `test-${Date.now()}`,
  from: "john.doe@example.com",
  subject: "Interested in buying a house in downtown",
  body: `Hi there,

I'm interested in buying a house in downtown. I'm looking for a 3-bedroom property with a budget around $500,000-$600,000.

My contact information:
- Name: John Doe
- Phone: (555) 123-4567
- Email: john.doe@example.com

I'm looking to move within the next 3-6 months.

Thanks,
John Doe`,
  date: new Date().toISOString(),
  ai_analysis: {
    is_lead: true,
    confidence: 0.95,
    lead_data: {
      first_name: "John",
      last_name: "Doe",
      email: ["john.doe@example.com"],
      phone: ["(555) 123-4567"],
      company: "",
      position: "",
      property_address: "",
      property_details: "3-bedroom house",
      price_range: "$500,000-$600,000",
      property_type: "residential",
      timeline: "3-6 months",
      message: "Interested in buying a house in downtown",
      lead_source: "email",
      urgency: "medium"
    },
    analysis: {
      intent: "buying",
      property_type: "residential",
      budget_range: "$500,000-$600,000",
      location_preferences: ["downtown"]
    }
  },
  attachments: [],
  user_id: "test-user-123"
};

// Sample non-lead data
const testNonLeadData = {
  email_id: `test-nonlead-${Date.now()}`,
  from: "noreply@newsletter.com",
  subject: "Weekly real estate newsletter",
  body: "This week's real estate market update...",
  date: new Date().toISOString(),
  ai_analysis: {
    is_lead: false,
    confidence: 0.1,
    lead_data: {},
    analysis: {}
  },
  attachments: [],
  user_id: "test-user-123"
};

function makeRequest(data, description) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const url = new URL(config.webhookUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (config.useHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${config.webhookToken}`
      }
    };

    const client = config.useHttps ? https : http;
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            response: response,
            description: description
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            response: responseData,
            description: description
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        error: error.message,
        description: description
      });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing N8N Webhook Endpoint\n');
  console.log(`URL: ${config.webhookUrl}`);
  console.log(`Token: ${config.webhookToken.substring(0, 10)}...\n`);

  try {
    // Test 1: Valid lead data
    console.log('📧 Test 1: Processing valid lead...');
    const leadResult = await makeRequest(testLeadData, 'Valid lead');
    console.log(`Status: ${leadResult.statusCode}`);
    console.log(`Response: ${JSON.stringify(leadResult.response, null, 2)}\n`);

    // Test 2: Non-lead data
    console.log('📧 Test 2: Processing non-lead...');
    const nonLeadResult = await makeRequest(testNonLeadData, 'Non-lead');
    console.log(`Status: ${nonLeadResult.statusCode}`);
    console.log(`Response: ${JSON.stringify(nonLeadResult.response, null, 2)}\n`);

    // Test 3: Invalid token
    console.log('🔒 Test 3: Testing invalid token...');
    const invalidTokenData = { ...testLeadData };
    const invalidTokenResult = await makeRequest(invalidTokenData, 'Invalid token');
    console.log(`Status: ${invalidTokenResult.statusCode}`);
    console.log(`Response: ${JSON.stringify(invalidTokenResult.response, null, 2)}\n`);

    // Test 4: Missing required fields
    console.log('❌ Test 4: Testing missing fields...');
    const invalidData = {
      email_id: `test-invalid-${Date.now()}`,
      // Missing from, subject, etc.
      ai_analysis: {
        is_lead: true,
        confidence: 0.8,
        lead_data: {}
      }
    };
    const invalidFieldsResult = await makeRequest(invalidData, 'Missing fields');
    console.log(`Status: ${invalidFieldsResult.statusCode}`);
    console.log(`Response: ${JSON.stringify(invalidFieldsResult.response, null, 2)}\n`);

    // Summary
    console.log('📊 Test Summary:');
    console.log(`✅ Lead processing: ${leadResult.statusCode === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Non-lead processing: ${nonLeadResult.statusCode === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Security (invalid token): ${invalidTokenResult.statusCode === 401 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Validation (missing fields): ${invalidFieldsResult.statusCode === 400 ? 'PASS' : 'FAIL'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { makeRequest, testLeadData, testNonLeadData }; 