import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tableSession = await prisma.tableSession.findFirst({
    where: { id, userId: session.user.id, status: "open" },
    include: { orderItems: true },
  });
  if (!tableSession) return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // MenuSalesRecord に加算
  await Promise.all(
    tableSession.orderItems.map((item) =>
      prisma.menuSalesRecord.upsert({
        where: { userId_year_month_menuId: { userId: session.user.id, year, month, menuId: item.menuId } },
        update: { quantity: { increment: item.quantity } },
        create: { userId: session.user.id, year, month, menuId: item.menuId, quantity: item.quantity },
      })
    )
  );

  // セッションを閉じる
  await prisma.tableSession.updateMany({
    where: { id, userId: session.user.id },
    data: { status: "paid", closedAt: now },
  });

  return NextResponse.json({ ok: true });
}
