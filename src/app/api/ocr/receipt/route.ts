import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  const setting = await prisma.setting.findUnique({
    where: { userId_key: { userId: session.user.id, key: "anthropicApiKey" } },
  });
  const apiKey = setting?.value || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "APIキーが設定されていません。設定ページで登録してください。" }, { status: 400 });
  }

  const { imageBase64, mediaType } = await req.json() as {
    imageBase64: string;
    mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  };

  if (!imageBase64) {
    return NextResponse.json({ error: "画像データがありません。" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType ?? "image/jpeg", data: imageBase64 },
          },
          {
            type: "text",
            text: `このレシートから食材・食品の購入情報を抽出してください。
以下のJSON形式のみで返答してください（説明文は不要）：
[
  {
    "name": "商品名（できるだけ短く）",
    "quantity": 数量（数値、不明なら1）,
    "unitPrice": 単価（円、数値）,
    "totalPrice": 合計金額（円、数値）
  }
]
- 食材・食品以外（消費税、割引、ポイントなど）は含めない
- 数量が不明な場合は1とする
- 単価が不明な場合はtotalPriceと同じ値にする
- 必ずJSONのみ返す`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // JSON部分を抽出
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "OCR結果を解析できませんでした。レシートをより鮮明に撮影してください。" }, { status: 422 });
  }

  try {
    const items = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "OCR結果の解析に失敗しました。" }, { status: 422 });
  }
}
