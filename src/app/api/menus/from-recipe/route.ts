import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipeId } = await req.json() as { recipeId: string };

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId: session.user.id },
  });
  if (!recipe) return NextResponse.json({ error: "レシピが見つかりません" }, { status: 404 });

  // 同名メニューが既に存在するか確認
  const existing = await prisma.menu.findFirst({
    where: { userId: session.user.id, name: recipe.name },
  });
  if (existing) {
    return NextResponse.json({ error: "同名のメニューが既に存在します", menuId: existing.id }, { status: 409 });
  }

  const menu = await prisma.menu.create({
    data: {
      userId: session.user.id,
      name: recipe.name,
      menuPrice: recipe.menuPrice,
      description: recipe.description,
      categoryId: recipe.categoryId,
      components: {
        create: {
          type: "recipe",
          recipeId: recipe.id,
          quantity: 1,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, menuId: menu.id });
}
