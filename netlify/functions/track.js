// Analytics tracking serverless function
// Receives pageview data and stores it in Supabase

const SUPABASE_URL = 'https://tueltwjjkvqvdnznnhuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZWx0d2pqa3ZxdmRuem5uaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDEzMDAsImV4cCI6MjA4NzE3NzMwMH0.Vf55QMlAqxdpP5iVR7RzkljCn4G1GRyO_We_82xulYQ';

// Parse user agent to extract browser, OS, device type
function parseUserAgent(ua) {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device_type: 'desktop' };

  let browser = 'Unknown';
  let os = 'Unknown';
  let device_type = 'desktop';

  // Detect browser
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'IE';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) os = 'iOS';
  else if (ua.includes('CrOS')) os = 'Chrome OS';

  // Detect device type
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    device_type = 'mobile';
  } else if (ua.includes('iPad') || ua.includes('Tablet')) {
    device_type = 'tablet';
  } else {
    device_type = 'desktop';
  }

  return { browser, os, device_type };
}

// Extract domain from referrer URL
function extractDomain(referrer) {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

// Country code to name mapping (top countries)
const countryNames = {
  'US': 'United States', 'GB': 'United Kingdom', 'BR': 'Brazil',
  'PT': 'Portugal', 'CV': 'Cape Verde', 'AO': 'Angola',
  'MZ': 'Mozambique', 'GW': 'Guinea-Bissau', 'TL': 'Timor-Leste',
  'ST': 'Sao Tome', 'FR': 'France', 'DE': 'Germany', 'ES': 'Spain',
  'IT': 'Italy', 'NL': 'Netherlands', 'BE': 'Belgium', 'CH': 'Switzerland',
  'CA': 'Canada', 'AU': 'Australia', 'JP': 'Japan', 'KR': 'South Korea',
  'IN': 'India', 'CN': 'China', 'RU': 'Russia', 'MX': 'Mexico',
  'AR': 'Argentina', 'CO': 'Colombia', 'CL': 'Chile', 'PE': 'Peru',
  'ZA': 'South Africa', 'NG': 'Nigeria', 'KE': 'Kenya', 'GH': 'Ghana',
  'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland',
  'PL': 'Poland', 'CZ': 'Czech Republic', 'AT': 'Austria', 'IE': 'Ireland',
  'NZ': 'New Zealand', 'SG': 'Singapore', 'PH': 'Philippines',
  'TH': 'Thailand', 'ID': 'Indonesia', 'MY': 'Malaysia', 'VN': 'Vietnam',
  'TR': 'Turkey', 'EG': 'Egypt', 'SA': 'Saudi Arabia', 'AE': 'UAE',
  'IL': 'Israel', 'UA': 'Ukraine', 'RO': 'Romania', 'HU': 'Hungary',
  'GR': 'Greece', 'HR': 'Croatia', 'RS': 'Serbia', 'BG': 'Bulgaria'
};

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);
    const ua = event.headers['user-agent'] || '';
    const { browser, os, device_type } = parseUserAgent(ua);

    // Get country from Netlify geo headers
    const country = event.headers['x-country'] || event.headers['x-nf-country-code'] || data.country || 'XX';
    const country_name = countryNames[country] || country;

    // Extract referrer domain
    const referrer_domain = extractDomain(data.referrer);

    // Client IP from Netlify headers
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || event.headers['x-nf-client-connection-ip']
      || event.headers['client-ip']
      || null;

    // Handle different event types
    if (data.type === 'pageview') {
      const payload = {
        session_id: data.session_id,
        path: data.path || '/',
        referrer: data.referrer || null,
        referrer_domain: referrer_domain,
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        ip: clientIp,
        device_type: device_type,
        browser: browser,
        os: os,
        country: country,
        country_name: country_name,
        screen_width: data.screen_width || null,
        screen_height: data.screen_height || null,
        is_unique: data.is_unique !== false,
        duration: 0
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/pageviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Supabase error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to store pageview' }) };
      }

      const result = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: result[0]?.id }) };
    }

    // Handle duration update (heartbeat)
    if (data.type === 'duration') {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/pageviews?id=eq.${data.pageview_id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ duration: data.duration })
        }
      );

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // Handle custom events (newsletter signup, etc.)
    if (data.type === 'event') {
      const payload = {
        event_type: data.event_name,
        event_data: data.event_data || {},
        session_id: data.session_id,
        path: data.path || '/'
      };

      await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
      });

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // Handle newsletter subscriber signup
    if (data.type === 'subscriber') {
      if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email required' }) };
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          source: data.source || 'website'
        })
      });

      // 201 = new subscriber, 409 = already exists (both are fine)
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown event type' }) };
  } catch (err) {
    console.error('Track error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
