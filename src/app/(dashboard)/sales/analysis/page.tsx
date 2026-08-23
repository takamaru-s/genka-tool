"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ClipboardList } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { getCategoryColor } from "@/lib/category-colors";

interface RecipeAnalysis {
  recipeId: string;
  name: string;
  category: { name: string; color: string } | null;
  menuPrice: number;
  unitCost: number;
  costRate: number;
  quantity: number;
  revenue: number;
  stdCost: number;
  cumulativeRatio: number;
  abc: "A" | "B" | "C";
}

interface AnalysisSummary {
  totalRevenue: number;
  totalStdCost: number;
  actualIngredientCost: number;
  variance: number;
  varianceRate: number;
  hasInventoryData: boolean;
}

interface AnalysisData {
  recipes: RecipeAnalysis[];
  summary: AnalysisSummary;
}

const ABC_STYLES = {
  A: { bg: "bg-blue-600",  text: "text-white", label: "A" },
  B: { bg: "bg-teal-500",  text: "text-white", label: "B" },
  C: { bg: "bg-gray-400",  text: "text-white", label: "C" },
};

export default function SalesAnalysisPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/analysis?year=${year}&month=${month}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const summary = data?.summary;
  const recipes = data?.recipes ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ABC分析・標準原価差異</h1>
          <p className="text-sm text-gray-500 mt-1">
            売上高構成比によるABC分類と標準原価差異を表示します
          </p>
        </div>
        <Link href="/sales">
          <Button variant="outline">
            <ClipboardList className="h-4 w-4 mr-2" />
            出数登録に戻る
          </Button>
        </Link>
      </div>

      {/* 年月選択 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
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

      {loading ? (
        <div className="text-center py-16 text-gray-500">読み込み中...</div>
      ) : !data || recipes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <p className="mb-3">この月の出数データがありません。</p>
            <Link href="/sales">
              <Button className="bg-blue-700 hover:bg-blue-800">出数を登録する</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 標準原価差異サマリー */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 mb-1">合計売上高（理論値）</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(summary!.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 mb-1">標準原価合計</p>
                <p className="text-xl font-bold text-orange-700">{formatCurrency(summary!.totalStdCost)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  原価率 {formatPercent(summary!.totalRevenue > 0 ? summary!.totalStdCost / summary!.totalRevenue * 100 : 0)}
                </p>
              </CardContent>
            </Card>
            <Card className={summary!.hasInventoryData ? "border-gray-200" : "border-gray-200 bg-gray-50"}>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 mb-1">実際食材費</p>
                {summary!.hasInventoryData ? (
                  <p className="text-xl font-bold text-purple-700">{formatCurrency(summary!.actualIngredientCost)}</p>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">月間棚卸データなし</p>
                )}
              </CardContent>
            </Card>
            {summary!.hasInventoryData && (
              <>
                <Card className={`col-span-2 md:col-span-1 ${summary!.variance > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
                  <CardContent className="pt-5">
                    <p className="text-xs text-gray-500 mb-1">標準原価差異（実際 − 標準）</p>
                    <p className={`text-xl font-bold ${summary!.variance > 0 ? "text-red-700" : "text-green-700"}`}>
                      {summary!.variance >= 0 ? "+" : ""}{formatCurrency(summary!.variance)}
                    </p>
                    <p className={`text-xs mt-1 ${summary!.variance > 0 ? "text-red-500" : "text-green-500"}`}>
                      {summary!.variance > 0 ? "▲ 不利差異（食材ロスの可能性）" : "▼ 有利差異"}
                    </p>
                  </CardContent>
                </Card>
                <Card className={`${summary!.variance > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
                  <CardContent className="pt-5">
                    <p className="text-xs text-gray-500 mb-1">差異率（差異 ÷ 標準原価）</p>
                    <p className={`text-xl font-bold ${summary!.variance > 0 ? "text-red-700" : "text-green-700"}`}>
                      {summary!.varianceRate >= 0 ? "+" : ""}{formatPercent(Math.abs(summary!.varianceRate))}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* ABC分析凡例 */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="text-gray-500 font-medium">ABC分類:</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-blue-600 text-white text-xs font-bold flex items-center justify-center leading-none">A</span>
              <span className="text-gray-600">売上上位70%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-teal-500 text-white text-xs font-bold flex items-center justify-center leading-none">B</span>
              <span className="text-gray-600">〜90%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-gray-400 text-white text-xs font-bold flex items-center justify-center leading-none">C</span>
              <span className="text-gray-600">残り10%</span>
            </span>
          </div>

          {/* ABC分析テーブル */}
          <Card>
            <CardHeader>
              <CardTitle>{year}年{month}月 アイテム別分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-600">
                      <th className="text-center py-3 px-3 font-semibold w-10">ABC</th>
                      <th className="text-left py-3 px-4 font-semibold">レシピ名</th>
                      <th className="text-left py-3 px-4 font-semibold">カテゴリ</th>
                      <th className="text-right py-3 px-4 font-semibold">出数</th>
                      <th className="text-right py-3 px-4 font-semibold">売上高</th>
                      <th className="text-right py-3 px-4 font-semibold">売上構成比</th>
                      <th className="text-right py-3 px-4 font-semibold">累計構成比</th>
                      <th className="text-right py-3 px-4 font-semibold">原価率</th>
                      <th className="text-right py-3 px-4 font-semibold text-orange-700">標準原価合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipes.map((r) => {
                      const catColor = r.category ? getCategoryColor(r.category.color) : null;
                      const abcStyle = ABC_STYLES[r.abc];
                      const revenueRatio = summary!.totalRevenue > 0
                        ? (r.revenue / summary!.totalRevenue) * 100 : 0;
                      return (
                        <tr key={r.recipeId} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${abcStyle.bg} ${abcStyle.text}`}>
                              {abcStyle.label}
                            </span>
                          </td>
                          <td className="py-2 px-4 font-medium text-gray-900">{r.name}</td>
                          <td className="py-2 px-4">
                            {catColor ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                                {r.category!.name}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">未分類</span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-right font-medium">{r.quantity.toLocaleString()}</td>
                          <td className="py-2 px-4 text-right text-blue-700">{formatCurrency(r.revenue)}</td>
                          <td className="py-2 px-4 text-right text-gray-600">{formatPercent(revenueRatio)}</td>
                          <td className="py-2 px-4 text-right">
                            <span className={`font-medium ${r.abc === "A" ? "text-blue-600" : r.abc === "B" ? "text-teal-600" : "text-gray-500"}`}>
                              {formatPercent(r.cumulativeRatio * 100)}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <span className={r.costRate > 40 ? "text-red-600 font-medium" : r.costRate > 30 ? "text-yellow-600" : "text-green-600"}>
                              {formatPercent(r.costRate)}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right text-orange-700 font-medium">
                            {formatCurrency(r.stdCost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                      <td className="py-3 px-4 text-gray-700" colSpan={3}>合計</td>
                      <td className="py-3 px-4 text-right">{recipes.reduce((s, r) => s + r.quantity, 0).toLocaleString()} 食</td>
                      <td className="py-3 px-4 text-right text-blue-700">{formatCurrency(summary!.totalRevenue)}</td>
                      <td className="py-3 px-4 text-right text-gray-500">100%</td>
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {formatPercent(summary!.totalRevenue > 0 ? summary!.totalStdCost / summary!.totalRevenue * 100 : 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-orange-700">{formatCurrency(summary!.totalStdCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {!summary!.hasInventoryData && (
                <p className="mt-4 text-xs text-gray-400">
                  ※ 標準原価差異を計算するには、
                  <Link href="/inventory/monthly" className="text-blue-600 underline">月間棚卸表</Link>
                  で仕入高と棚卸データを登録してください。
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
