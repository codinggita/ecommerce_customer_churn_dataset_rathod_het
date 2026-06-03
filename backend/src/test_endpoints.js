const { spawn } = require('child_process');
const path = require('path');

// Port to run test server
const PORT = 5000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('--- STARTING INTEGRATION TESTS ---');

  // Start the server in a separate process
  const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' }
  });

  // Log server output to check connection
  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server stdout]: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server stderr]: ${data.toString().trim()}`);
  });

  // Wait 3 seconds for server boot & DB connection
  await delay(3000);

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  };

  const testGet = async (endpoint, description, checks = []) => {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`);
      const data = await res.json();
      assert(res.ok && data.success === true, `${description} (GET ${endpoint}) returns 200 & success=true`);
      for (const check of checks) {
        check(res, data);
      }
    } catch (err) {
      assert(false, `${description} (GET ${endpoint}) failed: ${err.message}`);
    }
  };

  try {
    // 1. HEALTH AND METADATA TESTS
    console.log('\n1. Testing Health and Metadata routes...');
    await testGet('/customers/system/health', 'System health status', [
      (res, data) => assert(data.status === 'UP', 'Status is UP'),
      (res) => assert(res.headers.get('X-Response-Time') !== null, 'X-Response-Time header is present')
    ]);

    await testGet('/customers/system/version', 'System version status', [
      (res, data) => assert(data.version === '1.0.0', 'Version is 1.0.0')
    ]);

    // 2. BASIC CRUD & PAGINATION & SORTING TESTS
    console.log('\n2. Testing Customer Listings & Query Params...');
    await testGet('/customers?page=1&limit=5', 'Paginated customers listing', [
      (res, data) => assert(data.data.length === 5, 'Returned limit of 5 customers'),
      (res, data) => assert(data.pagination.total === 15259, 'Total customers count is 15259'),
      (res, data) => assert(data.pagination.pages > 3000, 'Calculated total pages correctly')
    ]);

    await testGet('/customers?sort=age&limit=2', 'Sorted customers listing (age)', [
      (res, data) => assert(data.data[0].age <= data.data[1].age, 'Customers are sorted in ascending order of age')
    ]);

    await testGet('/customers?country=France&sort=lifetimeValue&page=1&limit=2', 'Country filter + Sort by LTV + Pagination combination query', [
      (res, data) => assert(data.data.every(c => c.country.toLowerCase() === 'france'), 'All filtered customers are from France'),
      (res, data) => assert(data.data[0].lifetimeValue <= data.data[1].lifetimeValue, 'Filtered customers sorted by LTV ascending')
    ]);

    // 3. SPECIAL KEYWORD & PARAM ROUTE TESTS
    console.log('\n3. Testing Parameterized & Analytical Filters...');
    await testGet('/customers/country/france?limit=2', 'Fetch customers by country route parameter', [
      (res, data) => assert(data.data.every(c => c.country.toLowerCase() === 'france'), 'All profiles from France')
    ]);

    await testGet('/customers/signup-quarter/q4?limit=2', 'Fetch customers by signup quarter route parameter', [
      (res, data) => assert(data.data.every(c => c.signupQuarter.toLowerCase() === 'q4'), 'All profiles signed up in Q4')
    ]);

    await testGet('/customers/high-value?limit=2', 'Fetch customers with high lifetime value (>2000)', [
      (res, data) => assert(data.data.every(c => c.lifetimeValue >= 2000), 'All profiles LTV >= 2000')
    ]);

    await testGet('/customers/churn-status/churned?limit=2', 'Fetch customers by churn status (churned)', [
      (res, data) => assert(data.data.every(c => c.churned === true), 'All profiles are churned')
    ]);

    // 4. SEARCH ROUTE TESTS
    console.log('\n4. Testing Search Engine...');
    await testGet('/search/customers?q=france&limit=2', 'General query search by keyword (France)', [
      (res, data) => assert(data.data.every(c => c.country.toLowerCase() === 'france'), 'General search results matched France')
    ]);

    await testGet('/search/customers?q=high-value&limit=2', 'Analytics search by special keyword (high-value)', [
      (res, data) => assert(data.data.every(c => c.lifetimeValue >= 2000), 'Special keyword resolved to LTV >= 2000')
    ]);

    // 5. STATS AND ANALYTICS AGGREGATION TESTS
    console.log('\n5. Testing Stats & Advanced Aggregation Pipeling...');
    await testGet('/stats/customers/count', 'Stats: count total customers', [
      (res, data) => assert(data.data.count === 15259, 'Counts exactly 15259 profiles')
    ]);

    await testGet('/stats/customers/average-age', 'Stats: average age', [
      (res, data) => assert(data.data.average === 37.64, 'Average age is 37.64')
    ]);

    await testGet('/analytics/customers/churn-analysis', 'Analytics: churn analysis', [
      (res, data) => assert(data.summary.totalCustomers === 15259, 'Aggregated total customer base'),
      (res, data) => assert(data.data.length > 0, 'Returned grouped churn data')
    ]);

    await testGet('/analytics/customers/country-analysis', 'Analytics: country distribution', [
      (res, data) => assert(data.data.length > 0, 'Grouped countries successfully')
    ]);

    // 6. MIDDLEWARE PRACTICE & ERROR HANDLING TESTS
    console.log('\n6. Testing Middleware & Error handlers...');
    await testGet('/middleware/request-time', 'Timing middleware header verification', [
      (res) => assert(res.headers.has('X-Response-Time'), 'Response includes X-Response-Time header')
    ]);

    // Test expected 400 error response
    try {
      const resErr = await fetch(`${BASE_URL}/customers/age/abc`);
      const dataErr = await resErr.json();
      assert(resErr.status === 400 && dataErr.success === false, 'Invalid numeric route parameter (/customers/age/abc) returns 400 & success=false');
    } catch (e) {
      assert(false, 'Invalid age parameter error handler check failed');
    }

    try {
      const resErr = await fetch(`${BASE_URL}/customers?page=-1`);
      const dataErr = await resErr.json();
      assert(resErr.status === 400 && dataErr.success === false, 'Invalid pagination request (/customers?page=-1) returns 400 & success=false');
    } catch (e) {
      assert(false, 'Invalid page parameter error handler check failed');
    }

    try {
      const resErr = await fetch(`${BASE_URL}/search/customers?q=`);
      const dataErr = await resErr.json();
      assert(resErr.status === 400 && dataErr.success === false, 'Empty search parameter returns 400 & success=false');
    } catch (e) {
      assert(false, 'Empty search parameter check failed');
    }

    // 7. OPTIONS & HEAD REQUEST TESTS
    console.log('\n7. Testing OPTIONS and HEAD methods...');
    try {
      const resHead = await fetch(`${BASE_URL}/customers`, { method: 'HEAD' });
      assert(resHead.ok && resHead.status === 200, 'HEAD /customers returns 200 OK');
    } catch (e) {
      assert(false, 'HEAD /customers failed');
    }

    try {
      const resOpt = await fetch(`${BASE_URL}/customers`, { method: 'OPTIONS' });
      const hasAllow = resOpt.headers.has('Allow') || resOpt.headers.has('access-control-allow-methods');
      assert((resOpt.status === 200 || resOpt.status === 204) && hasAllow, 'OPTIONS /customers returns Allowed methods');
    } catch (e) {
      assert(false, 'OPTIONS /customers failed: ' + e.message);
    }

    // 8. AUTHENTICATION & JWT SYSTEM TESTS
    console.log('\n8. Testing JWT Authentication Flow...');
    const testEmail = `tester_${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    // A. Register
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        gender: 'Male',
        age: 28,
        country: 'Canada',
        city: 'Vancouver'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success === true, 'POST /auth/register creates user account');
    const otp = regData.otp;

    // B. Verify Email using OTP
    const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp })
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200 && verifyData.success === true, 'POST /auth/verify-email validates email with OTP');

    // C. Login
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.success === true, 'POST /auth/login returns JWT token');
    const token = loginData.token;

    // D. Fetch Profile using Token
    const profileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const profileData = await profileRes.json();
    assert(profileRes.status === 200 && profileData.data.email === testEmail, 'GET /auth/profile retrieves authenticated profile');

    // E. JWT route validation
    const jwtProfileRes = await fetch(`${BASE_URL}/jwt/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const jwtProfileData = await jwtProfileRes.json();
    assert(jwtProfileRes.status === 200 && jwtProfileData.success === true, 'GET /jwt/profile accesses protected route');

    // F. Logout (Revoke token)
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const logoutData = await logoutRes.json();
    assert(logoutRes.status === 200 && logoutData.success === true, 'POST /auth/logout blacklists JWT');

    // G. Verify Token is blocked
    const blockedRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const blockedData = await blockedRes.json();
    assert(blockedRes.status === 401 && blockedData.success === false, 'Blocked token fails authentication');

    // H. Login again to get a new token for deletion
    const login2Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const login2Data = await login2Res.json();
    const token2 = login2Data.token;
    assert(login2Res.status === 200 && token2 !== undefined, 'POST /auth/login (2nd time) retrieves a new token');

    // I. Delete Profile (to clean up the database)
    const deleteRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200 && deleteData.success === true, 'DELETE /auth/profile cleans up the test user and database');

  } catch (error) {
    console.error('Test execution error occurred:', error);
  } finally {
    console.log(`\nTests Completed: ${passed} passed, ${failed} failed.`);
    // Terminate server process
    serverProcess.kill();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
