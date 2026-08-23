"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X, CheckCircle, AlertCircle, Link2 } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<OcrItem[]>([]);
  // 各OCR行の食材紐付け: null=スキップ, ""=未選択, "id"=食材ID
  const [mappings, setMappings] = useState<(string | null)[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setItems([]);
    setSaved(false);
    setLoading(true);

    try {
      const base64 = await toBase64(file);
      const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";
      const res = await fetch("/api/ocr/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "読み取りに失敗しました。"); return; }
      setItems(data.items);
      // 自動マッピング: 食材名と部分一致
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
    }
  };

  const handleSave = async () => {
    const updates = items
      .map((item, i) => ({ item, ingredientId: mappings[i] }))
      .filter((r) => r.ingredientId && r.ingredientId !== "");

    if (updates.length === 0) {
      setError("紐付けされた食材がありません。");
      return;
    }

    setSaving(true);
    try {
      for (const { item, ingredientId } of updates) {
        const ing = ingredients.find((g) => g.id === ingredientId);
        if (!ing) continue;
        // 仕入価格を更新（パッケージ単価として）
        await fetch(`/api/ingredients/${ingredientId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: ing.name,
            unit: ing.unit,
            packageSize: item.quantity > 1 ? ing.packageSize : ing.packageSize,
            packagePrice: item.totalPrice,
          }),
        });
      }
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
              <h2 className="text-lg font-bold text-gray-900">レシート読み取り（OCR）</h2>
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

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFile}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

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
                <p className="text-sm text-gray-600 mb-4">
                  読み取った商品と食材マスタを紐付けてください。紐付けた食材の仕入価格が更新されます。
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
                    仕入価格を更新しました。
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">レシート商品名</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600 w-20">数量</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600 w-24">金額</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">
                          <span className="flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />食材マスタ</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className={`border-b last:border-0 ${mappings[i] === null ? "opacity-40" : ""}`}>
                          <td className="py-2 px-3 font-medium">{item.name}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{item.quantity}</td>
                          <td className="py-2 px-3 text-right font-semibold text-amber-700">¥{item.totalPrice.toLocaleString()}</td>
                          <td className="py-2 px-3">
                            <select
                              value={mappings[i] ?? "__skip__"}
                              onChange={(e) => {
                                const val = e.target.value === "__skip__" ? null : e.target.value;
                                setMappings((prev) => prev.map((m, idx) => idx === i ? val : m));
                              }}
                              className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  ※「スキップ」にした行は保存されません。紐付けた食材の仕入価格（金額欄の値）が更新されます。
                </p>

                <div className="mt-5 flex justify-between items-center">
                  <button
                    onClick={() => { setItems([]); setMappings([]); setError(""); setSaved(false); }}
                    className="text-sm text-blue-700 hover:underline"
                  >
                    別の画像を読み取る
                  </button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleClose}>閉じる</Button>
                    {!saved && (
                      <Button
                        onClick={handleSave}
                        disabled={saving || mappings.every((m) => !m || m === null)}
                        className="bg-blue-700 hover:bg-blue-800"
                      >
                        {saving ? "更新中..." : "仕入価格を更新"}
                      </Button>
                    )}
                  </div>
                </div>
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
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // base64部分のみ
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
