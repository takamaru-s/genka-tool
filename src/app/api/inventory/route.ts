import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const inventories = await prisma.inventory.findMany({
      where: { userId: session.user.id },
      include: { ingredient: true },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(inventories);
  } catch (error) {
    console.error("Get inventory error:", error);
    return NextResponse.json({ error: "取得中にエラーが発生しました。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const body = await request.json();
    const { date, rows } = body;

    if (!date || !rows || rows.length === 0) {
      return NextResponse.json({ error: "日付と在庫データは必須です。" }, { status: 400 });
    }

    type InventoryRowInput = { ingredientId: string; quantity: number; note?: string; unitPrice?: number };

    const created = await prisma.$transaction(
      rows.map((row: InventoryRowInput) =>
        prisma.inventory.create({
          data: {
            userId: session.user.id,
            date: new Date(date),
            ingredientId: row.ingredientId,
            quantity: Number(row.quantity),
            note: row.note || null,
          },
        })
      )
    );

    // 仕入単価が変わった行は価格履歴に記録して食材も更新
    for (const row of rows as InventoryRowInput[]) {
      if (row.unitPrice === undefined || row.unitPrice === null) continue;
      const ing = await prisma.ingredient.findFirst({
        where: { id: row.ingredientId, userId: session.user.id },
      });
      if (!ing) continue;
      const currentUnitPrice = ing.packagePrice / ing.packageSize;
      const newUnitPrice = Number(row.unitPrice);
      if (Math.abs(newUnitPrice - currentUnitPrice) < 0.001) continue;
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

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create inventory error:", error);
    return NextResponse.json({ error: "保存中にエラーが発生しました。" }, { status: 500 });
  }
}
