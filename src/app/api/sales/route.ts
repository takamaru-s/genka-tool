import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcMenuCost, componentInclude, ComponentForCost } from "@/lib/menu-cost";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  const [menus, salesRecords] = await Promise.all([
    prisma.menu.findMany({
      where: { userId: session.user.id },
      include: { category: true, components: { include: componentInclude } },
      orderBy: { name: "asc" },
    }),
    prisma.menuSalesRecord.findMany({
      where: { userId: session.user.id, year, month },
    }),
  ]);

  const rows = menus.map((menu) => {
    const totalCost = calcMenuCost(menu.components as ComponentForCost[]);
    const record = salesRecords.find((s) => s.menuId === menu.id);
    return {
      menuId: menu.id,
      name: menu.name,
      category: menu.category ? { name: menu.category.name, color: menu.category.color } : null,
      menuPrice: menu.menuPrice,
      unitCost: totalCost,
      quantity: record?.quantity ?? 0,
    };
  });

  return NextResponse.json(rows);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { year, month, items } = await request.json() as {
    year: number;
    month: number;
    items: { menuId: string; quantity: number }[];
  };

  await Promise.all(
    items.map(({ menuId, quantity }) =>
      prisma.menuSalesRecord.upsert({
        where: { userId_year_month_menuId: { userId: session.user.id, year, month, menuId } },
        update: { quantity, updatedAt: new Date() },
        create: { userId: session.user.id, year, month, menuId, quantity },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
