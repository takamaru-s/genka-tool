import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBasket, BookOpen, UtensilsCrossed, Package } from "lucide-react";
import { formatCurrency, formatUnitCost } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;

  const [ingredientCount, recipes, menuCount] = await Promise.all([
    prisma.ingredient.count({ where: { userId } }),
    prisma.recipe.findMany({
      where: { userId },
      include: { ingredients: { include: { ingredient: true } } },
    }),
    prisma.menu.count({ where: { userId } }),
  ]);

  const recipeCount = recipes.length;

  const recipesWithCost = recipes.map((recipe) => {
    const totalCost = recipe.ingredients.reduce((sum, ri) => {
      const costPerUnit = ri.ingredient.packagePrice / ri.ingredient.packageSize;
      return sum + costPerUnit * ri.quantity;
    }, 0);
    const yieldQty = recipe.yieldQuantity ?? 1;
    const yieldUnit = recipe.yieldUnit ?? "g";
    return {
      id: recipe.id,
      name: recipe.name,
      totalCost,
      yieldQty,
      yieldUnit,
      costPerYield: yieldQty > 0 ? totalCost / yieldQty : 0,
    };
  });

  const totalCostSum = recipesWithCost.reduce((s, r) => s + r.totalCost, 0);

  const stats = [
    {
      title: "登録食材数",
      value: `${ingredientCount}品目`,
      icon: ShoppingBasket,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "仕込み品数（レシピ）",
      value: `${recipeCount}件`,
      icon: BookOpen,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "仕込み品原価合計",
      value: formatCurrency(totalCostSum),
      icon: Package,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "登録メニュー数",
      value: `${menuCount}件`,
      icon: UtensilsCrossed,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">
          ようこそ、{session.user.name}さん。今日も頑張りましょう！
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bg} p-2 rounded-lg`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {recipeCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">仕込み品（レシピ）原価サマリー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">レシピ名</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">仕上がり量</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">合計原価</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">単位原価</th>
                  </tr>
                </thead>
                <tbody>
                  {recipesWithCost.map((recipe) => (
                    <tr key={recipe.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{recipe.name}</td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {recipe.yieldQty.toLocaleString()}{recipe.yieldUnit}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-amber-700">
                        {formatCurrency(recipe.totalCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-700">
                        {recipe.costPerYield > 0
                          ? formatUnitCost(recipe.costPerYield, recipe.yieldUnit)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {recipeCount === 0 && ingredientCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ChefHatIcon className="h-16 w-16 text-amber-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              まずは食材とレシピを登録しましょう
            </h3>
            <p className="text-gray-500 text-sm max-w-sm">
              左のメニューから「食材管理」で食材を登録し、「レシピ管理」で仕込み品を作成すると、単位あたり原価を自動計算できます。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 11V6a3 3 0 016 0v5M9 11h6M9 11a4 4 0 00-4 4v1h14v-1a4 4 0 00-4-4M9 20h6"
      />
    </svg>
  );
}
