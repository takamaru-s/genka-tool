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

  const [menus, salesRecords, posOrderItems, ingredients, monthlyPurchases] = await Promise.all([
    prisma.menu.findMany({
      where: { userId: session.user.id },
      include: { category: true, components: { include: componentInclude } },
    }),
    // 出数登録
    prisma.menuSalesRecord.findMany({
      where: { userId: session.user.id, year, month },
    }),
    // POS注文明細（当月精算済セッションのみ）
    prisma.orderItem.findMany({
      where: {
        session: {
          userId: session.user.id,
          status: "paid",
          closedAt: { gte: startOfMonth, lte: endOfMonth },
        },
      },
      select: { menuId: true, quantity: true, unitPrice: true },
    }),
    prisma.ingredient.findMany({ where: { userId: session.user.id } }),
    prisma.monthlyPurchase.findMany({ where: { userId: session.user.id, year, month } }),
  ]);

  // POSデータをメニューごとに集計
  const posQtyMap: Record<string, number>   = {};
  const posSalesMap: Record<string, number> = {};
  for (const item of posOrderItems) {
    posQtyMap[item.menuId]   = (posQtyMap[item.menuId]   ?? 0) + item.quantity;
    posSalesMap[item.menuId] = (posSalesMap[item.menuId] ?? 0) + item.quantity * item.unitPrice;
  }

  // 出数登録をメニューごとに集計
  const manualQtyMap: Record<string, number> = {};
  for (const r of salesRecords) {
    manualQtyMap[r.menuId] = (manualQtyMap[r.menuId] ?? 0) + r.quantity;
  }

  const soldMenus = menus
    .map((menu) => {
      const posQty    = posQtyMap[menu.id]    ?? 0;
      const manualQty = manualQtyMap[menu.id] ?? 0;
      const totalQty  = posQty + manualQty;

      const unitCost = calcMenuCost(menu.components as ComponentForCost[]);
      // POS売上は実際の販売単価×数量、出数登録は現在のメニュー価格×数量
      const revenue  = (posSalesMap[menu.id] ?? 0) + manualQty * menu.menuPrice;
      const stdCost  = unitCost * totalQty;

      return {
        menuId: menu.id,
        name: menu.name,
        category: menu.category ? { name: menu.category.name, color: menu.category.color } : null,
        menuPrice: menu.menuPrice,
        unitCost,
        costRate: menu.menuPrice > 0 ? (unitCost / menu.menuPrice) * 100 : 0,
        quantity: totalQty,
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

  // 実際の食材原価（在庫法）— N×2クエリを一括クエリに置換
  const [openingInventories, closingInventories] = await Promise.all([
    prisma.inventory.findMany({
      where: { userId: session.user.id, date: { lt: startOfMonth } },
      orderBy: { date: "desc" },
    }),
    prisma.inventory.findMany({
      where: { userId: session.user.id, date: { gte: startOfMonth, lte: endOfMonth } },
      orderBy: { date: "desc" },
    }),
  ]);

  const openingMap: Record<string, number> = {};
  for (const inv of openingInventories) {
    if (!(inv.ingredientId in openingMap)) openingMap[inv.ingredientId] = inv.quantity;
  }
  const closingMap: Record<string, number> = {};
  for (const inv of closingInventories) {
    if (!(inv.ingredientId in closingMap)) closingMap[inv.ingredientId] = inv.quantity;
  }

  let actualIngredientCost = 0;
  for (const ing of ingredients) {
    const unitPrice = ing.packagePrice / ing.packageSize;
    const purchase = monthlyPurchases.find((p) => p.ingredientId === ing.id);
    actualIngredientCost +=
      ((openingMap[ing.id] ?? 0) + (purchase?.quantity ?? 0) - (closingMap[ing.id] ?? 0)) * unitPrice;
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
