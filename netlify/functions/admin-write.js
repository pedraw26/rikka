// Server-side admin write operations for site_config
// Uses Supabase RPC (SECURITY DEFINER) — bypasses RLS safely
// The browser NEVER writes to Supabase directly

const SUPABASE_URL = 'https://nbhciatylkklmawdppsn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iaGNpYXR5bGtrbG1hd2RwcHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDAwNzMsImV4cCI6MjA4ODY3NjA3M30.c1QOlUJ-2E-dv7ZQ5ZOad5i7MJpjzwDd72iq-0hphUo';
const FN_TOKEN = 'rkst_fn_8eac49f3cbc73c8b833d13db580d4ce14f21ad31071ce02a';

// Only these fields can be updated — must match DB column names
const ALLOWED_FIELDS = ['is_locked', 'lock_password', 'admin_ip', 'refresh_rate', 'live_interval'];

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
    const { action, data } = JSON.parse(event.body || '{}');

    if (!action || !data || typeof data !== 'object') {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Missing action or data' }) };
    }

    // Filter to only allowed fields
    const sanitized = {};
    for (const key of Object.keys(data)) {
      if (ALLOWED_FIELDS.includes(key)) {
        sanitized[key] = data[key];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'No valid fields' }) };
    }

    // Validate types before sending to RPC
    if (sanitized.is_locked !== undefined && typeof sanitized.is_locked !== 'boolean') {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'is_locked must be boolean' }) };
    }
    if (sanitized.lock_password !== undefined && (typeof sanitized.lock_password !== 'string' || sanitized.lock_password.trim().length === 0)) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'lock_password must be non-empty string' }) };
    }
    if (sanitized.admin_ip !== undefined && (typeof sanitized.admin_ip !== 'string' || sanitized.admin_ip.trim().length === 0)) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'admin_ip must be non-empty string' }) };
    }
    if (sanitized.refresh_rate !== undefined) {
      const ri = Number(sanitized.refresh_rate);
      if (isNaN(ri) || ri < 10 || ri > 600) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'refresh_rate must be 10-600' }) };
      }
      sanitized.refresh_rate = ri;
    }
    if (sanitized.live_interval !== undefined) {
      const li = Number(sanitized.live_interval);
      if (isNaN(li) || li < 5 || li > 120) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'live_interval must be 5-120' }) };
      }
      sanitized.live_interval = li;
    }

    // Call SECURITY DEFINER RPC function
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_update_config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ admin_key: FN_TOKEN, config: sanitized })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('RPC error:', err);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: 'RPC call failed' }) };
    }

    const result = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    console.error('admin-write error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Internal error' }) };
  }
};
