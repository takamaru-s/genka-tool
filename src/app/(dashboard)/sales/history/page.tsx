"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ClipboardList } from "lucide-react";
import { getCategoryColor } from "@/lib/category-colors";

interface MenuRow {
  menuId: string;
  name: string;
  category: { name: string; color: string } | null;
  menuPrice: number;
  monthlyQuantities: Record<string, number>;
  total: number;
}

interface HistoryData {
  months: string[];
  rows: MenuRow[];
  monthlyTotals: Record<string, number>;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${y}年${parseInt(m)}月`;
}

export default function SalesHistoryPage() {
  const now = new Date();
  const [yearFrom, setYearFrom] = useState(now.getFullYear());
  const [monthFrom, setMonthFrom] = useState(1);
  const [yearTo, setYearTo] = useState(now.getFullYear());
  const [monthTo, setMonthTo] = useState(now.getMonth() + 1);
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sales/history?yearFrom=${yearFrom}&monthFrom=${monthFrom}&yearTo=${yearTo}&monthTo=${monthTo}`
      );
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [yearFrom, monthFrom, yearTo, monthTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const monthKeys = data?.months ?? [];
  const rows = data?.rows ?? [];
  const monthlyTotals = data?.monthlyTotals ?? {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">出数履歴（期間指定）</h1>
          <p className="text-sm text-gray-500 mt-1">期間を指定してメニュー別の出数を確認します</p>
        </div>
        <Link href="/sales">
          <Button variant="outline">
            <ClipboardList className="h-4 w-4 mr-2" />
            出数登録に戻る
          </Button>
        </Link>
      </div>

      {/* 期間選択 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-600">開始月:</span>
            <select
              value={yearFrom}
              onChange={(e) => setYearFrom(Number(e.target.value))}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select
              value={monthFrom}
              onChange={(e) => setMonthFrom(Number(e.target.value))}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m) => <option key={m} value={m}>{m}月</option>)}
            </select>

            <span className="text-gray-400 mx-1">〜</span>

            <span className="text-sm font-medium text-gray-600">終了月:</span>
            <select
              value={yearTo}
              onChange={(e) => setYearTo(Number(e.target.value))}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select
              value={monthTo}
              onChange={(e) => setMonthTo(Number(e.target.value))}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m) => <option key={m} value={m}>{m}月</option>)}
            </select>

            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              表示
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-16 text-gray-500">読み込み中...</div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <p className="mb-3">この期間の出数データがありません。</p>
            <Link href="/sales">
              <Button className="bg-blue-700 hover:bg-blue-800">出数を登録する</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {monthLabel(monthKeys[0] ?? "")} 〜 {monthLabel(monthKeys[monthKeys.length - 1] ?? "")}
              　メニュー別出数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="text-left py-3 px-4 font-semibold sticky left-0 bg-gray-50 min-w-[140px]">
                      レシピ名
                    </th>
                    <th className="text-left py-3 px-3 font-semibold min-w-[90px]">カテゴリ</th>
                    {monthKeys.map((key) => (
                      <th key={key} className="text-right py-3 px-3 font-semibold min-w-[70px] whitespace-nowrap">
                        {monthLabel(key)}
                      </th>
                    ))}
                    <th className="text-right py-3 px-4 font-semibold min-w-[70px] bg-blue-50 text-blue-700">
                      合計
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice()
                    .sort((a, b) => b.total - a.total)
                    .map((r) => {
                      const catColor = r.category ? getCategoryColor(r.category.color) : null;
                      return (
                        <tr key={r.menuId} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 px-4 font-medium text-gray-900 sticky left-0 bg-white">
                            {r.name}
                          </td>
                          <td className="py-2 px-3">
                            {catColor ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                                {r.category!.name}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">未分類</span>
                            )}
                          </td>
                          {monthKeys.map((key) => {
                            const qty = r.monthlyQuantities[key] ?? 0;
                            return (
                              <td key={key} className={`py-2 px-3 text-right ${qty === 0 ? "text-gray-300" : "text-gray-700"}`}>
                                {qty > 0 ? qty.toLocaleString() : "-"}
                              </td>
                            );
                          })}
                          <td className="py-2 px-4 text-right font-bold text-blue-700 bg-blue-50">
                            {r.total.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                    <td className="py-3 px-4 text-gray-700" colSpan={2}>月計</td>
                    {monthKeys.map((key) => (
                      <td key={key} className="py-3 px-3 text-right text-gray-700">
                        {(monthlyTotals[key] ?? 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right text-blue-700 bg-blue-50">
                      {rows.reduce((s, r) => s + r.total, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
