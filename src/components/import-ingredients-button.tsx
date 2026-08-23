"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Download, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const TEMPLATE_CSV =
  "食材名,単位,内容量,仕入価格（円）\r\n" +
  "牛ひき肉,g,1000,800\r\n" +
  "玉ねぎ,個,10,200\r\n";

type Result = { created: number; updated: number; skipped: number; errors: string[] };

export function ImportIngredientsButton() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [mode, setMode] = useState<"skip" | "overwrite">("skip");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string ?? "");
    reader.readAsText(file, "utf-8");
  };

  const handleSubmit = async () => {
    if (!csvText) { setError("ファイルを選択してください。"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/import/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, mode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "インポートに失敗しました。"); return; }
      setResult(data);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFileName("");
    setCsvText("");
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const bom = "﻿";
    const blob = new Blob([bom + TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ingredients_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        CSVインポート
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">食材CSVインポート</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* テンプレート */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-semibold mb-1">CSVフォーマット</p>
              <code className="text-xs">食材名,単位,内容量,仕入価格（円）</code>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1 mt-2 text-blue-700 hover:text-blue-900 underline text-xs"
              >
                <Download className="h-3 w-3" />
                テンプレートをダウンロード
              </button>
            </div>

            {/* ファイル選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">CSVファイル</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {fileName && <p className="mt-1 text-xs text-gray-500">選択: {fileName}</p>}
            </div>

            {/* 重複時の動作 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">同名の食材が既にある場合</label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="skip"
                    checked={mode === "skip"}
                    onChange={() => setMode("skip")}
                    className="accent-blue-600"
                  />
                  スキップ（既存を保持）
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="overwrite"
                    checked={mode === "overwrite"}
                    onChange={() => setMode("overwrite")}
                    className="accent-blue-600"
                  />
                  上書き更新
                </label>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
                  <CheckCircle className="h-4 w-4" />
                  インポート完了
                </div>
                <p className="text-gray-700">新規追加: {result.created}件　更新: {result.updated}件　スキップ: {result.skipped}件</p>
                {result.errors.length > 0 && (
                  <ul className="mt-2 text-red-600 text-xs space-y-0.5">
                    {result.errors.map((e, i) => <li key={i}>・{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>閉じる</Button>
              {!result && (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !csvText}
                  className="bg-blue-700 hover:bg-blue-800"
                >
                  {loading ? "インポート中..." : "インポート実行"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
