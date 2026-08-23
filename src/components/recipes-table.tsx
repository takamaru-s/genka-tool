"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SortableTH } from "@/components/sortable-th";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { formatCurrency, formatUnitCost } from "@/lib/utils";
import { getCategoryColor } from "@/lib/category-colors";

interface RecipeRow {
  id: string;
  name: string;
  description: string | null;
  totalCost: number;
  yieldQuantity: number;
  yieldUnit: string;
  category: { id: string; name: string; color: string } | null;
}

type SortColumn = "name" | "totalCost" | "costPerUnit";

function sortRecipes(
  list: RecipeRow[],
  col: SortColumn | null,
  order: "asc" | "desc"
): RecipeRow[] {
  if (!col) return list;
  return [...list].sort((a, b) => {
    switch (col) {
      case "name":
        return order === "asc"
          ? a.name.localeCompare(b.name, "ja")
          : b.name.localeCompare(a.name, "ja");
      case "totalCost": {
        const diff = a.totalCost - b.totalCost;
        return order === "asc" ? diff : -diff;
      }
      case "costPerUnit": {
        const cpuA = a.yieldQuantity > 0 ? a.totalCost / a.yieldQuantity : 0;
        const cpuB = b.yieldQuantity > 0 ? b.totalCost / b.yieldQuantity : 0;
        const diff = cpuA - cpuB;
        return order === "asc" ? diff : -diff;
      }
      default:
        return 0;
    }
  });
}

export function RecipesTable({ recipes }: { recipes: RecipeRow[] }) {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (col: string) => {
    const c = col as SortColumn;
    if (sortColumn === c) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(c);
      setSortOrder("asc");
    }
  };

  const sorted = sortRecipes(recipes, sortColumn, sortOrder);
  const thBase = "py-3 px-4 font-semibold text-gray-600";

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <SortableTH
              column="name"
              label="レシピ名"
              sortColumn={sortColumn}
              sortOrder={sortOrder}
              onSort={handleSort}
              className={`${thBase} text-left`}
            />
            <th className={`${thBase} text-left`}>カテゴリ</th>
            <th className={`${thBase} text-right`}>仕上がり量</th>
            <SortableTH
              column="totalCost"
              label="合計原価"
              sortColumn={sortColumn}
              sortOrder={sortOrder}
              onSort={handleSort}
              className={`${thBase} text-right`}
            />
            <SortableTH
              column="costPerUnit"
              label="単位原価"
              sortColumn={sortColumn}
              sortOrder={sortOrder}
              onSort={handleSort}
              className={`${thBase} text-right`}
            />
            <th className={`${thBase} text-center`}>操作</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((recipe) => {
            const costPerUnit =
              recipe.yieldQuantity > 0 ? recipe.totalCost / recipe.yieldQuantity : 0;
            const catColor = recipe.category
              ? getCategoryColor(recipe.category.color)
              : null;

            return (
              <tr
                key={recipe.id}
                className="border-b last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <Link
                    href={`/recipes/${recipe.id}`}
                    className="font-medium text-gray-900 hover:text-blue-700 hover:underline"
                  >
                    {recipe.name}
                  </Link>
                  {recipe.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                      {recipe.description}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4">
                  {catColor ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${catColor.bg} ${catColor.text} ${catColor.border}`}
                    >
                      {recipe.category!.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">未分類</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-gray-600">
                  {recipe.yieldQuantity > 0
                    ? `${recipe.yieldQuantity.toLocaleString()}${recipe.yieldUnit}`
                    : "-"}
                </td>
                <td className="py-3 px-4 text-right font-medium text-amber-700">
                  {formatCurrency(recipe.totalCost)}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-blue-700">
                  {costPerUnit > 0
                    ? formatUnitCost(costPerUnit, recipe.yieldUnit)
                    : "-"}
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Link href={`/recipes/${recipe.id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        詳細
                      </Button>
                    </Link>
                    <Link href={`/recipes/${recipe.id}/edit`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        編集
                      </Button>
                    </Link>
                    <DeleteRecipeButton id={recipe.id} name={recipe.name} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
