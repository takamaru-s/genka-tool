import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { CategoryFilter } from "@/components/category-filter";
import { RecipesTable } from "@/components/recipes-table";
import { ImportRecipesButton } from "@/components/import-recipes-button";

interface RecipesPageProps {
  searchParams: Promise<{ categoryId?: string }>;
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const { categoryId } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  let categoryFilter: object | undefined;
  if (categoryId === "none") categoryFilter = { categoryId: null };
  else if (categoryId) categoryFilter = { categoryId };

  const [recipes, categories] = await Promise.all([
    prisma.recipe.findMany({
      where: { userId: session.user.id, ...categoryFilter },
      include: {
        category: true,
        ingredients: { include: { ingredient: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.recipeCategory.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const recipesWithCost = recipes.map((recipe) => {
    const totalCost = recipe.ingredients.reduce((sum, ri) => {
      const costPerUnit = ri.ingredient.packagePrice / ri.ingredient.packageSize;
      return sum + costPerUnit * ri.quantity;
    }, 0);
    return {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      totalCost,
      yieldQuantity: recipe.yieldQuantity ?? 1,
      yieldUnit: recipe.yieldUnit ?? "g",
      category: recipe.category,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">レシピ管理</h1>
          <p className="text-gray-500 mt-1">レシピと原価を管理します</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportRecipesButton />
          <Link href="/recipes/new">
            <Button className="bg-blue-700 hover:bg-blue-800">
              <Plus className="h-4 w-4 mr-2" />
              新規作成
            </Button>
          </Link>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mb-4">
          <Suspense fallback={null}>
            <CategoryFilter categories={categories} />
          </Suspense>
        </div>
      )}

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">
            レシピ一覧{" "}
            <span className="text-sm font-normal text-gray-500">
              ({recipesWithCost.length}件)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recipesWithCost.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {categoryId ? "このカテゴリのレシピはありません" : "レシピが登録されていません"}
              </p>
              {!categoryId && (
                <Link href="/recipes/new">
                  <Button className="bg-blue-700 hover:bg-blue-800">
                    <Plus className="h-4 w-4 mr-2" />
                    最初のレシピを作成する
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <RecipesTable recipes={recipesWithCost} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
