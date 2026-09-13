import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // 4クエリで一括取得（食材数×2の並列クエリを避けてSupabase接続数上限対策）
  const [ingredients, monthlyPurchases, openingInventories, closingInventories] = await Promise.all([
    prisma.ingredient.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
    prisma.monthlyPurchase.findMany({
      where: { userId: session.user.id, year, month },
    }),
    prisma.inventory.findMany({
      where: { userId: session.user.id, date: { lt: startOfMonth } },
      orderBy: { date: "desc" },
    }),
    prisma.inventory.findMany({
      where: { userId: session.user.id, date: { gte: startOfMonth, lte: endOfMonth } },
      orderBy: { date: "desc" },
    }),
  ]);

  // 食材ごとの最新棚卸をマップ化（orderBy desc なので先に見つかった方が最新）
  const openingMap: Record<string, number> = {};
  for (const inv of openingInventories) {
    if (!(inv.ingredientId in openingMap)) openingMap[inv.ingredientId] = inv.quantity;
  }
  const closingMap: Record<string, number> = {};
  for (const inv of closingInventories) {
    if (!(inv.ingredientId in closingMap)) closingMap[inv.ingredientId] = inv.quantity;
  }
  const purchaseMap: Record<string, number> = {};
  for (const p of monthlyPurchases) {
    purchaseMap[p.ingredientId] = p.quantity;
  }

  const rows = ingredients.map((ing) => {
    const unitPrice = ing.packageSize > 0 ? ing.packagePrice / ing.packageSize : 0;
    const openingQty = openingMap[ing.id] ?? 0;
    const closingQty = closingMap[ing.id] ?? 0;
    const purchaseQty = purchaseMap[ing.id] ?? 0;
    const usageQty = openingQty + purchaseQty - closingQty;
    return {
      ingredientId: ing.id,
      name: ing.name,
      unit: ing.unit,
      unitPrice,
      openingQty,
      purchaseQty,
      closingQty,
      usageQty,
      usageAmount: usageQty * unitPrice,
    };
  });

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { year, month, items } = await request.json() as {
    year: number;
    month: number;
    items: { ingredientId: string; quantity: number }[];
  };

  await Promise.all(
    items.map(({ ingredientId, quantity }) =>
      prisma.monthlyPurchase.upsert({
        where: {
          userId_year_month_ingredientId: {
            userId: session.user.id,
            year,
            month,
            ingredientId,
          },
        },
        update: { quantity: { increment: quantity } },
        create: { userId: session.user.id, year, month, ingredientId, quantity },
      })
    )
  );

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { year, month, items } = await request.json() as {
    year: number;
    month: number;
    items: { ingredientId: string; quantity: number }[];
  };

  await Promise.all(
    items.map(({ ingredientId, quantity }) =>
      prisma.monthlyPurchase.upsert({
        where: {
          userId_year_month_ingredientId: {
            userId: session.user.id,
            year,
            month,
            ingredientId,
          },
        },
        update: { quantity },
        create: { userId: session.user.id, year, month, ingredientId, quantity },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
