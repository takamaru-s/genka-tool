"use client";

import { useEffect, useState } from "react";
import { X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PricePoint {
  date: string;
  packagePrice: number;
  packageSize: number;
  unitPrice: number;
}

interface InventoryPoint {
  date: string;
  quantity: number;
  value: number;
  note: string;
}

interface IngredientInfo {
  name: string;
  unit: string;
  unitPrice: number;
  packageSize: number;
  packagePrice: number;
}

interface HistoryData {
  ingredient: IngredientInfo;
  priceHistory: PricePoint[];
  inventoryHistory: InventoryPoint[];
}

interface Props {
  ingredientId: string;
  ingredientName: string;
  onClose: () => void;
}

type Tab = "price" | "inventory";

function PriceTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-blue-700">
        単価: <span className="font-bold">{formatCurrency(p.value)}</span> / {unit}
      </p>
    </div>
  );
}

function InventoryTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}:{" "}
          <span className="font-medium">
            {p.name === "在庫数"
              ? `${p.value.toLocaleString()} ${unit}`
              : formatCurrency(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function IngredientChartModal({ ingredientId, ingredientName, onClose }: Props) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("price");

  useEffect(() => {
    fetch(`/api/ingredients/${ingredientId}/history`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [ingredientId]);

  const ing = data?.ingredient;
  const priceHistory = data?.priceHistory ?? [];
  const inventoryHistory = data?.inventoryHistory ?? [];

  // 価格変動率（最古 → 最新）
  const priceChangeRate =
    priceHistory.length >= 2
      ? ((priceHistory[priceHistory.length - 1].unitPrice - priceHistory[0].unitPrice) /
          priceHistory[0].unitPrice) *
        100
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{ingredientName}</h2>
              <p className="text-xs text-gray-500">価格・棚卸推移グラフ</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b px-5">
          <button
            onClick={() => setTab("price")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              tab === "price"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            仕入価格の推移
          </button>
          <button
            onClick={() => setTab("inventory")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              tab === "inventory"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            棚卸数量の推移
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-16 text-gray-400">読み込み中...</div>
          ) : tab === "price" ? (
            /* --- 価格推移タブ --- */
            <>
              {/* サマリーカード */}
              <div className="flex flex-wrap gap-3 mb-5">
                <div className="bg-blue-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500">現在の単価</p>
                  <p className="font-bold text-blue-700 text-lg">
                    {ing ? formatCurrency(ing.unitPrice) : "-"} / {ing?.unit}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500">現在の仕入価格</p>
                  <p className="font-bold text-gray-800">
                    {ing ? formatCurrency(ing.packagePrice) : "-"} / {ing?.packageSize}{ing?.unit}
                  </p>
                </div>
                {priceChangeRate !== null && (
                  <div
                    className={`rounded-lg px-4 py-3 ${
                      priceChangeRate > 0
                        ? "bg-red-50"
                        : priceChangeRate < 0
                        ? "bg-green-50"
                        : "bg-gray-50"
                    }`}
                  >
                    <p className="text-xs text-gray-500">期間変動率</p>
                    <p
                      className={`font-bold text-lg ${
                        priceChangeRate > 0
                          ? "text-red-600"
                          : priceChangeRate < 0
                          ? "text-green-600"
                          : "text-gray-600"
                      }`}
                    >
                      {priceChangeRate >= 0 ? "+" : ""}
                      {priceChangeRate.toFixed(1)}%
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500">価格更新回数</p>
                  <p className="font-bold text-gray-800">{priceHistory.length}回</p>
                </div>
              </div>

              {priceHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                  <p>価格履歴がありません。</p>
                  <p className="text-sm mt-1">
                    食材の編集画面で仕入価格を変更すると記録されます。
                  </p>
                </div>
              ) : (
                <>
                  {/* 単価グラフ */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-3">
                      単価の推移（{ing?.unit}あたり）
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart
                        data={priceHistory}
                        margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v) => `¥${v.toLocaleString()}`}
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                          tickLine={false}
                          axisLine={false}
                          width={65}
                        />
                        <Tooltip
                          content={<PriceTooltip unit={ing?.unit ?? ""} />}
                        />
                        {/* 初回価格のリファレンスライン */}
                        {priceHistory.length > 0 && (
                          <ReferenceLine
                            y={priceHistory[0].unitPrice}
                            stroke="#d1d5db"
                            strokeDasharray="4 4"
                            label={{ value: "初回", fontSize: 10, fill: "#9ca3af" }}
                          />
                        )}
                        <Line
                          type="stepAfter"
                          dataKey="unitPrice"
                          name="単価"
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          dot={{ fill: "#2563eb", r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 価格変更履歴テーブル */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">価格変更履歴</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50 text-gray-500">
                            <th className="text-left py-2 px-3 font-medium">日付</th>
                            <th className="text-right py-2 px-3 font-medium">仕入価格</th>
                            <th className="text-right py-2 px-3 font-medium">内容量</th>
                            <th className="text-right py-2 px-3 font-medium">単価</th>
                            <th className="text-right py-2 px-3 font-medium">前回比</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...priceHistory].reverse().map((p, i, arr) => {
                            const prev = arr[i + 1];
                            const diff = prev
                              ? ((p.unitPrice - prev.unitPrice) / prev.unitPrice) * 100
                              : null;
                            return (
                              <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="py-2 px-3 text-gray-700">{p.date}</td>
                                <td className="py-2 px-3 text-right">{formatCurrency(p.packagePrice)}</td>
                                <td className="py-2 px-3 text-right text-gray-500">
                                  {p.packageSize.toLocaleString()}{ing?.unit}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-blue-700">
                                  {formatCurrency(p.unitPrice)}/{ing?.unit}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {diff === null ? (
                                    <span className="text-xs text-gray-400">初回</span>
                                  ) : (
                                    <span
                                      className={`font-medium ${
                                        diff > 0
                                          ? "text-red-600"
                                          : diff < 0
                                          ? "text-green-600"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      {diff >= 0 ? "+" : ""}
                                      {diff.toFixed(1)}%
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            /* --- 棚卸数量タブ --- */
            <>
              {inventoryHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                  <p>棚卸記録がありません。</p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-3">
                      在庫数の推移（{ing?.unit}）
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart
                        data={inventoryHistory}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} width={50} />
                        <Tooltip content={<InventoryTooltip unit={ing?.unit ?? ""} />} />
                        <Line
                          type="monotone"
                          dataKey="quantity"
                          name="在庫数"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={{ fill: "#2563eb", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">棚卸記録一覧</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50 text-gray-500">
                            <th className="text-left py-2 px-3 font-medium">日付</th>
                            <th className="text-right py-2 px-3 font-medium">在庫数</th>
                            <th className="text-right py-2 px-3 font-medium">在庫評価額</th>
                            <th className="text-left py-2 px-3 font-medium">メモ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...inventoryHistory].reverse().map((d, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-2 px-3 text-gray-700">{d.date}</td>
                              <td className="py-2 px-3 text-right font-medium text-blue-700">
                                {d.quantity.toLocaleString()} {ing?.unit}
                              </td>
                              <td className="py-2 px-3 text-right text-orange-700">
                                {formatCurrency(d.value)}
                              </td>
                              <td className="py-2 px-3 text-gray-500">{d.note || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}
