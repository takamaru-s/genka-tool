import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, ChefHat, ShoppingBasket, Layers } from "lucide-react";
import { formatCurrency, formatPercent, calcCostRate } from "@/lib/utils";
import { getCategoryColor } from "@/lib/category-colors";
import { calcMenuCost, componentInclude, ComponentForCost } from "@/lib/menu-cost";

export default async function MenuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { id } = await params;

  const menu = await prisma.menu.findFirst({
    where: { id, userId: session.user.id },
    include: { category: true, components: { include: componentInclude } },
  });
  if (!menu) notFound();

  const totalCost = calcMenuCost(menu.components as ComponentForCost[]);
  const costRate = calcCostRate(totalCost, menu.menuPrice);
  const catColor = menu.category ? getCategoryColor(menu.category.color) : null;

  const typeIcon = { recipe: ChefHat, ingredient: ShoppingBasket, menu: Layers };
  const typeLabel = { recipe: "レシピ", ingredient: "食材", menu: "セット" };
  const typeBg = { recipe: "bg-amber-100 text-amber-800", ingredient: "bg-blue-100 text-blue-800", menu: "bg-purple-100 text-purple-800" };

  return (
    <div>
      <div className="mb-6">
        <Link href="/menus" className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          メニュー一覧に戻る
        </Link>
        <div className="flex items-start justify-between">
          <div>
            {catColor && (
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border mb-2 ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                {menu.category!.name}
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{menu.name}</h1>
            {menu.description && <p className="text-gray-500 mt-1">{menu.description}</p>}
          </div>
          <Link href={`/menus/${menu.id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              編集
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>構成要素と原価内訳</CardTitle>
            </CardHeader>
            <CardContent>
              {menu.components.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">構成要素がありません</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-600">
                      <th className="text-left py-2 px-4 font-semibold">種別</th>
                      <th className="text-left py-2 px-4 font-semibold">品目</th>
                      <th className="text-right py-2 px-4 font-semibold">数量</th>
                      <th className="text-right py-2 px-4 font-semibold">原価</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menu.components.map((c) => {
                      const Icon = typeIcon[c.type as keyof typeof typeIcon] ?? ChefHat;
                      const bg = typeBg[c.type as keyof typeof typeBg] ?? "";
                      const label = typeLabel[c.type as keyof typeof typeLabel] ?? c.type;

                      let itemName = "-";
                      let unit = "";
                      let componentCost = 0;

                      if (c.type === "recipe" && c.recipe) {
                        itemName = c.recipe.name;
                        unit = c.recipe.yieldUnit;
                        const rc = c.recipe.ingredients.reduce(
                          (s, ri) => s + (ri.ingredient.packagePrice / ri.ingredient.packageSize) * ri.quantity, 0
                        );
                        componentCost = c.recipe.yieldQuantity > 0 ? (rc / c.recipe.yieldQuantity) * c.quantity : 0;
                      } else if (c.type === "ingredient" && c.ingredient) {
                        itemName = c.ingredient.name;
                        unit = c.ingredient.unit;
                        componentCost = (c.ingredient.packagePrice / c.ingredient.packageSize) * c.quantity;
                      } else if (c.type === "menu" && c.subMenu) {
                        itemName = c.subMenu.name;
                        unit = "品";
                        componentCost = calcMenuCost((c.subMenu as { components: ComponentForCost[] }).components) * c.quantity;
                      }

                      return (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bg}`}>
                              <Icon className="h-3 w-3" />
                              {label}
                            </span>
                          </td>
                          <td className="py-2 px-4 font-medium text-gray-900">{itemName}</td>
                          <td className="py-2 px-4 text-right text-gray-600">{c.quantity.toLocaleString()} {unit}</td>
                          <td className="py-2 px-4 text-right font-medium text-amber-700">{formatCurrency(componentCost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                      <td className="py-3 px-4 text-gray-700" colSpan={3}>合計原価</td>
                      <td className="py-3 px-4 text-right text-amber-700">{formatCurrency(totalCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>原価サマリー</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-gray-600">販売価格</span>
                <span className="font-bold text-lg">{formatCurrency(menu.menuPrice)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-gray-600">合計原価</span>
                <span className="font-semibold text-amber-700">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between py-2 border-b items-center">
                <span className="text-sm text-gray-600">原価率</span>
                <span className={`font-bold text-xl ${costRate < 30 ? "text-green-600" : costRate < 40 ? "text-yellow-600" : "text-red-600"}`}>
                  {formatPercent(costRate)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-600">粗利</span>
                <span className="font-semibold text-green-700">{formatCurrency(menu.menuPrice - totalCost)}</span>
              </div>
              <div className="mt-2">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${costRate < 30 ? "bg-green-500" : costRate < 40 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(costRate, 100)}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
