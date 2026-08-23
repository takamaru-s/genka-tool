import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit } from "lucide-react";
import { formatCurrency, formatUnitCost } from "@/lib/utils";
import { getCategoryColor } from "@/lib/category-colors";

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: session.user.id },
    include: {
      category: true,
      ingredients: {
        include: { ingredient: true },
        orderBy: { ingredient: { name: "asc" } },
      },
    },
  });

  if (!recipe) notFound();

  const ingredientCosts = recipe.ingredients.map((ri) => {
    const costPerUnit = ri.ingredient.packagePrice / ri.ingredient.packageSize;
    const cost = costPerUnit * ri.quantity;
    return { ...ri, costPerUnit, cost };
  });

  const totalCost = ingredientCosts.reduce((sum, ri) => sum + ri.cost, 0);
  const yieldQty = recipe.yieldQuantity ?? 1;
  const yieldUnit = recipe.yieldUnit ?? "g";
  const costPerYield = yieldQty > 0 ? totalCost / yieldQty : 0;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/recipes"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          レシピ一覧に戻る
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{recipe.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {recipe.category && (() => {
                const color = getCategoryColor(recipe.category!.color);
                return (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}>
                    {recipe.category!.name}
                  </span>
                );
              })()}
              {recipe.description && (
                <p className="text-gray-500 text-sm">{recipe.description}</p>
              )}
            </div>
          </div>
          <Link href={`/recipes/${id}/edit`}>
            <Button className="bg-blue-700 hover:bg-blue-800">
              <Edit className="h-4 w-4 mr-2" />
              編集
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>食材内訳</CardTitle>
            </CardHeader>
            <CardContent>
              {ingredientCosts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  食材が登録されていません
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">食材名</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">使用量</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">単価</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">原価</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientCosts.map((ri) => (
                      <tr key={ri.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{ri.ingredient.name}</td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {ri.quantity.toLocaleString()}{ri.ingredient.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatCurrency(ri.costPerUnit)}/{ri.ingredient.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-amber-700">
                          {formatCurrency(ri.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-amber-50">
                      <td colSpan={3} className="py-3 px-4 font-bold text-right">合計原価</td>
                      <td className="py-3 px-4 font-bold text-right text-amber-800">
                        {formatCurrency(totalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>原価サマリー</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">合計原価</span>
                  <span className="font-bold text-lg text-amber-700">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">仕上がり量</span>
                  <span className="font-semibold text-gray-700">
                    {yieldQty.toLocaleString()}{yieldUnit}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">単位あたり原価</span>
                  <span className="font-bold text-lg text-blue-700">
                    {costPerYield > 0 ? formatUnitCost(costPerYield, yieldUnit) : "-"}
                  </span>
                </div>
              </div>

              {costPerYield > 0 && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 text-center">
                  メニューで{yieldUnit}あたり {formatUnitCost(costPerYield, yieldUnit)} の原価がかかります
                </div>
              )}

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">登録日：</span>
                  {new Date(recipe.createdAt).toLocaleDateString("ja-JP")}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-medium text-gray-700">更新日：</span>
                  {new Date(recipe.updatedAt).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
