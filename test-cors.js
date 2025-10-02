/**
 * CORS Test Script
 * Run this to test if the CORS configuration is working properly
 */

const fetch = require('node-fetch');

async function testCORS() {
  console.log('🧪 Testing CORS configuration...\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3000/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.message);
    
    // Test 2: Registration endpoint with CORS headers
    console.log('\n2. Testing registration endpoint...');
    const registrationResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3001', // Simulate frontend origin
      },
      body: JSON.stringify({
        username: 'test_user_cors',
        email: 'test.cors@example.com',
        password: 'TestPass123'
      })
    });
    
    console.log('📊 Response status:', registrationResponse.status);
    console.log('📊 CORS headers:');
    console.log('  - Access-Control-Allow-Origin:', registrationResponse.headers.get('access-control-allow-origin'));
    console.log('  - Access-Control-Allow-Methods:', registrationResponse.headers.get('access-control-allow-methods'));
    console.log('  - Access-Control-Allow-Headers:', registrationResponse.headers.get('access-control-allow-headers'));
    
    const registrationData = await registrationResponse.json();
    console.log('📊 Response data:', registrationData);
    
    if (registrationResponse.ok) {
      console.log('✅ Registration successful!');
    } else {
      console.log('❌ Registration failed:', registrationData.message);
    }
    
  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
    console.error('💡 Make sure the backend server is running on port 3000');
  }
}

// Run the test
testCORS();
