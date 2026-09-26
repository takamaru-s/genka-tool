import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from  = searchParams.get("from");
  const to    = searchParams.get("to");
  const unit  = searchParams.get("unit") ?? "day"; // "day" | "month"

  if (!from || !to) return NextResponse.json({ error: "from/to required" }, { status: 400 });

  const fromDate = new Date(from);
  const toDate   = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const fromYear  = fromDate.getFullYear();
  const fromMonth = fromDate.getMonth() + 1;
  const toYear    = toDate.getFullYear();
  const toMonth   = toDate.getMonth() + 1;

  const [sessions, menus, manualRecords] = await Promise.all([
    prisma.tableSession.findMany({
      where: {
        userId: session.user.id,
        status: "paid",
        closedAt: { gte: fromDate, lte: toDate },
      },
      select: { totalAmount: true, guestCount: true, closedAt: true },
    }),
    prisma.menu.findMany({ where: { userId: session.user.id }, select: { id: true, menuPrice: true } }),
    prisma.menuSalesRecord.findMany({
      where: {
        userId: session.user.id,
        OR: Array.from({ length: (toYear - fromYear) * 12 + toMonth - fromMonth + 1 }, (_, i) => {
          const y = fromYear + Math.floor((fromMonth - 1 + i) / 12);
          const m = ((fromMonth - 1 + i) % 12) + 1;
          return { year: y, month: m };
        }),
      },
    }),
  ]);

  const menuPriceMap = Object.fromEntries(menus.map((m) => [m.id, m.menuPrice]));

  type Row = { sales: number; guests: number; sessions: number };
  const agg: Record<string, Row> = {};

  for (const s of sessions) {
    if (!s.closedAt) continue;
    const d = s.closedAt;
    const key = unit === "month"
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!agg[key]) agg[key] = { sales: 0, guests: 0, sessions: 0 };
    agg[key].sales    += s.totalAmount;
    agg[key].guests   += s.guestCount;
    agg[key].sessions += 1;
  }

  // 出数登録の売上を月単位で加算（日別表示の場合は月末日のキーに集約）
  for (const r of manualRecords) {
    const monthKey = `${r.year}-${String(r.month).padStart(2, "0")}`;
    const key = unit === "month"
      ? monthKey
      : (() => {
          const lastDay = new Date(r.year, r.month, 0).getDate();
          return `${r.year}-${String(r.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        })();
    if (!agg[key]) agg[key] = { sales: 0, guests: 0, sessions: 0 };
    agg[key].sales += r.quantity * (menuPriceMap[r.menuId] ?? 0);
  }

  // 期間内の全キーを埋める（値0の日付も含める）
  const keys: string[] = [];
  if (unit === "month") {
    const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    while (cur <= end) {
      keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
      cur.setMonth(cur.getMonth() + 1);
    }
  } else {
    const cur = new Date(fromDate);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
      keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`);
      cur.setDate(cur.getDate() + 1);
    }
  }

  const rows = keys.map((key) => {
    const d = agg[key] ?? { sales: 0, guests: 0, sessions: 0 };
    return {
      key,
      sales:    Math.round(d.sales),
      guests:   d.guests,
      sessions: d.sessions,
      avgSpend: d.guests > 0 ? Math.round(d.sales / d.guests) : 0,
    };
  });

  return NextResponse.json({ rows, unit });
}
