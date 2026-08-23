import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  const setting = await prisma.setting.findUnique({ where: { key: "anthropicApiKey" } });
  const value = setting?.value ?? "";
  const masked = value.length > 8 ? value.slice(0, 8) + "•".repeat(Math.min(value.length - 8, 20)) : value;
  return NextResponse.json({ hasKey: value.length > 0, masked });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  const { apiKey } = await req.json();
  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "APIキーを入力してください。" }, { status: 400 });
  }

  await prisma.setting.upsert({
    where: { key: "anthropicApiKey" },
    create: { id: "anthropicApiKey", key: "anthropicApiKey", value: apiKey },
    update: { value: apiKey },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  await prisma.setting.deleteMany({ where: { key: "anthropicApiKey" } });
  return NextResponse.json({ success: true });
}
