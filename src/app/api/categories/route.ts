import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.recipeCategory.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { recipes: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "カテゴリ名を入力してください。" }, { status: 400 });
  }

  try {
    const category = await prisma.recipeCategory.create({
      data: { name: name.trim(), color: color ?? "blue", userId: session.user.id },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "同じ名前のカテゴリが既に存在します。" }, { status: 409 });
  }
}
