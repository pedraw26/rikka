// Server-side lock password verification
// Uses Supabase RPC (SECURITY DEFINER) — password never reaches the client
// Only returns true/false

const SUPABASE_URL = 'https://tueltwjjkvqvdnznnhuq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZWx0d2pqa3ZxdmRuem5uaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDEzMDAsImV4cCI6MjA4NzE3NzMwMH0.Vf55QMlAqxdpP5iVR7RzkljCn4G1GRyO_We_82xulYQ';
const FN_TOKEN = 'rkst_fn_8eac49f3cbc73c8b833d13db580d4ce14f21ad31071ce02a';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { password } = JSON.parse(event.body || '{}');

    if (!password || typeof password !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ valid: false, error: 'No password provided' }) };
    }

    // Call SECURITY DEFINER RPC function — password comparison happens in Postgres
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_lock_password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ fn_secret: FN_TOKEN, attempt: password })
    });

    if (!res.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ valid: false, error: 'Verification failed' }) };
    }

    const result = await res.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: result.valid === true })
    };
  } catch (err) {
    console.error('verify-lock error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ valid: false, error: 'Internal error' }) };
  }
};
