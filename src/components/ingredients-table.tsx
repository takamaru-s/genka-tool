"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SortableTH } from "@/components/sortable-th";
import { DeleteIngredientButton } from "@/components/delete-ingredient-button";
import { IngredientChartModal } from "@/components/ingredient-chart-modal";
import { formatCurrency } from "@/lib/utils";
import { LineChart } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  packageSize: number;
  packagePrice: number;
}

type SortColumn = "name" | "unit" | "packageSize" | "packagePrice" | "unitPrice";

function sortIngredients(
  list: Ingredient[],
  col: SortColumn | null,
  order: "asc" | "desc"
): Ingredient[] {
  if (!col) return list;
  return [...list].sort((a, b) => {
    let va: number | string;
    let vb: number | string;
    if (col === "unitPrice") {
      va = a.packagePrice / a.packageSize;
      vb = b.packagePrice / b.packageSize;
    } else {
      va = a[col];
      vb = b[col];
    }
    if (typeof va === "string" && typeof vb === "string") {
      return order === "asc" ? va.localeCompare(vb, "ja") : vb.localeCompare(va, "ja");
    }
    return order === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });
}

export function IngredientsTable({ ingredients }: { ingredients: Ingredient[] }) {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [chartTarget, setChartTarget] = useState<{ id: string; name: string } | null>(null);

  const handleSort = (col: string) => {
    const c = col as SortColumn;
    if (sortColumn === c) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(c);
      setSortOrder("asc");
    }
  };

  const sorted = sortIngredients(ingredients, sortColumn, sortOrder);

  const thBase = "py-3 px-4 font-semibold text-gray-600";

  return (
    <>
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <SortableTH
                column="name"
                label="名前"
                sortColumn={sortColumn}
                sortOrder={sortOrder}
                onSort={handleSort}
                className={`${thBase} text-left rounded-tl-lg`}
              />
              <SortableTH
                column="unit"
                label="単位"
                sortColumn={sortColumn}
                sortOrder={sortOrder}
                onSort={handleSort}
                className={`${thBase} text-center`}
              />
              <SortableTH
                column="packageSize"
                label="内容量"
                sortColumn={sortColumn}
                sortOrder={sortOrder}
                onSort={handleSort}
                className={`${thBase} text-right`}
              />
              <SortableTH
                column="packagePrice"
                label="仕入価格"
                sortColumn={sortColumn}
                sortOrder={sortOrder}
                onSort={handleSort}
                className={`${thBase} text-right`}
              />
              <SortableTH
                column="unitPrice"
                label="単価"
                sortColumn={sortColumn}
                sortOrder={sortOrder}
                onSort={handleSort}
                className={`${thBase} text-right`}
              />
              <th className={`${thBase} text-center rounded-tr-lg`}>操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ingredient) => {
              const unitPrice = ingredient.packagePrice / ingredient.packageSize;
              return (
                <tr
                  key={ingredient.id}
                  className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">{ingredient.name}</td>
                  <td className="py-3 px-4 text-center text-gray-600">{ingredient.unit}</td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {ingredient.packageSize.toLocaleString()}
                    {ingredient.unit}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {formatCurrency(ingredient.packagePrice)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-amber-700">
                    {formatCurrency(unitPrice)}/{ingredient.unit}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setChartTarget({ id: ingredient.id, name: ingredient.name })}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded"
                        title="棚卸グラフ"
                      >
                        <LineChart className="h-4 w-4" />
                      </button>
                      <Link href={`/ingredients/${ingredient.id}/edit`}>
                        <Button variant="outline" size="sm" className="text-xs">編集</Button>
                      </Link>
                      <DeleteIngredientButton id={ingredient.id} name={ingredient.name} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {chartTarget && (
        <IngredientChartModal
          ingredientId={chartTarget.id}
          ingredientName={chartTarget.name}
          onClose={() => setChartTarget(null)}
        />
      )}
    </>
  );
}
