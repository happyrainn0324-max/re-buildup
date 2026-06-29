// netlify/functions/loadStars.js
// Supabase에서 특정 userkey의 별 데이터를 조회

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const userkey = event.queryStringParameters && event.queryStringParameters.userkey;
    if (!userkey) return { statusCode: 400, body: 'userkey required' };

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_stars?userkey=eq.${encodeURIComponent(userkey)}&select=total,sections,log`,
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
      // 데이터 없으면 기본값 반환
      return {
        statusCode: 200,
        body: JSON.stringify({ total: 0, sections: {}, log: [] })
      };
    }

    return { statusCode: 200, body: JSON.stringify(rows[0]) };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
