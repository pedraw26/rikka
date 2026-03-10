// Server-side admin operations for excluded_ips table
// Uses Supabase RPC (SECURITY DEFINER) — bypasses RLS safely
// The browser NEVER writes directly

const SUPABASE_URL = 'https://nbhciatylkklmawdppsn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iaGNpYXR5bGtrbG1hd2RwcHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDAwNzMsImV4cCI6MjA4ODY3NjA3M30.c1QOlUJ-2E-dv7ZQ5ZOad5i7MJpjzwDd72iq-0hphUo';
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
    const { action, ip, label, id } = JSON.parse(event.body || '{}');

    if (action === 'add') {
      if (!ip || typeof ip !== 'string' || ip.trim().length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'IP is required' }) };
      }

      const trimmedIp = ip.trim();
      if (trimmedIp.length > 45) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid IP' }) };
      }

      // Call SECURITY DEFINER RPC function
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_add_excluded_ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
          admin_key: FN_TOKEN,
          ip_addr: trimmedIp,
          ip_label: (label || '').trim()
        })
      });

      if (!res.ok) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: 'RPC call failed' }) };
      }

      const result = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    if (action === 'remove') {
      if (!id || isNaN(Number(id))) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Valid ID is required' }) };
      }

      // Call SECURITY DEFINER RPC function
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_remove_excluded_ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ admin_key: FN_TOKEN, ip_id: Number(id) })
      });

      if (!res.ok) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: 'RPC call failed' }) };
      }

      const result = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Unknown action. Use "add" or "remove"' }) };
  } catch (err) {
    console.error('admin-ips error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Internal error' }) };
  }
};
