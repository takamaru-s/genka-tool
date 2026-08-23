import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const ingredient = await prisma.ingredient.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!ingredient) {
      return NextResponse.json(
        { error: "食材が見つかりません。" },
        { status: 404 }
      );
    }

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error("Get ingredient error:", error);
    return NextResponse.json(
      { error: "食材の取得中にエラーが発生しました。" },
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
    const { name, unit, packageSize, packagePrice } = body;

    if (!name || !unit || packageSize === undefined || packagePrice === undefined) {
      return NextResponse.json(
        { error: "すべての項目を入力してください。" },
        { status: 400 }
      );
    }

    const existing = await prisma.ingredient.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "食材が見つかりません。" },
        { status: 404 }
      );
    }

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: { name, unit, packageSize, packagePrice },
    });

    // 価格または内容量が変わった場合のみ履歴を追加
    const priceChanged =
      existing.packagePrice !== Number(packagePrice) ||
      existing.packageSize !== Number(packageSize);
    if (priceChanged) {
      await prisma.ingredientPriceHistory.create({
        data: {
          userId: session.user.id,
          ingredientId: id,
          packagePrice: Number(packagePrice),
          packageSize: Number(packageSize),
        },
      });
    }

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error("Update ingredient error:", error);
    return NextResponse.json(
      { error: "食材の更新中にエラーが発生しました。" },
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

    const existing = await prisma.ingredient.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "食材が見つかりません。" },
        { status: 404 }
      );
    }

    await prisma.ingredient.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete ingredient error:", error);
    return NextResponse.json(
      { error: "食材の削除中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
