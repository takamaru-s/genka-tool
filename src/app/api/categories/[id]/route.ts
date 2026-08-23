import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "カテゴリ名を入力してください。" }, { status: 400 });
  }

  const existing = await prisma.recipeCategory.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const category = await prisma.recipeCategory.update({
      where: { id },
      data: { name: name.trim(), color: color ?? existing.color },
    });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "同じ名前のカテゴリが既に存在します。" }, { status: 409 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.recipeCategory.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recipeCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
