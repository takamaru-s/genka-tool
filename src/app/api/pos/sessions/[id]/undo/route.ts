import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tableSession = await prisma.tableSession.findFirst({
    where: { id, userId: session.user.id, status: "paid" },
    include: { orderItems: true },
  });
  if (!tableSession) return NextResponse.json({ error: "精算済みセッションが見つかりません" }, { status: 404 });

  const closedAt = tableSession.closedAt;
  if (!closedAt) return NextResponse.json({ error: "精算日時が不明です" }, { status: 400 });

  const year = closedAt.getFullYear();
  const month = closedAt.getMonth() + 1;

  // MenuSalesRecord から減算
  await Promise.all(
    tableSession.orderItems.map(async (item) => {
      const record = await prisma.menuSalesRecord.findUnique({
        where: { userId_year_month_menuId: { userId: session.user.id, year, month, menuId: item.menuId } },
      });
      if (!record) return;
      const newQty = record.quantity - item.quantity;
      if (newQty <= 0) {
        await prisma.menuSalesRecord.delete({
          where: { userId_year_month_menuId: { userId: session.user.id, year, month, menuId: item.menuId } },
        });
      } else {
        await prisma.menuSalesRecord.update({
          where: { userId_year_month_menuId: { userId: session.user.id, year, month, menuId: item.menuId } },
          data: { quantity: newQty },
        });
      }
    })
  );

  // セッションを再オープン
  await prisma.tableSession.updateMany({
    where: { id, userId: session.user.id },
    data: { status: "open", closedAt: null },
  });

  return NextResponse.json({ ok: true });
}
