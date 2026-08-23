import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const inventories = await prisma.inventory.findMany({
    where: { userId: session.user.id },
    include: { ingredient: true },
    orderBy: { date: "desc" },
  });

  const header = "棚卸日,食材名,単位,在庫数,在庫評価額（円）,メモ\r\n";
  const rows = inventories.map((inv) => {
    const unitPrice = inv.ingredient.packagePrice / inv.ingredient.packageSize;
    const value = (unitPrice * inv.quantity).toFixed(0);
    const dateStr = new Date(inv.date).toLocaleDateString("ja-JP");
    return [
      `"${dateStr}"`,
      `"${inv.ingredient.name}"`,
      inv.ingredient.unit,
      inv.quantity,
      value,
      `"${inv.note ?? ""}"`,
    ].join(",");
  });

  const bom = "\uFEFF";
  const csv = bom + header + rows.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory_${today()}.csv"`,
    },
  });
}

function today() {
  return new Date().toISOString().split("T")[0].replace(/-/g, "");
}
