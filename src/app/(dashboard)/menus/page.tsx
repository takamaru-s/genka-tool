import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, UtensilsCrossed, Pencil } from "lucide-react";
import { formatCurrency, formatPercent, calcCostRate } from "@/lib/utils";
import { getCategoryColor } from "@/lib/category-colors";
import { calcMenuCost, componentInclude, ComponentForCost } from "@/lib/menu-cost";

export default async function MenusPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const menus = await prisma.menu.findMany({
    where: { userId: session.user.id },
    include: { category: true, components: { include: componentInclude } },
    orderBy: { name: "asc" },
  });

  // Group by categoryId; named categories sorted alphabetically, uncategorized last
  const categoryMap = new Map<string | null, typeof menus>();
  for (const menu of menus) {
    const key = menu.categoryId ?? null;
    if (!categoryMap.has(key)) categoryMap.set(key, []);
    categoryMap.get(key)!.push(menu);
  }
  const groups = [...categoryMap.keys()]
    .sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      const nameA = menus.find((m) => m.categoryId === a)?.category?.name ?? "";
      const nameB = menus.find((m) => m.categoryId === b)?.category?.name ?? "";
      return nameA.localeCompare(nameB, "ja");
    })
    .map((key) => ({
      category: key ? menus.find((m) => m.categoryId === key)?.category ?? null : null,
      menus: categoryMap.get(key)!,
    }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メニュー管理</h1>
          <p className="text-sm text-gray-500 mt-1">レシピ・食材を組み合わせた最終メニューを管理します</p>
        </div>
        <Link href="/menus/new">
          <Button className="bg-green-700 hover:bg-green-800">
            <Plus className="h-4 w-4 mr-2" />
            新規メニュー
          </Button>
        </Link>
      </div>

      {menus.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UtensilsCrossed className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">メニューがまだ登録されていません</h3>
            <p className="text-gray-500 text-sm max-w-sm mb-6">
              レシピ（仕込み品）や食材を組み合わせてメニューを作成できます。
              セットメニューも登録可能です。
            </p>
            <Link href="/menus/new">
              <Button className="bg-green-700 hover:bg-green-800">
                <Plus className="h-4 w-4 mr-2" />
                最初のメニューを作成する
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group, gi) => {
            const catColor = group.category ? getCategoryColor(group.category.color) : null;
            return (
              <div key={gi}>
                <div className="flex items-center gap-3 mb-4">
                  {catColor ? (
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                      {group.category!.name}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-gray-400">未分類</span>
                  )}
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.menus.map((menu) => {
                    const totalCost = calcMenuCost(menu.components as ComponentForCost[]);
                    const costRate = calcCostRate(totalCost, menu.menuPrice);
                    return (
                      <Card key={menu.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base leading-tight">{menu.name}</CardTitle>
                              {menu.description && <p className="text-xs text-gray-500 mt-1 truncate">{menu.description}</p>}
                            </div>
                            <Link href={`/menus/${menu.id}/edit`}>
                              <button className="text-gray-400 hover:text-blue-600 transition-colors p-1">
                                <Pencil className="h-4 w-4" />
                              </button>
                            </Link>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">販売価格</span>
                              <span className="font-semibold">{formatCurrency(menu.menuPrice)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">原価</span>
                              <span className="font-semibold text-amber-700">{formatCurrency(totalCost)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">原価率</span>
                              <span className={`font-bold ${costRate < 30 ? "text-green-600" : costRate < 40 ? "text-yellow-600" : "text-red-600"}`}>
                                {formatPercent(costRate)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">粗利</span>
                              <span className="font-semibold text-green-700">{formatCurrency(menu.menuPrice - totalCost)}</span>
                            </div>
                            <div className="pt-2 border-t text-xs text-gray-400">
                              構成要素: {menu.components.length}件
                            </div>
                          </div>
                          <Link href={`/menus/${menu.id}`} className="block mt-3">
                            <Button variant="outline" size="sm" className="w-full">詳細を見る</Button>
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
