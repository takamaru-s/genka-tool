import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const recipes = await prisma.recipe.findMany({
    where: { userId: session.user.id },
    include: {
      ingredients: { include: { ingredient: true } },
    },
    orderBy: { name: "asc" },
  });

  const header = "レシピ名,説明,仕上がり量,仕上がり単位,合計原価（円）,単位原価（円）\r\n";
  const rows = recipes.map((recipe) => {
    const totalCost = recipe.ingredients.reduce((sum, ri) => {
      return sum + (ri.ingredient.packagePrice / ri.ingredient.packageSize) * ri.quantity;
    }, 0);
    const yieldQty = recipe.yieldQuantity ?? 1;
    const costPerYield = yieldQty > 0 ? totalCost / yieldQty : 0;
    return [
      `"${recipe.name}"`,
      `"${recipe.description ?? ""}"`,
      yieldQty,
      recipe.yieldUnit ?? "g",
      totalCost.toFixed(0),
      costPerYield.toFixed(2),
    ].join(",");
  });

  const bom = "﻿";
  const csv = bom + header + rows.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recipes_${today()}.csv"`,
    },
  });
}

function today() {
  return new Date().toISOString().split("T")[0].replace(/-/g, "");
}
