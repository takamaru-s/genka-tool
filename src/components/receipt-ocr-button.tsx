"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X, CheckCircle, AlertCircle, Link2, FolderOpen, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OcrItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  packageSize: number;
  packagePrice: number;
}

interface ReceiptOcrButtonProps {
  ingredients: Ingredient[];
}

export function ReceiptOcrButton({ ingredients }: ReceiptOcrButtonProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<OcrItem[]>([]);
  const [mappings, setMappings] = useState<(string | null)[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [quantities, setQuantities] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setItems([]);
    setSaved(false);
    setLoading(true);

    try {
      const base64 = await toBase64(file);
      const res = await fetch("/api/ocr/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "読み取りに失敗しました。"); return; }
      setItems(data.items);
      setQuantities(data.items.map((item: OcrItem) => item.quantity || 1));
      setSelected(data.items.map(() => true));
      setMappings(data.items.map((item: OcrItem) => {
        const match = ingredients.find(
          (ing) => ing.name.includes(item.name) || item.name.includes(ing.name)
        );
        return match?.id ?? "";
      }));
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  };

  const handleSave = async () => {
    const updates = items
      .map((item, i) => ({ item, ingredientId: mappings[i], qty: quantities[i], sel: selected[i] }))
      .filter((r) => r.sel && r.ingredientId && r.ingredientId !== "");

    if (updates.length === 0) {
      setError("取込む食材が選択されていません。");
      return;
    }

    setSaving(true);
    try {
      // 月間仕入高に加算
      const purchaseItems = updates.map(({ ingredientId, qty, item }) => {
        const ing = ingredients.find((g) => g.id === ingredientId)!;
        // パッケージ数 × 内容量 = 仕入量（食材の単位）
        const purchaseQty = qty * ing.packageSize;
        return { ingredientId: ingredientId!, quantity: purchaseQty };
      });

      await fetch("/api/monthly-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, items: purchaseItems }),
      });

      // 仕入価格も更新
      await Promise.all(updates.map(({ item, ingredientId, qty }) => {
        const ing = ingredients.find((g) => g.id === ingredientId)!;
        return fetch(`/api/ingredients/${ingredientId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: ing.name,
            unit: ing.unit,
            packageSize: ing.packageSize,
            packagePrice: qty > 1 ? item.totalPrice / qty : item.totalPrice,
          }),
        });
      }));

      setSaved(true);
      router.refresh();
    } catch {
      setError("保存中にエラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setItems([]);
    setMappings([]);
    setSelected([]);
    setQuantities([]);
    setError("");
    setSaved(false);
  };

  const reset = () => {
    setItems([]);
    setMappings([]);
    setSelected([]);
    setQuantities([]);
    setError("");
    setSaved(false);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Camera className="h-4 w-4 mr-2" />
        レシート読み取り
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">レシート読み取り（OCR）</h2>
                {items.length > 0 && (
                  <p className="text-xs text-gray-500">{year}年{month}月の月間仕入高に加算されます</p>
                )}
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <p>レシートの写真または画像ファイルを選択してください。</p>
                  <p className="text-xs mt-1 text-blue-600">対応形式: JPEG・PNG・WebP</p>
                </div>

                {error && (
                  <div className="mb-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFile} className="hidden" />
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />

                <div className="flex gap-3 mt-2">
                  <button onClick={() => cameraRef.current?.click()}
                    className="flex-1 flex flex-col items-center gap-2 border-2 border-dashed border-blue-300 rounded-xl py-6 text-blue-700 hover:bg-blue-50 transition-colors">
                    <Camera className="h-8 w-8" />
                    <span className="text-sm font-medium">カメラで撮影</span>
                    <span className="text-xs text-blue-400">スマホ推奨</span>
                  </button>
                  <button onClick={() => fileRef.current?.click()}
                    className="flex-1 flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-6 text-gray-600 hover:bg-gray-50 transition-colors">
                    <FolderOpen className="h-8 w-8" />
                    <span className="text-sm font-medium">ファイルを選択</span>
                    <span className="text-xs text-gray-400">PC・ギャラリーから</span>
                  </button>
                </div>

                {loading && (
                  <div className="mt-6 text-center py-8 text-gray-500">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-sm">AIがレシートを解析中...</p>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <Button variant="outline" onClick={handleClose}>閉じる</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  取込む商品にチェックを入れ、数量を確認してから食材マスタと紐付けてください。
                </p>

                {error && (
                  <div className="mb-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {saved && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    {year}年{month}月の月間仕入高に追加しました。
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="py-2 px-2 w-8">
                          <input type="checkbox"
                            checked={selected.every(Boolean)}
                            onChange={(e) => setSelected(selected.map(() => e.target.checked))}
                            className="rounded"
                          />
                        </th>
                        <th className="text-left py-2 px-2 font-semibold text-gray-600">商品名</th>
                        <th className="text-center py-2 px-2 font-semibold text-gray-600 w-28">数量</th>
                        <th className="text-right py-2 px-2 font-semibold text-gray-600 w-24">金額</th>
                        <th className="text-left py-2 px-2 font-semibold text-gray-600">
                          <span className="flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />食材マスタ</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className={`border-b last:border-0 ${!selected[i] ? "opacity-40" : ""}`}>
                          <td className="py-2 px-2">
                            <input type="checkbox"
                              checked={selected[i]}
                              onChange={(e) => setSelected((prev) => prev.map((v, idx) => idx === i ? e.target.checked : v))}
                              className="rounded"
                            />
                          </td>
                          <td className="py-2 px-2 font-medium">{item.name}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setQuantities((prev) => prev.map((q, idx) => idx === i ? Math.max(1, q - 1) : q))}
                                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
                                disabled={!selected[i]}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center font-semibold">{quantities[i]}</span>
                              <button
                                onClick={() => setQuantities((prev) => prev.map((q, idx) => idx === i ? q + 1 : q))}
                                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
                                disabled={!selected[i]}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-amber-700">
                            ¥{item.totalPrice.toLocaleString()}
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={mappings[i] ?? "__skip__"}
                              onChange={(e) => {
                                const val = e.target.value === "__skip__" ? null : e.target.value;
                                setMappings((prev) => prev.map((m, idx) => idx === i ? val : m));
                              }}
                              disabled={!selected[i]}
                              className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              <option value="">― 未選択 ―</option>
                              <option value="__skip__">スキップ</option>
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>{ing.name}（{ing.unit}）</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  ※ チェックを外した行は取込まれません。数量×内容量が月間仕入高に加算され、仕入価格も更新されます。
                </p>

                <div className="mt-5 flex justify-between items-center">
                  <div className="flex gap-3">
                    <button onClick={() => { reset(); setTimeout(() => cameraRef.current?.click(), 100); }}
                      className="text-sm text-blue-700 hover:underline flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" />再撮影
                    </button>
                    <button onClick={() => { reset(); setTimeout(() => fileRef.current?.click(), 100); }}
                      className="text-sm text-gray-500 hover:underline flex items-center gap-1">
                      <FolderOpen className="h-3.5 w-3.5" />別ファイル
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleClose}>閉じる</Button>
                    {!saved && (
                      <Button
                        onClick={handleSave}
                        disabled={saving || !selected.some((s, i) => s && !!mappings[i] && mappings[i] !== null)}
                        className="bg-blue-700 hover:bg-blue-800"
                      >
                        {saving ? "追加中..." : "月間仕入高に追加"}
                      </Button>
                    )}
                  </div>
                </div>

                <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFile} className="hidden" />
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}
