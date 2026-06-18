const fs = require('fs');
const http = require('http');

// Read the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the .env.local file
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = env['VITE_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

// Emulate a login flow
async function test() {
  console.log("1. Calling verify_staff_login...");
  
  const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_staff_login`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_email: 'businessneato@gmail.com',
      p_pin: 'ADMIN123'
    })
  });
  
  if (!verifyRes.ok) {
    console.error("verify_staff_login failed:", await verifyRes.text());
    return;
  }
  
  const adminProfile = await verifyRes.json();
  console.log("verify_staff_login success! Profile:", adminProfile);
  
  console.log("\n2. Attempting signInWithPassword...");
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'businessneato@gmail.com',
      password: 'ADMIN123'
    })
  });
  
  let token = null;
  if (!authRes.ok) {
    console.error("signInWithPassword failed:", await authRes.text());
    console.log("\n2b. Attempting signUp...");
    const signUpRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'businessneato@gmail.com',
        password: 'ADMIN123'
      })
    });
    if (!signUpRes.ok) {
      console.error("signUp failed:", await signUpRes.text());
      return;
    }
    const signUpData = await signUpRes.json();
    console.log("signUp success!");
    token = signUpData.session?.access_token;
  } else {
    const authData = await authRes.json();
    console.log("signInWithPassword success!");
    token = authData.access_token;
  }
  
  if (!token) {
    console.error("No access token obtained!");
    return;
  }
  
  console.log("\n3. Testing RLS: Fetching profiles...");
  const profilesRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!profilesRes.ok) {
    console.error("Profiles fetch failed:", await profilesRes.text());
  } else {
    const profiles = await profilesRes.json();
    console.log(`Profiles fetch success! Found ${profiles.length} profiles.`);
    console.log(profiles);
  }
}

test();
