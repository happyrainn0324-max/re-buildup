// netlify/functions/loadActivity.js
// Supabase user_activities 테이블에서 특정 userkey의 활동 누적 기록을 조회
// (일기/스토리/체크인/버킷리스트/독서기록/포트폴리오/히어로/스탬프 등)

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const userkey = event.queryStringParameters && event.queryStringParameters.userkey;
    if (!userkey) return { statusCode: 400, body: 'userkey required' };

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

    const columns = [
      'responses', 'checkin', 'bucket', 'booklog', 'portfolio',
      'stamp', 'hero_score', 'hero_cards',
      'storylog', 'pf_strength', 'pf_mission'
    ].join(',');

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_activities?userkey=eq.${encodeURIComponent(userkey)}&select=${columns}`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: 500, body: err };
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) {
      // 서버에 기록이 없는 신규 사용자 — 빈 기본값 반환
      return {
        statusCode: 200,
        body: JSON.stringify({
          responses: {}, checkin: [], bucket: {}, booklog: [], portfolio: [],
          stamp: {}, hero_score: 0, hero_cards: 0,
          storylog: [], pf_strength: [], pf_mission: []
        })
      };
    }

    return { statusCode: 200, body: JSON.stringify(rows[0]) };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
