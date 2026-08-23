"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardList, Download, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  packageSize: number;
  packagePrice: number;
}

interface InventoryRecord {
  id: string;
  date: string;
  quantity: number;
  note: string | null;
  ingredient: Ingredient;
}

interface EditState {
  quantity: string;
  note: string;
  unitPrice: string;
}

export default function InventoryHistoryPage() {
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ quantity: "", note: "", unitPrice: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      setRecords(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (rec: InventoryRecord) => {
    setEditingId(rec.id);
    const up = rec.ingredient.packagePrice / rec.ingredient.packageSize;
    setEditState({ quantity: String(rec.quantity), note: rec.note ?? "", unitPrice: up.toFixed(2) });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: Number(editState.quantity),
          note: editState.note,
          unitPrice: editState.unitPrice !== "" ? Number(editState.unitPrice) : undefined,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm("この棚卸記録を削除しますか？")) return;
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    await load();
  };

  const deleteGroup = async (dateKey: string, ids: string[]) => {
    if (!confirm(`${dateKey} の棚卸記録をすべて削除しますか？`)) return;
    await Promise.all(ids.map((id) => fetch(`/api/inventory/${id}`, { method: "DELETE" })));
    await load();
  };

  // 日付でグループ化
  const grouped = records.reduce<Record<string, InventoryRecord[]>>((acc, inv) => {
    const dateKey = new Date(inv.date).toLocaleDateString("ja-JP");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(inv);
    return acc;
  }, {});

  if (loading) {
    return <div className="text-center py-12 text-gray-500">読み込み中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">棚卸履歴</h1>
          <p className="text-sm text-gray-500 mt-1">過去の棚卸記録の確認・修正</p>
        </div>
        <div className="flex gap-3">
          <a href="/api/export/inventory" download>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              CSVダウンロード
            </Button>
          </a>
          <Link href="/inventory">
            <Button className="bg-blue-700 hover:bg-blue-800">
              <Plus className="h-4 w-4 mr-2" />
              新規棚卸
            </Button>
          </Link>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">棚卸記録がありません</p>
            <Link href="/inventory">
              <Button className="bg-blue-700 hover:bg-blue-800">最初の棚卸を入力する</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateKey, items]) => {
            const totalValue = items.reduce((sum, inv) => {
              const unitPrice = inv.ingredient.packagePrice / inv.ingredient.packageSize;
              return sum + unitPrice * inv.quantity;
            }, 0);

            return (
              <Card key={dateKey}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{dateKey}</CardTitle>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        在庫評価額:{" "}
                        <span className="font-bold text-blue-700">{formatCurrency(totalValue)}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                        onClick={() => deleteGroup(dateKey, items.map((i) => i.id))}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        この日をすべて削除
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-4 font-semibold text-gray-600">食材名</th>
                        <th className="text-right py-2 px-4 font-semibold text-gray-600">在庫数</th>
                        <th className="text-left py-2 px-4 font-semibold text-gray-600">単位</th>
                        <th className="text-right py-2 px-4 font-semibold text-gray-600">仕入単価</th>
                        <th className="text-right py-2 px-4 font-semibold text-gray-600">在庫評価額</th>
                        <th className="text-left py-2 px-4 font-semibold text-gray-600">メモ</th>
                        <th className="py-2 px-4 w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((inv) => {
                        const unitPrice =
                          inv.ingredient.packagePrice / inv.ingredient.packageSize;
                        const value = unitPrice * inv.quantity;
                        const isEditing = editingId === inv.id;

                        return (
                          <tr key={inv.id} className={`border-b last:border-0 ${isEditing ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                            <td className="py-2 px-4 font-medium">{inv.ingredient.name}</td>
                            <td className="py-2 px-4 text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={editState.quantity}
                                  onChange={(e) =>
                                    setEditState((s) => ({ ...s, quantity: e.target.value }))
                                  }
                                  className="w-24 ml-auto text-right"
                                />
                              ) : (
                                inv.quantity.toLocaleString()
                              )}
                            </td>
                            <td className="py-2 px-4 text-gray-500">
                              {inv.ingredient.unit}
                            </td>
                            <td className="py-2 px-4 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editState.unitPrice}
                                    onChange={(e) =>
                                      setEditState((s) => ({ ...s, unitPrice: e.target.value }))
                                    }
                                    className="w-24 text-right"
                                  />
                                  <span className="text-xs text-gray-400">円</span>
                                </div>
                              ) : (
                                <span className="text-gray-700">{formatCurrency(unitPrice)}</span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-right text-blue-700">
                              {isEditing
                                ? formatCurrency(
                                    (Number(editState.unitPrice) || unitPrice) * (Number(editState.quantity) || 0)
                                  )
                                : formatCurrency(value)}
                            </td>
                            <td className="py-2 px-4">
                              {isEditing ? (
                                <Input
                                  value={editState.note}
                                  onChange={(e) =>
                                    setEditState((s) => ({ ...s, note: e.target.value }))
                                  }
                                  placeholder="メモ"
                                />
                              ) : (
                                <span className="text-gray-500">{inv.note ?? "-"}</span>
                              )}
                            </td>
                            <td className="py-2 px-4">
                              {isEditing ? (
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    className="bg-blue-700 hover:bg-blue-800 h-7 px-2"
                                    onClick={() => saveEdit(inv.id)}
                                    disabled={saving}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    onClick={cancelEdit}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => startEdit(inv)}
                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                    title="編集"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteRecord(inv.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="削除"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
