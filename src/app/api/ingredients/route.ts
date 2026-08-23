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

    const ingredients = await prisma.ingredient.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error("Get ingredients error:", error);
    return NextResponse.json(
      { error: "食材の取得中にエラーが発生しました。" },
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
    const { name, unit, packageSize, packagePrice } = body;

    if (!name || !unit || packageSize === undefined || packagePrice === undefined) {
      return NextResponse.json(
        { error: "すべての項目を入力してください。" },
        { status: 400 }
      );
    }

    if (packageSize <= 0) {
      return NextResponse.json(
        { error: "内容量は0より大きい値を入力してください。" },
        { status: 400 }
      );
    }

    if (packagePrice < 0) {
      return NextResponse.json(
        { error: "仕入価格は0以上の値を入力してください。" },
        { status: 400 }
      );
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        unit,
        packageSize,
        packagePrice,
        userId: session.user.id,
      },
    });

    // 登録時の初期価格を記録
    await prisma.ingredientPriceHistory.create({
      data: {
        userId: session.user.id,
        ingredientId: ingredient.id,
        packagePrice,
        packageSize,
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    console.error("Create ingredient error:", error);
    return NextResponse.json(
      { error: "食材の登録中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
