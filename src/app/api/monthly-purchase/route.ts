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

  const [ingredients, monthlyPurchases] = await Promise.all([
    prisma.ingredient.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
    prisma.monthlyPurchase.findMany({
      where: { userId: session.user.id, year, month },
    }),
  ]);

  const rows = await Promise.all(
    ingredients.map(async (ing) => {
      const [openingInventory, closingInventory] = await Promise.all([
        prisma.inventory.findFirst({
          where: {
            userId: session.user.id,
            ingredientId: ing.id,
            date: { lt: startOfMonth },
          },
          orderBy: { date: "desc" },
        }),
        prisma.inventory.findFirst({
          where: {
            userId: session.user.id,
            ingredientId: ing.id,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          orderBy: { date: "desc" },
        }),
      ]);

      const purchase = monthlyPurchases.find((p) => p.ingredientId === ing.id);
      const unitPrice = ing.packagePrice / ing.packageSize;
      const openingQty = openingInventory?.quantity ?? 0;
      const closingQty = closingInventory?.quantity ?? 0;
      const purchaseQty = purchase?.quantity ?? 0;
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
    })
  );

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
