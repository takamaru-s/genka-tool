import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  const { id } = await params;

  const ingredient = await prisma.ingredient.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!ingredient) return NextResponse.json({ error: "見つかりません。" }, { status: 404 });

  const [priceRecords, inventoryRecords] = await Promise.all([
    prisma.ingredientPriceHistory.findMany({
      where: { ingredientId: id, userId: session.user.id },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.inventory.findMany({
      where: { ingredientId: id, userId: session.user.id },
      orderBy: { date: "asc" },
    }),
  ]);

  const currentUnitPrice = ingredient.packagePrice / ingredient.packageSize;

  const priceHistory = priceRecords.map((r) => ({
    date: new Date(r.recordedAt).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    packagePrice: r.packagePrice,
    packageSize: r.packageSize,
    unitPrice: r.packagePrice / r.packageSize,
  }));

  const inventoryHistory = inventoryRecords.map((r) => ({
    date: new Date(r.date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    quantity: r.quantity,
    value: Math.round(r.quantity * currentUnitPrice),
    note: r.note ?? "",
  }));

  return NextResponse.json({
    ingredient: {
      name: ingredient.name,
      unit: ingredient.unit,
      packageSize: ingredient.packageSize,
      packagePrice: ingredient.packagePrice,
      unitPrice: currentUnitPrice,
    },
    priceHistory,
    inventoryHistory,
  });
}
