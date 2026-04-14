// ============================================================
//  RE-BUILD-UP | 진로설계 AI 상담 — Netlify Serverless Function
//  파일 위치: netlify/functions/claude.js
//  Anthropic API 키는 Netlify 환경변수(ANTHROPIC_API_KEY)에서 불러옴
// ============================================================

const https = require("https");

// ── 기본 시스템 프롬프트 ─────────────────────────────────────
const DEFAULT_SYSTEM_PROMPT = `
당신은 RE-BUILD-UP 플랫폼의 진로설계 AI 멘토입니다.
회복탄력성을 기반으로 사용자의 진로를 함께 설계해 주는 따뜻하고 전문적인 상담사입니다.
따뜻하고 공감적인 말투를 사용하며, 이모지를 적절히 활용합니다.
진로와 무관한 주제에는 답하지 않습니다.
`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function callAnthropic(apiKey, messages, systemPrompt, maxTokens) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens || 4000,
      system: systemPrompt,
      messages: messages,
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("API 응답 파싱 실패: " + data)); }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "POST 요청만 허용됩니다." }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "서버 설정 오류입니다. 관리자에게 문의하세요." }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "잘못된 요청 형식입니다." }) }; }

  const { message, history = [], systemOverride } = payload;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "message 필드가 필요합니다." }) };
  }

  // 진로 로드맵 요청이면 max_tokens 4000, 일반 상담은 1024
  const isRoadmap = systemOverride && systemOverride.length > 200;
  const maxTokens = isRoadmap ? 4000 : 1024;
  const systemPrompt = systemOverride || DEFAULT_SYSTEM_PROMPT;

  const messages = [
    ...history.slice(-10),
    { role: "user", content: message.trim() },
  ];

  let apiResponse;
  try {
    apiResponse = await callAnthropic(apiKey, messages, systemPrompt, maxTokens);
  } catch (err) {
    return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: "AI 서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요." }) };
  }

  if (apiResponse.error) {
    return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: "AI 응답 오류: " + apiResponse.error.message }) };
  }

  const reply = apiResponse.content?.[0]?.text || "응답을 받지 못했습니다.";

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ reply, assistantMessage: { role: "assistant", content: reply } }),
  };
};
