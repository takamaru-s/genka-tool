"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, RefreshCw, BarChart3, LineChart, UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getCategoryColor } from "@/lib/category-colors";

interface SalesRow {
  menuId: string;
  name: string;
  category: { name: string; color: string } | null;
  menuPrice: number;
  unitCost: number;
  quantity: number;
}

export default function SalesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales?year=${year}&month=${month}`);
      const data: SalesRow[] = await res.json();
      setRows(data);
      const init: Record<string, string> = {};
      data.forEach((r) => { init[r.menuId] = r.quantity > 0 ? String(r.quantity) : ""; });
      setQuantities(init);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const computedRows = rows.map((r) => {
    const qty = parseInt(quantities[r.menuId] || "0") || 0;
    return { ...r, qty, revenue: r.menuPrice * qty, stdCost: r.unitCost * qty };
  });
  const totalRevenue = computedRows.reduce((s, r) => s + r.revenue, 0);
  const totalStdCost = computedRows.reduce((s, r) => s + r.stdCost, 0);
  const totalQty = computedRows.reduce((s, r) => s + r.qty, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = rows.map((r) => ({
        menuId: r.menuId,
        quantity: parseInt(quantities[r.menuId] || "0") || 0,
      }));
      await fetch("/api/sales", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, items }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">アイテム別出数登録</h1>
          <p className="text-sm text-gray-500 mt-1">月間のメニュー別販売数を入力します</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/history">
            <Button variant="outline">
              <LineChart className="h-4 w-4 mr-2" />
              出数履歴
            </Button>
          </Link>
          <Link href="/sales/analysis">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              ABC分析・原価差異
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {years.map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              更新
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-5">
          <p className="text-xs text-gray-500 mb-1">合計出数</p>
          <p className="text-xl font-bold text-gray-900">{totalQty.toLocaleString()} 食</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-gray-500 mb-1">合計売上高（理論値）</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totalRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-gray-500 mb-1">標準原価合計</p>
          <p className="text-xl font-bold text-orange-700">{formatCurrency(totalStdCost)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{year}年{month}月 出数入力</CardTitle>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-700 hover:bg-blue-800">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "保存中..." : "出数を保存"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {saved && <p className="text-sm text-green-600 mb-4 font-medium">✓ 保存しました。</p>}
          {loading ? (
            <div className="text-center py-12 text-gray-500">読み込み中...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="mb-2">メニューが登録されていません。</p>
              <Link href="/menus/new" className="text-green-700 underline">メニューを登録する</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="text-left py-3 px-4 font-semibold">メニュー名</th>
                    <th className="text-left py-3 px-4 font-semibold">カテゴリ</th>
                    <th className="text-right py-3 px-4 font-semibold">販売価格</th>
                    <th className="text-right py-3 px-4 font-semibold">原価（1品）</th>
                    <th className="text-right py-3 px-4 font-semibold text-blue-700">出数</th>
                    <th className="text-right py-3 px-4 font-semibold">売上高</th>
                    <th className="text-right py-3 px-4 font-semibold text-orange-700">標準原価</th>
                  </tr>
                </thead>
                <tbody>
                  {computedRows.map((row) => {
                    const catColor = row.category ? getCategoryColor(row.category.color) : null;
                    return (
                      <tr key={row.menuId} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium text-gray-900">{row.name}</td>
                        <td className="py-2 px-4">
                          {catColor ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                              {row.category!.name}
                            </span>
                          ) : <span className="text-xs text-gray-400">未分類</span>}
                        </td>
                        <td className="py-2 px-4 text-right">{formatCurrency(row.menuPrice)}</td>
                        <td className="py-2 px-4 text-right text-gray-600">{formatCurrency(row.unitCost)}</td>
                        <td className="py-2 px-4">
                          <Input type="number" min="0" step="1"
                            value={quantities[row.menuId] ?? ""}
                            onChange={(e) => setQuantities((prev) => ({ ...prev, [row.menuId]: e.target.value }))}
                            placeholder="0" className="text-right w-24 ml-auto focus-visible:ring-blue-500" />
                        </td>
                        <td className="py-2 px-4 text-right text-blue-700 font-medium">
                          {row.qty > 0 ? formatCurrency(row.revenue) : "-"}
                        </td>
                        <td className="py-2 px-4 text-right text-orange-700 font-medium">
                          {row.qty > 0 ? formatCurrency(row.stdCost) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                    <td className="py-3 px-4 text-gray-700" colSpan={4}>合計</td>
                    <td className="py-3 px-4 text-right text-gray-900">{totalQty.toLocaleString()} 食</td>
                    <td className="py-3 px-4 text-right text-blue-700">{formatCurrency(totalRevenue)}</td>
                    <td className="py-3 px-4 text-right text-orange-700">{formatCurrency(totalStdCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
