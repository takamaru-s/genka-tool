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

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const [menus, salesRecords, ingredients, monthlyPurchases] = await Promise.all([
    prisma.menu.findMany({
      where: { userId: session.user.id },
      include: { category: true, components: { include: componentInclude } },
    }),
    prisma.menuSalesRecord.findMany({
      where: { userId: session.user.id, year, month },
    }),
    prisma.ingredient.findMany({ where: { userId: session.user.id } }),
    prisma.monthlyPurchase.findMany({ where: { userId: session.user.id, year, month } }),
  ]);

  const soldMenus = menus
    .map((menu) => {
      const record = salesRecords.find((s) => s.menuId === menu.id);
      const qty = record?.quantity ?? 0;
      const unitCost = calcMenuCost(menu.components as ComponentForCost[]);
      const revenue = menu.menuPrice * qty;
      const stdCost = unitCost * qty;
      return {
        menuId: menu.id,
        name: menu.name,
        category: menu.category ? { name: menu.category.name, color: menu.category.color } : null,
        menuPrice: menu.menuPrice,
        unitCost,
        costRate: menu.menuPrice > 0 ? (unitCost / menu.menuPrice) * 100 : 0,
        quantity: qty,
        revenue,
        stdCost,
      };
    })
    .filter((r) => r.quantity > 0);

  const totalRevenue = soldMenus.reduce((s, r) => s + r.revenue, 0);
  const sorted = [...soldMenus].sort((a, b) => b.revenue - a.revenue);
  let cumulative = 0;
  const withAbc = sorted.map((r) => {
    cumulative += r.revenue;
    const ratio = totalRevenue > 0 ? cumulative / totalRevenue : 0;
    const abc = ratio <= 0.7 ? "A" : ratio <= 0.9 ? "B" : "C";
    return { ...r, cumulativeRatio: ratio, abc };
  });

  let actualIngredientCost = 0;
  for (const ing of ingredients) {
    const unitPrice = ing.packagePrice / ing.packageSize;
    const [opening, closing] = await Promise.all([
      prisma.inventory.findFirst({
        where: { userId: session.user.id, ingredientId: ing.id, date: { lt: startOfMonth } },
        orderBy: { date: "desc" },
      }),
      prisma.inventory.findFirst({
        where: { userId: session.user.id, ingredientId: ing.id, date: { gte: startOfMonth, lte: endOfMonth } },
        orderBy: { date: "desc" },
      }),
    ]);
    const purchase = monthlyPurchases.find((p) => p.ingredientId === ing.id);
    actualIngredientCost += ((opening?.quantity ?? 0) + (purchase?.quantity ?? 0) - (closing?.quantity ?? 0)) * unitPrice;
  }

  const totalStdCost = soldMenus.reduce((s, r) => s + r.stdCost, 0);
  const variance = actualIngredientCost - totalStdCost;

  return NextResponse.json({
    recipes: withAbc,
    summary: {
      totalRevenue,
      totalStdCost,
      actualIngredientCost,
      variance,
      varianceRate: totalStdCost > 0 ? (variance / totalStdCost) * 100 : 0,
      hasInventoryData: actualIngredientCost > 0,
    },
  });
}
