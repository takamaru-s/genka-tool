"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, ChefHat, ShoppingBasket, Layers } from "lucide-react";
import { formatCurrency, formatPercent, calcCostRate } from "@/lib/utils";
import { getCategoryColor } from "@/lib/category-colors";

interface Ingredient { id: string; name: string; unit: string; packageSize: number; packagePrice: number }
interface Recipe { id: string; name: string; yieldQuantity: number; yieldUnit: string; totalCost: number }
interface OtherMenu { id: string; name: string; totalCost: number }
interface Category { id: string; name: string; color: string }

type CompType = "recipe" | "ingredient" | "menu";
interface ComponentRow {
  _key: string;
  type: CompType;
  recipeId: string;
  ingredientId: string;
  subMenuId: string;
  quantity: string;
}

interface MenuFormProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
  otherMenus: OtherMenu[];
  categories: Category[];
  initialData?: {
    id: string;
    name: string;
    menuPrice: number;
    description: string | null;
    categoryId: string | null;
    components: { type: string; recipeId: string | null; ingredientId: string | null; subMenuId: string | null; quantity: number }[];
  };
}

let keyCounter = 0;
const newKey = () => String(keyCounter++);

function defaultRow(type: CompType, ingredients: Ingredient[], recipes: Recipe[], otherMenus: OtherMenu[]): ComponentRow {
  return {
    _key: newKey(),
    type,
    recipeId: recipes[0]?.id ?? "",
    ingredientId: ingredients[0]?.id ?? "",
    subMenuId: otherMenus[0]?.id ?? "",
    quantity: "",
  };
}

