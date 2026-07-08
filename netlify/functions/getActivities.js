// netlify/functions/getActivities.js
// 매니저 대시보드에서 모든 학생의 활동 누적 기록을 한 번에 불러오기 위한 함수
// (userkey를 넘기면 특정 학생 1명의 기록만 조회 가능)
exports.handler = async (event) => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

    const userkey = event.queryStringParameters && event.queryStringParameters.userkey;
    const url = userkey
      ? `${SUPABASE_URL}/rest/v1/user_activities?userkey=eq.${encodeURIComponent(userkey)}&select=*`
      : `${SUPABASE_URL}/rest/v1/user_activities?select=*&order=updated_at.desc`;

    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: 500, body: err };
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
