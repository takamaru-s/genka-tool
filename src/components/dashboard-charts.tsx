"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MonthStat {
  month: number;
  sales: number;
  guests: number;
  sessions: number;
  avgSpend: number;
}

interface TrendData {
  thisYear: MonthStat[];
  lastYear: MonthStat[];
  year: number;
}

// ---- palette (blue-600 今年, blue-200 前年) ----
const COLOR_THIS  = "#2563eb"; // blue-600
const COLOR_LAST  = "#bfdbfe"; // blue-200
const COLOR_SPEND = "#d97706"; // amber-600

const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

function yoyBadge(cur: number, prev: number) {
  if (prev === 0) return null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up = pct > 0;
  const zero = pct === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
      zero ? "text-gray-500 bg-gray-100"
           : up ? "text-green-700 bg-green-100"
                : "text-red-600 bg-red-100"
    }`}>
      {zero ? <Minus className="h-3 w-3" /> : up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}

function fmtCurrency(v: number) {
  return v >= 10000
    ? `¥${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}万`
    : `¥${v.toLocaleString()}`;
}

function YoYCard({ label, cur, prev, format }: { label: string; cur: number; prev: number; format: (v: number) => string }) {
  const badge = yoyBadge(cur, prev);
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}（前年同月比）</p>
      <div className="flex items-end gap-2 flex-wrap">
        <p className="text-xl font-bold text-gray-900">{format(cur)}</p>
        {badge}
      </div>
      <p className="text-xs text-gray-400 mt-1">前年: {format(prev)}</p>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 12,
};

export function DashboardCharts({ currentMonth }: { currentMonth: number }) {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const year = new Date().getFullYear();
    fetch(`/api/dashboard/sales-trend?year=${year}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400">
      <div className="animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
  if (!data) return null;

  const m = currentMonth - 1; // 0-based index
  const curMonth  = data.thisYear[m];
  const prevMonth = data.lastYear[m];

  // チャート用データ（今年のデータがある月まで）
  const chartData = MONTHS.map((label, i) => ({
    label,
    今年: data.thisYear[i].sales,
    前年: data.lastYear[i].sales,
    今年来客: data.thisYear[i].guests,
    前年来客: data.lastYear[i].guests,
    今年客単価: data.thisYear[i].avgSpend,
    前年客単価: data.lastYear[i].avgSpend,
  }));

  return (
    <div>
      {/* 前年比カード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <YoYCard
          label={`${currentMonth}月売上`}
          cur={curMonth.sales}
          prev={prevMonth.sales}
          format={fmtCurrency}
        />
        <YoYCard
          label={`${currentMonth}月来客数`}
          cur={curMonth.guests}
          prev={prevMonth.guests}
          format={(v) => `${v}名`}
        />
        <YoYCard
          label={`${currentMonth}月客単価`}
          cur={curMonth.avgSpend}
          prev={prevMonth.avgSpend}
          format={fmtCurrency}
        />
      </div>

      {/* 月間売上チャート */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">月間売上（今年 vs 前年）</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => [fmtCurrency(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="前年" fill={COLOR_LAST} radius={[4, 4, 0, 0]} />
            <Bar dataKey="今年" fill={COLOR_THIS} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 客単価チャート */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">月間客単価（今年 vs 前年）</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => [fmtCurrency(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="前年客単価" name="前年" stroke={COLOR_LAST} strokeWidth={2} dot={{ r: 3, fill: COLOR_LAST, strokeWidth: 0 }} />
            <Line dataKey="今年客単価" name="今年" stroke={COLOR_SPEND} strokeWidth={2} dot={{ r: 4, fill: COLOR_SPEND, strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
