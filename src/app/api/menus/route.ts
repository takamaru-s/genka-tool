import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcMenuCost, componentInclude, ComponentForCost } from "@/lib/menu-cost";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  const menus = await prisma.menu.findMany({
    where: { userId: session.user.id },
    include: { category: true, components: { include: componentInclude } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    menus.map((m) => ({ ...m, totalCost: calcMenuCost(m.components as ComponentForCost[]) }))
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  const body = await request.json();
  const { name, menuPrice, description, categoryId, components } = body;

  if (!name || menuPrice === undefined) {
    return NextResponse.json({ error: "メニュー名と価格は必須です。" }, { status: 400 });
  }

  const menu = await prisma.menu.create({
    data: {
      name,
      menuPrice: Number(menuPrice),
      description: description || null,
      categoryId: categoryId || null,
      userId: session.user.id,
      components: {
        create: (components || []).map(
          (c: { type: string; recipeId?: string; ingredientId?: string; subMenuId?: string; quantity: number }) => ({
            type: c.type,
            recipeId: c.recipeId || null,
            ingredientId: c.ingredientId || null,
            subMenuId: c.subMenuId || null,
            quantity: Number(c.quantity),
          })
        ),
      },
    },
  });

  return NextResponse.json(menu, { status: 201 });
}
