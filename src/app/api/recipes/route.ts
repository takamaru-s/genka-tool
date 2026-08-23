import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcCostRate } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const recipes = await prisma.recipe.findMany({
      where: { userId: session.user.id },
      include: {
        category: true,
        ingredients: { include: { ingredient: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const recipesWithCost = recipes.map((recipe) => {
      const totalCost = recipe.ingredients.reduce((sum, ri) => {
        const costPerUnit =
          ri.ingredient.packagePrice / ri.ingredient.packageSize;
        return sum + costPerUnit * ri.quantity;
      }, 0);
      const costRate = calcCostRate(totalCost, recipe.menuPrice);
      return {
        ...recipe,
        totalCost,
        costRate,
        grossProfit: recipe.menuPrice - totalCost,
      };
    });

    return NextResponse.json(recipesWithCost);
  } catch (error) {
    console.error("Get recipes error:", error);
    return NextResponse.json(
      { error: "レシピの取得中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, categoryId, ingredients, yieldQuantity, yieldUnit } = body;

    if (!name) {
      return NextResponse.json(
        { error: "レシピ名は必須です。" },
        { status: 400 }
      );
    }

    const recipe = await prisma.recipe.create({
      data: {
        name,
        menuPrice: 0,
        description: description || null,
        categoryId: categoryId || null,
        userId: session.user.id,
        yieldQuantity: yieldQuantity ? Number(yieldQuantity) : 1,
        yieldUnit: yieldUnit || "g",
        ingredients: {
          create: (ingredients || []).map(
            (ri: { ingredientId: string; quantity: number }) => ({
              ingredientId: ri.ingredientId,
              quantity: ri.quantity,
            })
          ),
        },
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("Create recipe error:", error);
    return NextResponse.json(
      { error: "レシピの作成中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
