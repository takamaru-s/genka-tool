import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tableSession = await prisma.tableSession.findFirst({
    where: { id, userId: session.user.id },
    include: {
      table: true,
      orderItems: { include: { menu: true } },
    },
  });

  if (!tableSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tableSession);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { items, guestCount } = await req.json() as {
    items: { menuId: string; quantity: number; unitPrice: number }[];
    guestCount?: number;
  };

  await prisma.orderItem.deleteMany({ where: { sessionId: id } });

  const validItems = items.filter((i) => i.quantity > 0);
  if (validItems.length > 0) {
    await prisma.orderItem.createMany({
      data: validItems.map((i) => ({ sessionId: id, menuId: i.menuId, quantity: i.quantity, unitPrice: i.unitPrice })),
    });
  }

  const totalAmount = validItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  await prisma.tableSession.updateMany({
    where: { id, userId: session.user.id },
    data: { totalAmount, ...(guestCount !== undefined ? { guestCount } : {}) },
  });

  return NextResponse.json({ ok: true });
}
