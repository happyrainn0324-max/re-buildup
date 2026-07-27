// netlify/functions/saveActivity.js
// 학생의 활동 누적 기록(일기/스토리/체크인/버킷리스트/독서기록/포트폴리오/히어로/스탬프)을
// Supabase user_activities 테이블에 upsert
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const {
      userkey, name, responses, checkin, bucket,
      booklog, portfolio, stamp, hero_score, hero_cards,
      storylog, pf_strength, pf_mission
    } = JSON.parse(event.body || '{}');

    if (!userkey) return { statusCode: 400, body: 'userkey required' };

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates' // upsert (userkey가 PK)
      },
      body: JSON.stringify({
        userkey,
        name: name || '',
        responses: responses || {},
        checkin: checkin || [],
        bucket: bucket || {},
        booklog: booklog || [],
        portfolio: portfolio || [],
        stamp: stamp || {},
        hero_score: hero_score || 0,
        hero_cards: hero_cards || 0,
        storylog: storylog || [],
        pf_strength: pf_strength || [],
        pf_mission: pf_mission || [],
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
