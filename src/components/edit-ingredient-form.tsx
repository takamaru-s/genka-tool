"use client";

import { useState } from "react";
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
import { ArrowLeft } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  packageSize: number;
  packagePrice: number;
}

interface EditIngredientFormProps {
  ingredient: Ingredient;
}

export function EditIngredientForm({ ingredient }: EditIngredientFormProps) {
  const router = useRouter();
  const [name, setName] = useState(ingredient.name);
  const [unit, setUnit] = useState(ingredient.unit);
  const [packageSize, setPackageSize] = useState(
    ingredient.packageSize.toString()
  );
  const [packagePrice, setPackagePrice] = useState(
    ingredient.packagePrice.toString()
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const unitPrice =
    packageSize && packagePrice
      ? (parseFloat(packagePrice) / parseFloat(packageSize)).toFixed(2)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/ingredients/${ingredient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          unit,
          packageSize: parseFloat(packageSize),
          packagePrice: parseFloat(packagePrice),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "更新に失敗しました。");
      } else {
        router.push("/ingredients");
        router.refresh();
      }
    } catch {
      setError("更新中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/ingredients"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          食材一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">食材の編集</h1>
      </div>

      <div className="max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>食材情報の編集</CardTitle>
            <CardDescription>
              食材の仕入れ情報を更新してください
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">食材名 *</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">単位 *</Label>
                <Select
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="g">g (グラム)</option>
                  <option value="ml">ml (ミリリットル)</option>
                  <option value="個">個</option>
                  <option value="枚">枚</option>
                  <option value="本">本</option>
                  <option value="袋">袋</option>
                  <option value="kg">kg (キログラム)</option>
                  <option value="L">L (リットル)</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="packageSize">内容量 *</Label>
                <div className="relative">
                  <Input
                    id="packageSize"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={packageSize}
                    onChange={(e) => setPackageSize(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    {unit}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="packagePrice">仕入価格 *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    ¥
                  </span>
                  <Input
                    id="packagePrice"
                    type="number"
                    min="0"
                    step="1"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-7"
                  />
                </div>
              </div>
              {unitPrice && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">計算された単価：</span>
                    ¥{unitPrice} / {unit}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button
                type="submit"
                className="bg-amber-800 hover:bg-amber-900"
                disabled={isLoading}
              >
                {isLoading ? "更新中..." : "更新する"}
              </Button>
              <Link href="/ingredients">
                <Button type="button" variant="outline" disabled={isLoading}>
                  キャンセル
                </Button>
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
