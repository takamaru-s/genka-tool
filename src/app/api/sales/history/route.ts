import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const yearFrom = parseInt(searchParams.get("yearFrom") ?? String(new Date().getFullYear()));
  const monthFrom = parseInt(searchParams.get("monthFrom") ?? "1");
  const yearTo = parseInt(searchParams.get("yearTo") ?? String(new Date().getFullYear()));
  const monthTo = parseInt(searchParams.get("monthTo") ?? String(new Date().getMonth() + 1));

  const months: { year: number; month: number; key: string }[] = [];
  let y = yearFrom, m = monthFrom;
  while (y < yearTo || (y === yearTo && m <= monthTo)) {
    months.push({ year: y, month: m, key: `${y}-${String(m).padStart(2, "0")}` });
    m++;
    if (m > 12) { m = 1; y++; }
    if (months.length > 36) break;
  }

  const [menus, salesRecords] = await Promise.all([
    prisma.menu.findMany({
      where: { userId: session.user.id },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.menuSalesRecord.findMany({
      where: {
        userId: session.user.id,
        OR: months.map(({ year, month }) => ({ year, month })),
      },
    }),
  ]);

  const rows = menus
    .map((menu) => {
      const monthlyQuantities: Record<string, number> = {};
      let total = 0;
      for (const { year, month, key } of months) {
        const rec = salesRecords.find((s) => s.menuId === menu.id && s.year === year && s.month === month);
        const qty = rec?.quantity ?? 0;
        monthlyQuantities[key] = qty;
        total += qty;
      }
      return {
        menuId: menu.id,
        name: menu.name,
        category: menu.category ? { name: menu.category.name, color: menu.category.color } : null,
        menuPrice: menu.menuPrice,
        monthlyQuantities,
        total,
      };
    })
    .filter((r) => r.total > 0);

  const monthlyTotals: Record<string, number> = {};
  for (const { key } of months) {
    monthlyTotals[key] = rows.reduce((s, r) => s + (r.monthlyQuantities[key] ?? 0), 0);
  }

  return NextResponse.json({ months: months.map((m) => m.key), rows, monthlyTotals });
}
