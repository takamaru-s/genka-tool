import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

  // 前年1月〜今年12月の全精算 + 出数登録を取得
  const [sessions, menus, manualRecords] = await Promise.all([
    prisma.tableSession.findMany({
      where: {
        userId: session.user.id,
        status: "paid",
        closedAt: { gte: new Date(year - 1, 0, 1), lt: new Date(year + 1, 0, 1) },
      },
      select: { totalAmount: true, guestCount: true, closedAt: true },
    }),
    prisma.menu.findMany({ where: { userId: session.user.id }, select: { id: true, menuPrice: true } }),
    prisma.menuSalesRecord.findMany({
      where: { userId: session.user.id, year: { in: [year - 1, year] } },
    }),
  ]);

  const menuPriceMap = Object.fromEntries(menus.map((m) => [m.id, m.menuPrice]));

  // 年・月ごとに集計
  type MonthStat = { sales: number; guests: number; sessions: number };
  const agg: Record<string, MonthStat> = {};

  for (const s of sessions) {
    if (!s.closedAt) continue;
    const y = s.closedAt.getFullYear();
    const m = s.closedAt.getMonth() + 1;
    const key = `${y}-${m}`;
    if (!agg[key]) agg[key] = { sales: 0, guests: 0, sessions: 0 };
    agg[key].sales += s.totalAmount;
    agg[key].guests += s.guestCount;
    agg[key].sessions += 1;
  }

  // 出数登録の売上を加算
  for (const r of manualRecords) {
    const key = `${r.year}-${r.month}`;
    if (!agg[key]) agg[key] = { sales: 0, guests: 0, sessions: 0 };
    agg[key].sales += r.quantity * (menuPriceMap[r.menuId] ?? 0);
  }

  const build = (y: number) =>
    Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const d = agg[`${y}-${m}`] ?? { sales: 0, guests: 0, sessions: 0 };
      return {
        month: m,
        sales: Math.round(d.sales),
        guests: d.guests,
        sessions: d.sessions,
        avgSpend: d.guests > 0 ? Math.round(d.sales / d.guests) : 0,
      };
    });

  return NextResponse.json({ thisYear: build(year), lastYear: build(year - 1), year });
}
