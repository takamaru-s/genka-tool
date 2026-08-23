import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCSV } from "@/lib/parse-csv";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  const { csv, mode } = await req.json() as { csv: string; mode: "skip" | "overwrite" };
  if (!csv) return NextResponse.json({ error: "CSVデータがありません。" }, { status: 400 });

  const text = csv.replace(/^﻿/, "");
  const rows = parseCSV(text);

  if (rows.length < 2) return NextResponse.json({ error: "データ行がありません。" }, { status: 400 });

  // Columns: レシピ名(0), 説明(1), 仕込み量(2), 仕込み単位(3), 食材名(4), 使用量(5)
  const dataRows = rows.slice(1);

  // Group rows by recipe name (column 0 of first occurrence per group)
  type RecipeGroup = {
    name: string;
    description: string;
    yieldQuantity: number | null;
    yieldUnit: string;
    ingredients: { name: string; quantity: number }[];
  };

  const recipeMap = new Map<string, RecipeGroup>();
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const lineNum = i + 2;

    const recipeName = row[0];
    if (!recipeName) { errors.push(`行${lineNum}: レシピ名が空です`); continue; }

    const ingredientName = row[4];
    const quantityStr = row[5];

    if (!recipeMap.has(recipeName)) {
      const yieldQtyStr = row[2];
      const yieldUnit = row[3] ?? "";
      const yieldQuantity = yieldQtyStr ? parseFloat(yieldQtyStr) : null;
      recipeMap.set(recipeName, {
        name: recipeName,
        description: row[1] ?? "",
        yieldQuantity: yieldQuantity && !isNaN(yieldQuantity) ? yieldQuantity : null,
        yieldUnit,
        ingredients: [],
      });
    }

    if (ingredientName) {
      const quantity = parseFloat(quantityStr);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push(`行${lineNum}: 使用量が無効です (${quantityStr})`);
        continue;
      }
      recipeMap.get(recipeName)!.ingredients.push({ name: ingredientName, quantity });
    }
  }

  // Fetch all ingredients for this user once
  const allIngredients = await prisma.ingredient.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });
  const ingredientByName = new Map(allIngredients.map((ing) => [ing.name, ing.id]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const group of recipeMap.values()) {
    const existing = await prisma.recipe.findFirst({
      where: { name: group.name, userId: session.user.id },
    });

    if (existing && mode === "skip") {
      skipped++;
      continue;
    }

    // Resolve ingredient IDs; skip unknown ingredients with an error note
    const resolvedIngredients: { ingredientId: string; quantity: number }[] = [];
    for (const ing of group.ingredients) {
      const ingId = ingredientByName.get(ing.name);
      if (!ingId) {
        errors.push(`レシピ「${group.name}」: 食材「${ing.name}」が見つかりません（先に食材を登録してください）`);
        continue;
      }
      resolvedIngredients.push({ ingredientId: ingId, quantity: ing.quantity });
    }

    if (existing) {
      // Overwrite: delete old ingredients, recreate
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
      await prisma.recipe.update({
        where: { id: existing.id },
        data: {
          description: group.description || undefined,
          yieldQuantity: group.yieldQuantity ?? undefined,
          yieldUnit: group.yieldUnit || undefined,
          ingredients: {
            create: resolvedIngredients,
          },
        },
      });
      updated++;
    } else {
      await prisma.recipe.create({
        data: {
          name: group.name,
          menuPrice: 0,
          description: group.description || undefined,
          yieldQuantity: group.yieldQuantity ?? undefined,
          yieldUnit: group.yieldUnit || undefined,
          userId: session.user.id,
          ingredients: {
            create: resolvedIngredients,
          },
        },
      });
      created++;
    }
  }

  return NextResponse.json({ created, updated, skipped, errors });
}