export function MenuForm({ ingredients, recipes, otherMenus, categories, initialData }: MenuFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [menuPrice, setMenuPrice] = useState(initialData?.menuPrice.toString() ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");
  const [components, setComponents] = useState<ComponentRow[]>(
    initialData?.components.map((c) => ({
      _key: newKey(),
      type: c.type as CompType,
      recipeId: c.recipeId ?? recipes[0]?.id ?? "",
      ingredientId: c.ingredientId ?? ingredients[0]?.id ?? "",
      subMenuId: c.subMenuId ?? otherMenus[0]?.id ?? "",
      quantity: String(c.quantity),
    })) ?? []
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getRecipe = useCallback((id: string) => recipes.find((r) => r.id === id), [recipes]);
  const getIngredient = useCallback((id: string) => ingredients.find((i) => i.id === id), [ingredients]);
  const getMenu = useCallback((id: string) => otherMenus.find((m) => m.id === id), [otherMenus]);

  const calcComponentCost = useCallback((row: ComponentRow): number => {
    const qty = parseFloat(row.quantity) || 0;
    if (row.type === "recipe") {
      const r = getRecipe(row.recipeId);
      if (!r || r.yieldQuantity <= 0) return 0;
      return (r.totalCost / r.yieldQuantity) * qty;
    }
    if (row.type === "ingredient") {
      const i = getIngredient(row.ingredientId);
      if (!i) return 0;
      return (i.packagePrice / i.packageSize) * qty;
    }
    if (row.type === "menu") {
      const m = getMenu(row.subMenuId);
      if (!m) return 0;
      return m.totalCost * qty;
    }
    return 0;
  }, [getRecipe, getIngredient, getMenu]);

  const totalCost = components.reduce((s, c) => s + calcComponentCost(c), 0);
  const menuPriceNum = parseFloat(menuPrice) || 0;
  const costRate = calcCostRate(totalCost, menuPriceNum);
  const grossProfit = menuPriceNum - totalCost;

  const addRow = (type: CompType) => {
    if (type === "recipe" && recipes.length === 0) return;
    if (type === "ingredient" && ingredients.length === 0) return;
    if (type === "menu" && otherMenus.length === 0) return;
    setComponents((prev) => [...prev, defaultRow(type, ingredients, recipes, otherMenus)]);
  };

  const updateRow = (key: string, field: keyof ComponentRow, value: string) => {
    setComponents((prev) => prev.map((c) => c._key === key ? { ...c, [field]: value } : c));
  };

  const removeRow = (key: string) => {
    setComponents((prev) => prev.filter((c) => c._key !== key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const payload = {
        name,
        menuPrice: parseFloat(menuPrice),
        description: description || null,
        categoryId: categoryId || null,
        components: components
          .filter((c) => {
            const qty = parseFloat(c.quantity);
            if (!qty || qty <= 0) return false;
            if (c.type === "recipe") return !!c.recipeId;
            if (c.type === "ingredient") return !!c.ingredientId;
            if (c.type === "menu") return !!c.subMenuId;
            return false;
          })
          .map((c) => ({
            type: c.type,
            recipeId: c.type === "recipe" ? c.recipeId : null,
            ingredientId: c.type === "ingredient" ? c.ingredientId : null,
            subMenuId: c.type === "menu" ? c.subMenuId : null,
            quantity: parseFloat(c.quantity),
          })),
      };
      const url = isEditing ? `/api/menus/${initialData.id}` : "/api/menus";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "保存に失敗しました。"); return; }
      router.push(`/menus/${data.id}`);
      router.refresh();
    } catch {
      setError("保存中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const typeLabel: Record<CompType, string> = { recipe: "レシピ", ingredient: "食材", menu: "セット" };
  const typeBg: Record<CompType, string> = {
    recipe: "bg-amber-100 text-amber-800",
    ingredient: "bg-blue-100 text-blue-800",
    menu: "bg-purple-100 text-purple-800",
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/menus" className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          メニュー一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? "メニューの編集" : "メニューの新規作成"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報 */}
            <Card>
              <CardHeader>
                <CardTitle>基本情報</CardTitle>
                <CardDescription>メニューの名称と販売価格を入力してください</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">メニュー名 *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: ランチセットA" required disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="menuPrice">販売価格 *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
                    <Input id="menuPrice" type="number" min="0" step="1" placeholder="例: 980" value={menuPrice}
                      onChange={(e) => setMenuPrice(e.target.value)} required disabled={isLoading} className="pl-7" />
                  </div>
                </div>
                {categories.length > 0 && (
                  <div className="space-y-2">
                    <Label>カテゴリ (任意)</Label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={isLoading}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">未分類</option>
                      {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    {categoryId && (() => {
                      const cat = categories.find((c) => c.id === categoryId);
                      if (!cat) return null;
                      const color = getCategoryColor(cat.color);
                      return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}>{cat.name}</span>;
                    })()}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="description">説明 (任意)</Label>
                  <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="例: 平日ランチ限定" disabled={isLoading} />
                </div>
              </CardContent>
            </Card>

            {/* 構成要素 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>構成要素</CardTitle>
                    <CardDescription>レシピ・食材・他メニュー（セット）を組み合わせてください</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {components.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg text-gray-400 text-sm">
                    下のボタンから構成要素を追加してください
                  </div>
                ) : (
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1">
                      <div className="col-span-2">種別</div>
                      <div className="col-span-5">品目</div>
                      <div className="col-span-3">数量</div>
                      <div className="col-span-1 text-right">原価</div>
                      <div className="col-span-1"></div>
                    </div>
                    {components.map((row) => {
                      const cost = calcComponentCost(row);
                      const recipe = row.type === "recipe" ? getRecipe(row.recipeId) : null;
                      const ingredient = row.type === "ingredient" ? getIngredient(row.ingredientId) : null;
                      const subMenu = row.type === "menu" ? getMenu(row.subMenuId) : null;
                      const unit = recipe ? recipe.yieldUnit : ingredient ? ingredient.unit : "品";
                      return (
                        <div key={row._key} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-2">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${typeBg[row.type]}`}>
                              {typeLabel[row.type]}
                            </span>
                          </div>
                          <div className="col-span-5">
                            {row.type === "recipe" && (
                              <select value={row.recipeId} onChange={(e) => updateRow(row._key, "recipeId", e.target.value)} disabled={isLoading}
                                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                              </select>
                            )}
                            {row.type === "ingredient" && (
                              <select value={row.ingredientId} onChange={(e) => updateRow(row._key, "ingredientId", e.target.value)} disabled={isLoading}
                                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                              </select>
                            )}
                            {row.type === "menu" && (
                              <select value={row.subMenuId} onChange={(e) => updateRow(row._key, "subMenuId", e.target.value)} disabled={isLoading}
                                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {otherMenus.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                            )}
                          </div>
                          <div className="col-span-3 relative">
                            <Input type="number" min="0" step="any" placeholder="0" value={row.quantity}
                              onChange={(e) => updateRow(row._key, "quantity", e.target.value)} disabled={isLoading} className="pr-8 text-right" />
                            {row.type !== "menu" && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>
                            )}
                          </div>
                          <div className="col-span-1 text-right text-xs font-medium text-amber-700">
                            {cost > 0 ? formatCurrency(cost) : "-"}
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500"
                              onClick={() => removeRow(row._key)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => addRow("recipe")} disabled={isLoading || recipes.length === 0}>
                    <ChefHat className="h-4 w-4 mr-1" />
                    レシピを追加
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addRow("ingredient")} disabled={isLoading || ingredients.length === 0}>
                    <ShoppingBasket className="h-4 w-4 mr-1" />
                    食材を追加
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addRow("menu")} disabled={isLoading || otherMenus.length === 0}>
                    <Layers className="h-4 w-4 mr-1" />
                    メニューを追加（セット）
                  </Button>
                </div>
                {recipes.length === 0 && ingredients.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2">先にレシピまたは食材を登録してください。</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* サイドバー：原価計算 */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>原価計算</CardTitle>
                <CardDescription>リアルタイムで原価を計算</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">販売価格</span>
                    <span className="font-semibold">{menuPriceNum > 0 ? formatCurrency(menuPriceNum) : "-"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">合計原価</span>
                    <span className="font-semibold text-amber-700">{totalCost > 0 ? formatCurrency(totalCost) : "-"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">原価率</span>
                    <span className={`font-bold text-lg ${costRate < 30 ? "text-green-600" : costRate < 40 ? "text-yellow-600" : "text-red-600"}`}>
                      {menuPriceNum > 0 ? formatPercent(costRate) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">粗利</span>
                    <span className="font-semibold text-green-600">{menuPriceNum > 0 ? formatCurrency(grossProfit) : "-"}</span>
                  </div>
                </div>
                {menuPriceNum > 0 && totalCost > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${costRate < 30 ? "bg-green-500" : costRate < 40 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(costRate, 100)}%` }} />
                    </div>
                    <p className="text-xs text-center mt-2 text-gray-500">
                      {costRate < 30 ? "優良な原価率です" : costRate < 40 ? "適正な原価率です" : "原価率が高めです"}
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={isLoading}>
                  {isLoading ? "保存中..." : isEditing ? "更新する" : "作成する"}
                </Button>
                <Link href="/menus" className="w-full">
                  <Button type="button" variant="outline" className="w-full" disabled={isLoading}>キャンセル</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
