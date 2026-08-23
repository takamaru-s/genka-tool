"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatUnitCost } from "@/lib/utils";
import { getCategoryColor } from "@/lib/category-colors";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  packageSize: number;
  packagePrice: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface RecipeIngredientRow {
  ingredientId: string;
  quantity: string;
}

interface RecipeFormProps {
  ingredients: Ingredient[];
  categories: Category[];
  initialData?: {
    id: string;
    name: string;
    menuPrice: number;
    description: string | null;
    categoryId: string | null;
    yieldQuantity: number;
    yieldUnit: string;
    ingredients: Array<{
      ingredientId: string;
      quantity: number;
    }>;
  };
}

export function RecipeForm({ ingredients, categories, initialData }: RecipeFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");
  const [yieldQuantity, setYieldQuantity] = useState(
    initialData?.yieldQuantity?.toString() ?? "1"
  );
  const [yieldUnit, setYieldUnit] = useState(initialData?.yieldUnit ?? "g");
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredientRow[]>(
    initialData?.ingredients.map((ri) => ({
      ingredientId: ri.ingredientId,
      quantity: ri.quantity.toString(),
    })) ?? []
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getIngredient = useCallback(
    (id: string) => ingredients.find((i) => i.id === id),
    [ingredients]
  );

  const totalCost = recipeIngredients.reduce((sum, ri) => {
    const ingredient = getIngredient(ri.ingredientId);
    if (!ingredient || !ri.quantity) return sum;
    const costPerUnit = ingredient.packagePrice / ingredient.packageSize;
    return sum + costPerUnit * parseFloat(ri.quantity);
  }, 0);

  const yieldQty = parseFloat(yieldQuantity) || 1;
  const costPerYield = yieldQty > 0 ? totalCost / yieldQty : 0;

  const addIngredientRow = () => {
    const unusedIngredient = ingredients.find(
      (i) => !recipeIngredients.some((ri) => ri.ingredientId === i.id)
    );
    if (unusedIngredient) {
      setRecipeIngredients([
        ...recipeIngredients,
        { ingredientId: unusedIngredient.id, quantity: "" },
      ]);
    } else if (ingredients.length > 0) {
      setRecipeIngredients([
        ...recipeIngredients,
        { ingredientId: ingredients[0].id, quantity: "" },
      ]);
    }
  };

  const updateIngredientRow = (
    index: number,
    field: keyof RecipeIngredientRow,
    value: string
  ) => {
    const updated = [...recipeIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeIngredients(updated);
  };

  const removeIngredientRow = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const validIngredients = recipeIngredients.filter(
      (ri) => ri.ingredientId && ri.quantity && parseFloat(ri.quantity) > 0
    );

    try {
      const payload = {
        name,
        menuPrice: 0,
        description: description || null,
        categoryId: categoryId || null,
        yieldQuantity: parseFloat(yieldQuantity) || 1,
        yieldUnit: yieldUnit || "g",
        ingredients: validIngredients.map((ri) => ({
          ingredientId: ri.ingredientId,
          quantity: parseFloat(ri.quantity),
        })),
      };

      const url = isEditing ? `/api/recipes/${initialData.id}` : "/api/recipes";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "保存に失敗しました。");
      } else {
        router.push(`/recipes/${data.id}`);
        router.refresh();
      }
    } catch {
      setError("保存中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? "レシピの編集" : "レシピの新規作成"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>基本情報</CardTitle>
                <CardDescription>レシピ（仕込み品）の基本情報を入力してください</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">レシピ名 *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="例: ミートソース"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                {categories.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリ (任意)</Label>
                    <select
                      id="category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      disabled={isLoading}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">未分類</option>
                      {categories.map((cat) => {
                        const color = getCategoryColor(cat.color);
                        return (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        );
                      })}
                    </select>
                    {categoryId && (() => {
                      const cat = categories.find(c => c.id === categoryId);
                      if (!cat) return null;
                      const color = getCategoryColor(cat.color);
                      return (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}>
                          {cat.name}
                        </span>
                      );
                    })()}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>仕上がり量 *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="例: 1000"
                      value={yieldQuantity}
                      onChange={(e) => setYieldQuantity(e.target.value)}
                      required
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Input
                      type="text"
                      placeholder="g"
                      value={yieldUnit}
                      onChange={(e) => setYieldUnit(e.target.value)}
                      disabled={isLoading}
                      className="w-20"
                    />
                  </div>
                  <p className="text-xs text-gray-400">このレシピで何{yieldUnit || "g"}できるか入力してください</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">説明 (任意)</Label>
                  <Input
                    id="description"
                    type="text"
                    placeholder="例: ボロネーゼ用仕込み品"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>使用食材</CardTitle>
                    <CardDescription>
                      このレシピで使用する食材と数量を登録してください
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addIngredientRow}
                    disabled={isLoading || ingredients.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    食材を追加
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {ingredients.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500 text-sm">
                      食材が登録されていません。
                      <br />
                      先に
                      <Link href="/ingredients/new" className="text-amber-800 underline mx-1">
                        食材を登録
                      </Link>
                      してください。
                    </p>
                  </div>
                ) : recipeIngredients.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500 text-sm mb-3">
                      食材がまだ追加されていません
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addIngredientRow}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      食材を追加する
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1">
                      <div className="col-span-5">食材</div>
                      <div className="col-span-3">使用量</div>
                      <div className="col-span-3">原価</div>
                      <div className="col-span-1"></div>
                    </div>
                    {recipeIngredients.map((ri, index) => {
                      const ingredient = getIngredient(ri.ingredientId);
                      const cost = ingredient && ri.quantity
                        ? (ingredient.packagePrice / ingredient.packageSize) * parseFloat(ri.quantity)
                        : 0;
                      return (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
                            <Select
                              value={ri.ingredientId}
                              onChange={(e) => updateIngredientRow(index, "ingredientId", e.target.value)}
                              disabled={isLoading}
                            >
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name} ({ing.unit})
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="col-span-3 relative">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0"
                              value={ri.quantity}
                              onChange={(e) => updateIngredientRow(index, "quantity", e.target.value)}
                              disabled={isLoading}
                              className="pr-8"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              {ingredient?.unit}
                            </span>
                          </div>
                          <div className="col-span-3 text-sm font-medium text-amber-700">
                            {cost > 0 ? formatCurrency(cost) : "-"}
                          </div>
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-500"
                              onClick={() => removeIngredientRow(index)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>原価計算</CardTitle>
                <CardDescription>リアルタイムで原価を計算</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">合計原価</span>
                    <span className="font-bold text-lg text-amber-700">
                      {totalCost > 0 ? formatCurrency(totalCost) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">仕上がり量</span>
                    <span className="font-semibold text-gray-700">
                      {yieldQty > 0 ? `${yieldQty.toLocaleString()}${yieldUnit || "g"}` : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">単位あたり原価</span>
                    <span className="font-bold text-lg text-blue-700">
                      {totalCost > 0 && yieldQty > 0
                        ? formatUnitCost(costPerYield, yieldUnit || "g")
                        : "-"}
                    </span>
                  </div>
                </div>

                {totalCost > 0 && yieldQty > 0 && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 text-center">
                    メニューで{yieldUnit || "g"}あたり {formatUnitCost(costPerYield, yieldUnit || "g")} の原価
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full bg-amber-800 hover:bg-amber-900"
                  disabled={isLoading}
                >
                  {isLoading ? "保存中..." : isEditing ? "更新する" : "作成する"}
                </Button>
                <Link href="/recipes" className="w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                  >
                    キャンセル
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
