import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export async function generatePlanWithAi(input: {
  recentReflections: Array<{ date: string; reflectionText: string; topTask: string }>;
  reflectionText: string;
  topTask: string;
}): Promise<{
  aiFeedback: string;
  followUpQuestion: string;
  suggestedDurationMinutes: number;
}> {
  const recentText = input.recentReflections
    .map(
      (r) =>
        `- ${r.date}\n  회고: ${r.reflectionText}\n  가장 중요한 일: ${r.topTask || "(없음)"}`,
    )
    .join("\n\n");

  const prompt = `당신은 따뜻하지만 간결한 저녁 회고 코치입니다.\n\n최근 맥락(최근 3개):\n${recentText || "(아직 없음)"}\n\n오늘 회고(자유 형식):\n${input.reflectionText}\n\n사용자가 내일 아침 가장 먼저 끝낼 일(초안):\n${input.topTask}\n\n아래 JSON만 출력하세요.\n\n스키마:\n{\n  \"aiFeedback\": string,                // 2-3문장\n  \"followUpQuestion\": string,          // 항상: \"이 작업에 얼마나 걸릴까요?\"\n  \"suggestedDurationMinutes\": number   // 30,60,90,120,180 중 하나 또는 30의 배수\n}\n\n가이드:\n- aiFeedback은 격려 + 구체적 1개 개선점\n- suggestedDurationMinutes는 작업명을 보고 현실적으로 추정(최소 30분, 최대 240분)\n- 한국어\n`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const block = msg.content?.[0];
  const text = block && block.type === "text" ? block.text : "{}";

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {};
  }

  const suggested = Number(parsed.suggestedDurationMinutes);
  const normalized =
    Number.isFinite(suggested) && suggested > 0
      ? Math.min(240, Math.max(30, Math.round(suggested / 30) * 30))
      : 60;

  return {
    aiFeedback:
      typeof parsed.aiFeedback === "string" && parsed.aiFeedback.trim().length
        ? parsed.aiFeedback.trim()
        : "오늘 하루를 잘 정리했어요. 내일의 한 가지를 선명하게 잡아두면 더 편안하게 시작할 수 있어요.",
    followUpQuestion:
      typeof parsed.followUpQuestion === "string" && parsed.followUpQuestion.trim().length
        ? parsed.followUpQuestion.trim()
        : "이 작업에 얼마나 걸릴까요?",
    suggestedDurationMinutes: normalized,
  };
}
