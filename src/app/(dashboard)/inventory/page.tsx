"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { History, Save, Plus, Trash2, ArrowUpDown } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  packageSize: number;
  packagePrice: number;
}

interface InventoryRow {
  ingredientId: string;
  quantity: string;
  note: string;
  unitPrice: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState<InventoryRow[]>([
    { ingredientId: "", quantity: "", note: "", unitPrice: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/ingredients")
      .then((r) => r.json())
      .then((data) => {
        setIngredients(data);
        if (data.length > 0) {
          setRows(data.map((ing: Ingredient) => ({
            ingredientId: ing.id,
            quantity: "",
            note: "",
            unitPrice: (ing.packagePrice / ing.packageSize).toFixed(2),
          })));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const updateRow = (index: number, field: keyof InventoryRow, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const updated = { ...r, [field]: value };
        if (field === "ingredientId") {
          const ing = ingredients.find((g) => g.id === value);
          if (ing) updated.unitPrice = (ing.packagePrice / ing.packageSize).toFixed(2);
        }
        return updated;
      })
    );
  };

  const handleSortName = () => {
    const nextDir = sortDir === "asc" ? "desc" : "asc";
    setSortDir(nextDir);
    setRows((prev) =>
      [...prev].sort((a, b) => {
        const nameA = ingredients.find((g) => g.id === a.ingredientId)?.name ?? "";
        const nameB = ingredients.find((g) => g.id === b.ingredientId)?.name ?? "";
        return nextDir === "asc" ? nameA.localeCompare(nameB, "ja") : nameB.localeCompare(nameA, "ja");
      })
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, { ingredientId: "", quantity: "", note: "", unitPrice: "" }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validRows = rows.filter((r) => r.ingredientId && r.quantity !== "");
    if (validRows.length === 0) {
      setError("1件以上の食材を入力してください。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        date,
        rows: validRows.map((r) => ({
          ...r,
          unitPrice: r.unitPrice !== "" ? Number(r.unitPrice) : undefined,
        })),
      }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "保存に失敗しました。");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/inventory/history"), 1000);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">読み込み中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">棚卸入力</h1>
          <p className="text-sm text-gray-500 mt-1">食材の実在庫数を記録します</p>
        </div>
        <Link href="/inventory/history">
          <Button variant="outline">
            <History className="h-4 w-4 mr-2" />
            棚卸履歴
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>棚卸日</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label htmlFor="date">日付</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>在庫数入力</CardTitle>
        </CardHeader>
        <CardContent>
          {ingredients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>食材が登録されていません。</p>
              <Link href="/ingredients/new" className="text-blue-700 underline mt-2 inline-block">
                食材を登録する
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th
                        className="text-left py-3 px-4 font-semibold text-gray-600 w-1/4 cursor-pointer select-none hover:bg-gray-100"
                        onClick={handleSortName}
                      >
                        <span className="flex items-center gap-1">
                          食材名
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortDir ? "text-blue-600" : "text-gray-400"}`} />
                          {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : ""}
                        </span>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 w-1/6">実在庫数</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">単位</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 w-1/6">仕入単価（円）</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">メモ</th>
                      <th className="py-3 px-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const ing = ingredients.find((g) => g.id === row.ingredientId);
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 px-4">
                            <select
                              value={row.ingredientId}
                              onChange={(e) => updateRow(i, "ingredientId", e.target.value)}
                              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">選択してください</option>
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-4">
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={row.quantity}
                              onChange={(e) => updateRow(i, "quantity", e.target.value)}
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 px-4 text-gray-500">{ing?.unit ?? "-"}</td>
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.unitPrice}
                                onChange={(e) => updateRow(i, "unitPrice", e.target.value)}
                                placeholder={ing ? (ing.packagePrice / ing.packageSize).toFixed(2) : "0"}
                                className="w-24"
                              />
                              <span className="text-xs text-gray-400 whitespace-nowrap">/{ing?.unit ?? "-"}</span>
                            </div>
                          </td>
                          <td className="py-2 px-4">
                            <Input
                              value={row.note}
                              onChange={(e) => updateRow(i, "note", e.target.value)}
                              placeholder="メモ（任意）"
                            />
                          </td>
                          <td className="py-2 px-4">
                            <button
                              onClick={() => removeRow(i)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                onClick={addRow}
                className="mt-3 flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900"
              >
                <Plus className="h-4 w-4" />
                行を追加
              </button>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
              {success && <p className="mt-4 text-sm text-green-600">保存しました。履歴ページに移動します...</p>}

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-blue-700 hover:bg-blue-800"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "保存中..." : "棚卸を保存"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
