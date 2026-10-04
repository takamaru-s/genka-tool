import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nowJST, jstDayStart, jstDayEnd } from "@/lib/jst";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { year, month, day } = nowJST();
  const startOfDay = jstDayStart(year, month, day);
  const endOfDay   = jstDayEnd(year, month, day);

  const sessions = await prisma.tableSession.findMany({
    where: {
      userId: session.user.id,
      status: "paid",
      closedAt: { gte: startOfDay, lt: endOfDay },
    },
    include: {
      table: { select: { name: true, number: true } },
      orderItems: { include: { menu: { select: { name: true } } } },
    },
    orderBy: { closedAt: "desc" },
  });

  return NextResponse.json(sessions);
}
