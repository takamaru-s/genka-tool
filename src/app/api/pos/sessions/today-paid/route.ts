import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);

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
