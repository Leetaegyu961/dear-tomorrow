import { NextRequest, NextResponse } from "next/server";

const DEFAULT_COLOR = { color_hex: "#CCCCCC", color_name: "회색" };

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json(DEFAULT_COLOR);

  const { diary } = await req.json();
  if (!diary) return NextResponse.json(DEFAULT_COLOR);

  const prompt = `You are a color therapist who translates human emotions into vivid, meaningful colors.

Given a Korean diary entry, pick ONE color that captures the dominant emotional tone. Be emotionally accurate and expressive — do NOT default to gray or neutral colors unless the writer explicitly feels empty, numb, or emotionless.

Rules:
- Respond with ONLY a raw JSON object. No markdown, no code blocks, no extra text.
- "color_hex" must be a valid 6-digit hex color (e.g. "#FFD580")
- "color_name" must be a poetic Korean color description (2-6 Korean characters), e.g. "따뜻한 노란빛", "설레는 분홍"
- Choose VIVID, EMOTIONALLY RESONANT colors. Gray (#808080, #CCCCCC, etc.) is only for truly empty or numb feelings.

Emotion → Color examples:
- 행복, 기쁨, 설렘 → warm yellows (#FFD580), bright oranges (#FFA040), sunny golds
- 사랑, 두근거림 → pinks (#FF8FAB), warm reds (#FF6B6B), rose (#F2789F)
- 평온, 안정 → soft blues (#87CEEB), sage greens (#A8C5A0), gentle teals
- 슬픔, 그리움 → deep blues (#5B8DB8), muted indigo (#8B9DC3), lavender
- 분노, 짜증 → intense reds (#D94F3D), dark oranges (#E07020)
- 피곤, 무기력 → warm grays (#B0A898), dusty mauves (#C4A882)
- 불안, 긴장 → murky greens (#8FAF6A), unsettled purples (#9B7EC8)
- 설레는 기대 → bright coral (#FF7F6E), vibrant peach (#FFAA80)

Korean diary: "${diary}"

JSON only:`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 1.2,
            maxOutputTokens: 80,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!res.ok) return NextResponse.json(DEFAULT_COLOR);

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return NextResponse.json(DEFAULT_COLOR);

    const parsed = JSON.parse(match[0]);
    const color_hex =
      typeof parsed.color_hex === "string" && /^#[0-9A-Fa-f]{6}$/.test(parsed.color_hex)
        ? parsed.color_hex
        : DEFAULT_COLOR.color_hex;
    const color_name =
      typeof parsed.color_name === "string" && parsed.color_name.length > 0
        ? parsed.color_name
        : DEFAULT_COLOR.color_name;

    return NextResponse.json({ color_hex, color_name });
  } catch {
    return NextResponse.json(DEFAULT_COLOR);
  }
}
