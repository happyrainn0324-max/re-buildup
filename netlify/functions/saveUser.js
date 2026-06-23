exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userkey, school, studentid, name } = JSON.parse(event.body);

    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ userkey, school, studentid, name })
    });

    return {
      statusCode: res.ok ? 200 : 500,
      body: JSON.stringify({ ok: res.ok })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
