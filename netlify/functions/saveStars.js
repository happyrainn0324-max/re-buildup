// netlify/functions/saveStars.js
// 별 데이터를 Supabase user_stars 테이블에 upsert

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userkey, total, sections, log } = JSON.parse(event.body || '{}');
    if (!userkey) return { statusCode: 400, body: 'userkey required' };

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_stars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'   // upsert
      },
      body: JSON.stringify({
        userkey,
        total: total || 0,
        sections: sections || {},
        log: (log || []).slice(0, 200),
        updated_at: new Date().toISOString()
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: 500, body: err };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
