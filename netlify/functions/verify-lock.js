// Server-side lock password verification
// The password never reaches the client — only a true/false response

const SUPABASE_URL = 'https://tueltwjjkvqvdnznnhuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZWx0d2pqa3ZxdmRuem5uaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDEzMDAsImV4cCI6MjA4NzE3NzMwMH0.Vf55QMlAqxdpP5iVR7RzkljCn4G1GRyO_We_82xulYQ';

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

    // Fetch the real password from Supabase (server-side only)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/site_config?select=lock_password&id=eq.1`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!res.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ valid: false, error: 'Config fetch failed' }) };
    }

    const rows = await res.json();
    if (!rows.length) {
      return { statusCode: 500, headers, body: JSON.stringify({ valid: false, error: 'No config found' }) };
    }

    const storedPassword = (rows[0].lock_password || '').toLowerCase().trim();
    const inputPassword = password.toLowerCase().trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: storedPassword === inputPassword })
    };
  } catch (err) {
    console.error('verify-lock error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ valid: false, error: 'Internal error' }) };
  }
};
