import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcMenuCost, componentInclude, ComponentForCost } from "@/lib/menu-cost";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  const { id } = await params;

  const menu = await prisma.menu.findFirst({
    where: { id, userId: session.user.id },
    include: { category: true, components: { include: componentInclude } },
  });
  if (!menu) return NextResponse.json({ error: "見つかりません。" }, { status: 404 });

  return NextResponse.json({ ...menu, totalCost: calcMenuCost(menu.components as ComponentForCost[]) });
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.menu.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "見つかりません。" }, { status: 404 });

  const body = await request.json();
  const { name, menuPrice, description, categoryId, components } = body;

  await prisma.menuComponent.deleteMany({ where: { menuId: id } });

  const menu = await prisma.menu.update({
    where: { id },
    data: {
      name,
      menuPrice: Number(menuPrice),
      description: description || null,
      categoryId: categoryId || null,
      updatedAt: new Date(),
      components: {
        create: (components || []).map((c: { type: string; recipeId?: string; ingredientId?: string; subMenuId?: string; quantity: number }) => ({
          type: c.type,
          recipeId: c.recipeId || null,
          ingredientId: c.ingredientId || null,
          subMenuId: c.subMenuId || null,
          quantity: Number(c.quantity),
        })),
      },
    },
    include: { category: true, components: { include: componentInclude } },
  });

  return NextResponse.json({ ...menu, totalCost: calcMenuCost(menu.components as ComponentForCost[]) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.menu.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "見つかりません。" }, { status: 404 });

  await prisma.menu.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
