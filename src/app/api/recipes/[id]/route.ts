import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcCostRate } from "@/lib/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: "レシピが見つかりません。" },
        { status: 404 }
      );
    }

    const totalCost = recipe.ingredients.reduce((sum, ri) => {
      const costPerUnit =
        ri.ingredient.packagePrice / ri.ingredient.packageSize;
      return sum + costPerUnit * ri.quantity;
    }, 0);

    const costRate = calcCostRate(totalCost, recipe.menuPrice);

    return NextResponse.json({
      ...recipe,
      totalCost,
      costRate,
      grossProfit: recipe.menuPrice - totalCost,
    });
  } catch (error) {
    console.error("Get recipe error:", error);
    return NextResponse.json(
      { error: "レシピの取得中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const existing = await prisma.recipe.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "レシピが見つかりません。" },
        { status: 404 }
      );
    }

    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: id },
    });

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        name,
        menuPrice: 0,
        description: description || null,
        categoryId: categoryId || null,
        yieldQuantity: yieldQuantity ? Number(yieldQuantity) : undefined,
        yieldUnit: yieldUnit || undefined,
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

    const totalCost = recipe.ingredients.reduce((sum, ri) => {
      const costPerUnit =
        ri.ingredient.packagePrice / ri.ingredient.packageSize;
      return sum + costPerUnit * ri.quantity;
    }, 0);

    return NextResponse.json({
      ...recipe,
      totalCost,
      costRate: calcCostRate(totalCost, recipe.menuPrice),
      grossProfit: recipe.menuPrice - totalCost,
    });
  } catch (error) {
    console.error("Update recipe error:", error);
    return NextResponse.json(
      { error: "レシピの更新中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const existing = await prisma.recipe.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "レシピが見つかりません。" },
        { status: 404 }
      );
    }

    await prisma.recipe.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete recipe error:", error);
    return NextResponse.json(
      { error: "レシピの削除中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
