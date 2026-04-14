// ============================================================
//  RE-BUILD-UP | 진로설계 AI 상담 — Netlify Serverless Function
//  파일 위치: netlify/functions/claude.js
//  Anthropic API 키는 Netlify 환경변수(ANTHROPIC_API_KEY)에서 불러옴
// ============================================================

const https = require("https");

// ── 시스템 프롬프트 (진로설계 AI 멘토) ──────────────────────
const SYSTEM_PROMPT = `
당신은 RE-BUILD-UP 플랫폼의 진로설계 AI 멘토입니다.
회복탄력성을 기반으로 사용자의 진로를 함께 설계해 주는 따뜻하고 전문적인 상담사입니다.

[역할]
- 사용자의 강점, 관심사, 경험을 탐색하여 진로 방향을 제안합니다.
- 실패나 좌절 경험을 긍정적인 성장 자원으로 재해석하도록 도와줍니다.
- 구체적이고 실행 가능한 다음 단계를 제안합니다.
- 질문은 한 번에 하나씩, 대화를 자연스럽게 이어갑니다.

[대화 스타일]
- 따뜻하고 공감적인 말투를 사용합니다.
- 전문 용어보다 쉬운 언어로 설명합니다.
- 응답은 3~5문장 내외로 간결하게 합니다.
- 이모지를 적절히 활용합니다.

[금지 사항]
- 진로와 무관한 주제(정치, 종교, 의료 진단 등)에는 답하지 않습니다.
- 특정 회사나 학교를 단정적으로 추천하지 않습니다.
`;

// ── CORS 허용 헤더 ───────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// ── Anthropic API 호출 (SDK 없이 https 모듈 사용) ────────────
function callAnthropic(apiKey, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("API 응답 파싱 실패: " + data));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── 메인 핸들러 ──────────────────────────────────────────────
exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  // POST만 허용
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "POST 요청만 허용됩니다." }),
    };
  }

  // API 키 확인
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "서버 설정 오류입니다. 관리자에게 문의하세요." }),
    };
  }

  // 요청 파싱
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "잘못된 요청 형식입니다." }),
    };
  }

  const { message, history = [] } = payload;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "message 필드가 필요합니다." }),
    };
  }

  // 대화 히스토리 + 새 메시지 조합
  const messages = [
    ...history.slice(-10), // 최근 10턴만 유지 (토큰 절약)
    { role: "user", content: message.trim() },
  ];

  // Anthropic 호출
  let apiResponse;
  try {
    apiResponse = await callAnthropic(apiKey, messages);
  } catch (err) {
    console.error("Anthropic API 호출 오류:", err.message);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "AI 서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요." }),
    };
  }

  // API 오류 처리
  if (apiResponse.error) {
    console.error("Anthropic 오류:", apiResponse.error);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "AI 응답 오류: " + apiResponse.error.message }),
    };
  }

  // 정상 응답 반환
  const reply = apiResponse.content?.[0]?.text || "응답을 받지 못했습니다.";

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      reply,
      // 클라이언트가 히스토리를 유지할 수 있도록 assistant 메시지도 반환
      assistantMessage: { role: "assistant", content: reply },
    }),
  };
};
