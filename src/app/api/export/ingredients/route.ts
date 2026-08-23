import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const ingredients = await prisma.ingredient.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  const header = "食材名,単位,内容量,仕入価格（円）,単価（円）\r\n";
  const rows = ingredients.map((ing) => {
    const unitPrice = (ing.packagePrice / ing.packageSize).toFixed(2);
    return [
      `"${ing.name}"`,
      ing.unit,
      ing.packageSize,
      ing.packagePrice,
      unitPrice,
    ].join(",");
  });

  const bom = "\uFEFF";
  const csv = bom + header + rows.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ingredients_${today()}.csv"`,
    },
  });
}

function today() {
  return new Date().toISOString().split("T")[0].replace(/-/g, "");
}
