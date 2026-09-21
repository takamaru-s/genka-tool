"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, ArrowUpDown, PackagePlus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ReceiptOcrButton } from "@/components/receipt-ocr-button";

interface MonthlyRow {
  ingredientId: string;
  name: string;
  unit: string;
  unitPrice: number;
  packageSize: number;
  packagePrice: number;
  openingQty: number;
  purchaseQty: number;
  closingQty: number;
  usageQty: number;
  usageAmount: number;
}

export default function MonthlyInventoryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [todayPurchase, setTodayPurchase] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const [fetchError, setFetchError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch(`/api/monthly-purchase?year=${year}&month=${month}`);
      const data = await res.json();
      if (!res.ok) {
        setFetchError(`データ取得エラー: ${data.error ?? res.status}`);
        return;
      }
      const rows: MonthlyRow[] = Array.isArray(data) ? data : [];
      setRows(rows);
    } catch (e) {
      setFetchError(`通信エラー: ${e instanceof Error ? e.message : "不明なエラー"}`);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // OCRコールバック：本日仕入に加算
  const handleOcrImport = useCallback((items: { ingredientId: string; quantity: number }[]) => {
    setTodayPurchase((prev) => {
      const next = { ...prev };
      items.forEach(({ ingredientId, quantity }) => {
        const existing = parseFloat(next[ingredientId] || "0") || 0;
        next[ingredientId] = String(Math.round((existing + quantity) * 1000) / 1000);
      });
      return next;
    });
  }, []);

  // 一括登録：本日仕入を月間仕入高に加算
  const handleBulkRegister = async () => {
    const items = Object.entries(todayPurchase)
      .map(([ingredientId, v]) => ({ ingredientId, quantity: parseFloat(v) || 0 }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) return;
    if (!confirm(`${items.length}品目の本日仕入を月間仕入高に加算します。よろしいですか？`)) return;

    setRegistering(true);
    try {
      await fetch("/api/monthly-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, items }),
      });
      setTodayPurchase({});
      setRegistered(true);
      setTimeout(() => setRegistered(false), 3000);
      await fetchData();
    } finally {
      setRegistering(false);
    }
  };

  const computedRows = rows.map((r) => {
    const purchaseQty = r.purchaseQty;
    const usageQty = r.openingQty + purchaseQty - r.closingQty;
    return { ...r, purchaseQty, usageQty, usageAmount: usageQty * r.unitPrice };
  });

  const displayRows = sortDir === null
    ? computedRows
    : [...computedRows].sort((a, b) =>
        sortDir === "asc" ? a.name.localeCompare(b.name, "ja") : b.name.localeCompare(a.name, "ja")
      );

  const totalOpeningValue = computedRows.reduce((s, r) => s + r.openingQty * r.unitPrice, 0);
  const totalPurchaseValue = computedRows.reduce((s, r) => s + r.purchaseQty * r.unitPrice, 0);
  const totalClosingValue = computedRows.reduce((s, r) => s + r.closingQty * r.unitPrice, 0);
  const totalUsageValue = computedRows.reduce((s, r) => s + r.usageAmount, 0);
  const todayTotal = Object.values(todayPurchase).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const ocrIngredients = rows.map((r) => ({
    id: r.ingredientId,
    name: r.name,
    unit: r.unit,
    packageSize: r.packageSize,
    packagePrice: r.packagePrice,
  }));

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">月間棚卸・仕入表</h1>
          <p className="text-sm text-gray-500 mt-1">月間使用量 = 月初在庫 + 月間仕入高 − 月末在庫</p>
        </div>
      </div>

      {/* 年月選択 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {years.map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
            </select>
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />更新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500 mb-1">月初在庫評価額</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(totalOpeningValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500 mb-1">月間仕入高評価額</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totalPurchaseValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500 mb-1">月末在庫評価額</p>
            <p className="text-lg font-bold text-purple-700">{formatCurrency(totalClosingValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-5">
            <p className="text-xs text-orange-600 mb-1">月間使用食材評価額</p>
            <p className="text-lg font-bold text-orange-700">{formatCurrency(totalUsageValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* メインテーブル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>{year}年{month}月 食材使用量一覧</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {ocrIngredients.length > 0 && (
                <ReceiptOcrButton ingredients={ocrIngredients} onItemsImported={handleOcrImport} />
              )}
              <Button
                onClick={handleBulkRegister}
                disabled={registering || todayTotal === 0}
                className="bg-blue-700 hover:bg-blue-800"
              >
                <PackagePlus className="h-4 w-4 mr-2" />
                {registering ? "登録中..." : "一括登録（月間仕入高に加算）"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {registered && (
            <p className="text-sm text-green-600 mb-4 font-medium">✓ 月間仕入高に加算しました。</p>
          )}
          {loading ? (
            <div className="text-center py-12 text-gray-500">読み込み中...</div>
          ) : fetchError ? (
            <div className="text-center py-12">
              <p className="text-red-600 font-medium mb-2">データを取得できませんでした</p>
              <p className="text-xs text-gray-500">{fetchError}</p>
              <button onClick={fetchData} className="mt-4 text-sm text-blue-700 underline">再読み込み</button>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">食材が登録されていません。</p>
              <a href="/ingredients" className="text-blue-700 underline text-sm">食材管理で食材を登録する</a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="text-left py-3 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100"
                      onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>
                      <span className="flex items-center gap-1">
                        食材名
                        <ArrowUpDown className={`h-3.5 w-3.5 ${sortDir ? "text-blue-600" : "text-gray-400"}`} />
                        {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : ""}
                      </span>
                    </th>
                    <th className="text-right py-3 px-3 font-semibold text-blue-700">月初在庫</th>
                    <th className="text-right py-3 px-3 font-semibold text-sky-600">
                      本日仕入
                      <div className="text-xs font-normal text-sky-400">（入力欄）</div>
                    </th>
                    <th className="text-right py-3 px-3 font-semibold text-green-700">
                      月間仕入高
                      <div className="text-xs font-normal text-green-400">（累計）</div>
                    </th>
                    <th className="text-right py-3 px-3 font-semibold text-purple-700">月末在庫</th>
                    <th className="text-right py-3 px-3 font-semibold text-orange-700">月間使用量</th>
                    <th className="text-left py-3 px-3 font-semibold">単位</th>
                    <th className="text-right py-3 px-3 font-semibold">使用金額</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row) => {
                    const today = parseFloat(todayPurchase[row.ingredientId] || "0") || 0;
                    return (
                      <tr key={row.ingredientId} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-900">{row.name}</td>
                        <td className="py-2 px-3 text-right text-blue-700">{row.openingQty.toLocaleString()}</td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={todayPurchase[row.ingredientId] ?? ""}
                            onChange={(e) => setTodayPurchase((prev) => ({ ...prev, [row.ingredientId]: e.target.value }))}
                            placeholder="0"
                            className="text-right w-24 ml-auto focus-visible:ring-sky-500 border-sky-200"
                          />
                        </td>
                        <td className="py-2 px-3 text-right text-green-700 font-medium">
                          {row.purchaseQty.toLocaleString()}
                          {today > 0 && (
                            <div className="text-xs text-sky-500">+{today} 未登録</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-purple-700">{row.closingQty.toLocaleString()}</td>
                        <td className={`py-2 px-3 text-right font-bold ${row.usageQty < 0 ? "text-red-600" : "text-orange-700"}`}>
                          {row.usageQty.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-gray-500">{row.unit}</td>
                        <td className="py-2 px-3 text-right text-gray-700">{formatCurrency(row.usageAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                    <td className="py-3 px-3 text-gray-700" colSpan={7}>合計</td>
                    <td className="py-3 px-3 text-right text-orange-700">{formatCurrency(totalUsageValue)}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="mt-4 text-xs text-gray-400">
                ※ 月初在庫は前月以前の最新棚卸、月末在庫は当月内の最新棚卸から自動取得。「本日仕入」に数量を入力して「一括登録」を押すと月間仕入高に加算されます。
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
