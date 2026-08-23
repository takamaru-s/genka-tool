import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  const { id } = await params;
  const { quantity, note, unitPrice } = await request.json();

  const record = await prisma.inventory.findUnique({ where: { id } });
  if (!record || record.userId !== session.user.id) {
    return NextResponse.json({ error: "見つかりません。" }, { status: 404 });
  }

  const updated = await prisma.inventory.update({
    where: { id },
    data: {
      quantity: Number(quantity),
      note: note ?? null,
    },
    include: { ingredient: true },
  });

  if (unitPrice !== undefined && unitPrice !== null) {
    const ing = await prisma.ingredient.findFirst({
      where: { id: record.ingredientId, userId: session.user.id },
    });
    if (ing) {
      const currentUnitPrice = ing.packagePrice / ing.packageSize;
      const newUnitPrice = Number(unitPrice);
      if (Math.abs(newUnitPrice - currentUnitPrice) >= 0.001) {
        const newPackagePrice = newUnitPrice * ing.packageSize;
        await prisma.ingredient.update({
          where: { id: ing.id },
          data: { packagePrice: newPackagePrice },
        });
        await prisma.ingredientPriceHistory.create({
          data: {
            userId: session.user.id,
            ingredientId: ing.id,
            packagePrice: newPackagePrice,
            packageSize: ing.packageSize,
          },
        });
      }
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  const { id } = await params;

  const record = await prisma.inventory.findUnique({ where: { id } });
  if (!record || record.userId !== session.user.id) {
    return NextResponse.json({ error: "見つかりません。" }, { status: 404 });
  }

  await prisma.inventory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
