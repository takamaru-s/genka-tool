"use client";

import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, BarChart2 } from "lucide-react";

interface ReportRow {
  key: string;
  sales: number;
  guests: number;
  sessions: number;
  avgSpend: number;
}

function fmt(v: number) {
  return `¥${v.toLocaleString()}`;
}
function fmtAxis(v: number) {
  return v >= 10000 ? `¥${(v / 10000).toFixed(0)}万` : `¥${v.toLocaleString()}`;
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 12,
};

function SmallChart({
  title, data, dataKey, color, yFormatter,
}: {
  title: string;
  data: ReportRow[];
  dataKey: keyof ReportRow;
  color: string;
  yFormatter: (v: number) => string;
}) {
  const isSales = dataKey === "sales";
  const isSpend = dataKey === "avgSpend";
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        {isSales || !isSpend ? (
          <BarChart data={data} barCategoryGap="40%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="key" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
              interval="preserveStartEnd" />
            <YAxis tickFormatter={yFormatter} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={52} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [yFormatter(Number(v ?? 0)), title]} />
            <Bar dataKey={dataKey as string} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="key" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
              interval="preserveStartEnd" />
            <YAxis tickFormatter={yFormatter} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={52} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [yFormatter(Number(v ?? 0)), title]} />
            <Line dataKey={dataKey as string} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color, strokeWidth: 0 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default function ReportsPage() {
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo   = now.toISOString().split("T")[0];

  const [from, setFrom]     = useState(defaultFrom);
  const [to, setTo]         = useState(defaultTo);
  const [unit, setUnit]     = useState<"day" | "month">("day");
  const [rows, setRows]     = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/sales?from=${from}&to=${to}&unit=${unit}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows);
        setGenerated(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const totalSales   = rows.reduce((s, r) => s + r.sales, 0);
  const totalGuests  = rows.reduce((s, r) => s + r.guests, 0);
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);
  const avgSpendTotal = totalGuests > 0 ? Math.round(totalSales / totalGuests) : 0;

  const handleCsv = () => {
    const header = "日付,売上,来客数,客単価,精算件数\n";
    const body = rows.map((r) =>
      `${r.key},${r.sales},${r.guests},${r.avgSpend},${r.sessions}`
    ).join("\n");
    const footer = `\n合計,${totalSales},${totalGuests},${avgSpendTotal},${totalSessions}`;
    const blob = new Blob(["﻿" + header + body + footer], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `売上レポート_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">売上レポート</h1>
        <p className="text-sm text-gray-500 mt-1">期間を指定して売上・来客数・客単価の推移を確認できます</p>
      </div>

      {/* 条件指定 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">開始日</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">終了日</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">集計単位</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value as "day" | "month")}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="day">日別</option>
                <option value="month">月別</option>
              </select>
            </div>
            <Button onClick={handleGenerate} disabled={loading} className="bg-blue-700 hover:bg-blue-800">
              <BarChart2 className="h-4 w-4 mr-2" />
              {loading ? "生成中..." : "レポート生成"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generated && rows.length > 0 && (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "期間売上合計",   value: fmt(totalSales),         color: "text-blue-700" },
              { label: "期間来客数合計", value: `${totalGuests}名`,       color: "text-green-700" },
              { label: "期間平均客単価", value: fmt(avgSpendTotal),       color: "text-amber-700" },
              { label: "精算件数合計",   value: `${totalSessions}件`,     color: "text-purple-700" },
            ].map((c) => (
              <Card key={c.label}>
                <CardContent className="pt-5">
                  <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                  <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* チャート3枚 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SmallChart title="売上推移" data={rows} dataKey="sales"    color="#2563eb" yFormatter={fmtAxis} />
            <SmallChart title="来客数推移" data={rows} dataKey="guests"  color="#16a34a" yFormatter={(v) => `${v}名`} />
            <SmallChart title="客単価推移" data={rows} dataKey="avgSpend" color="#d97706" yFormatter={fmtAxis} />
          </div>

          {/* 明細テーブル */}
          <Card>
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <h2 className="font-semibold text-gray-800">明細</h2>
              <button onClick={handleCsv}
                className="flex items-center gap-1 text-xs text-blue-700 hover:underline border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
                <Download className="h-3.5 w-3.5" />CSVダウンロード
              </button>
            </div>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-4 font-semibold text-gray-600">日付</th>
                      <th className="text-right py-2 px-4 font-semibold text-blue-700">売上</th>
                      <th className="text-right py-2 px-4 font-semibold text-green-700">来客数</th>
                      <th className="text-right py-2 px-4 font-semibold text-amber-700">客単価</th>
                      <th className="text-right py-2 px-4 font-semibold text-gray-600">精算件数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-4 text-gray-700">{r.key}</td>
                        <td className="py-2 px-4 text-right font-medium text-blue-700">{r.sales > 0 ? fmt(r.sales) : "—"}</td>
                        <td className="py-2 px-4 text-right text-green-700">{r.guests > 0 ? `${r.guests}名` : "—"}</td>
                        <td className="py-2 px-4 text-right text-amber-700">{r.avgSpend > 0 ? fmt(r.avgSpend) : "—"}</td>
                        <td className="py-2 px-4 text-right text-gray-600">{r.sessions > 0 ? `${r.sessions}件` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                      <td className="py-3 px-4 text-gray-700">合計</td>
                      <td className="py-3 px-4 text-right text-blue-700">{fmt(totalSales)}</td>
                      <td className="py-3 px-4 text-right text-green-700">{totalGuests}名</td>
                      <td className="py-3 px-4 text-right text-amber-700">{fmt(avgSpendTotal)}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{totalSessions}件</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {generated && rows.length > 0 && rows.every((r) => r.sessions === 0) && (
        <div className="text-center py-16 text-gray-400">
          指定期間にPOSレジの精算データがありません。
        </div>
      )}

      {!generated && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <BarChart2 className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-sm">期間を選択して「レポート生成」を押してください</p>
        </div>
      )}
    </div>
  );
}
