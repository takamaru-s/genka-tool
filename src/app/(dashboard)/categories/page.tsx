"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { CATEGORY_COLORS, getCategoryColor } from "@/lib/category-colors";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color: string;
  _count: { recipes: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // 新規追加フォーム
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // 編集中
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("blue");
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      setCategories(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) { setAddError("カテゴリ名を入力してください。"); return; }
    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, color: newColor }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error); return; }
      setNewName("");
      setNewColor("blue");
      setShowAdd(false);
      await fetchCategories();
    } finally {
      setAddLoading(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditError("");
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) { setEditError("カテゴリ名を入力してください。"); return; }
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, color: editColor }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error); return; }
      setEditingId(null);
      await fetchCategories();
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string, count: number) => {
    const msg = count > 0
      ? `「${name}」を削除すると、このカテゴリに属する${count}件のレシピのカテゴリが未設定になります。削除しますか？`
      : `「${name}」を削除しますか？`;
    if (!confirm(msg)) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    await fetchCategories();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">カテゴリマスタ</h1>
          <p className="text-sm text-gray-500 mt-1">レシピのカテゴリを管理します</p>
        </div>
        {!showAdd && (
          <Button
            onClick={() => { setShowAdd(true); setAddError(""); }}
            className="bg-blue-700 hover:bg-blue-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            カテゴリを追加
          </Button>
        )}
      </div>

      {/* 新規追加フォーム */}
      {showAdd && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base text-blue-900">新規カテゴリ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>カテゴリ名 *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例: ランチ、ドリンク、デザート"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>カラー</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewColor(c.value)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                        c.bg, c.text, c.border,
                        newColor === c.value ? "ring-2 ring-offset-1 ring-blue-500 scale-105" : "opacity-70 hover:opacity-100"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                disabled={addLoading}
                className="bg-blue-700 hover:bg-blue-800"
              >
                <Check className="h-4 w-4 mr-2" />
                追加する
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowAdd(false); setNewName(""); setAddError(""); }}
              >
                <X className="h-4 w-4 mr-2" />
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* カテゴリ一覧 */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">読み込み中...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">カテゴリがまだ登録されていません</p>
              <Button
                onClick={() => setShowAdd(true)}
                className="bg-blue-700 hover:bg-blue-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                最初のカテゴリを追加する
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => {
                const color = getCategoryColor(cat.color);
                const isEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-4 p-3 rounded-lg border bg-white hover:bg-gray-50"
                  >
                    {isEditing ? (
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleEdit(cat.id)}
                            autoFocus
                          />
                          <div className="flex flex-wrap gap-2 items-center">
                            {CATEGORY_COLORS.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => setEditColor(c.value)}
                                className={cn(
                                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                                  c.bg, c.text, c.border,
                                  editColor === c.value ? "ring-2 ring-offset-1 ring-blue-500 scale-105" : "opacity-70 hover:opacity-100"
                                )}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {editError && <p className="text-xs text-red-600">{editError}</p>}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEdit(cat.id)}
                            disabled={editLoading}
                            className="bg-blue-700 hover:bg-blue-800"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            保存
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-sm font-medium border",
                            color.bg, color.text, color.border
                          )}
                        >
                          {cat.name}
                        </span>
                        <span className="text-sm text-gray-500 flex-1">
                          レシピ {cat._count.recipes} 件
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(cat)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(cat.id, cat.name, cat._count.recipes)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
