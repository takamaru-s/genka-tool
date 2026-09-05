"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, HardDrive, Database, FileText, Key, Eye, EyeOff, CheckCircle, Trash2, Wifi, LayoutGrid, Plus, Edit2, X, Check } from "lucide-react";

export default function SettingsPage() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupResult, setBackupResult] = useState<{ success?: string; error?: string } | null>(null);

  const [lanUrl, setLanUrl] = useState("");

  useEffect(() => {
    fetch("/api/lan-info").then((r) => r.json()).then((d) => setLanUrl(d.url));
  }, []);

  // テーブル管理
  interface TableRow { id: string; number: number; name: string; capacity: number; }
  const [tables, setTables] = useState<TableRow[]>([]);
  const [tableEditId, setTableEditId] = useState<string | null>(null);
  const [tableEditData, setTableEditData] = useState({ number: 0, name: "", capacity: 4 });
  const [newTable, setNewTable] = useState({ number: "", name: "", capacity: "4" });
  const [tableAdding, setTableAdding] = useState(false);

  const fetchTables = async () => {
    const res = await fetch("/api/pos/tables");
    if (res.ok) setTables(await res.json());
  };
  useEffect(() => { fetchTables(); }, []);

  const handleTableAdd = async () => {
    if (!newTable.number || !newTable.name) return;
    setTableAdding(true);
    await fetch("/api/pos/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: Number(newTable.number), name: newTable.name, capacity: Number(newTable.capacity) }),
    });
    setNewTable({ number: "", name: "", capacity: "4" });
    await fetchTables();
    setTableAdding(false);
  };

  const handleTableSave = async (id: string) => {
    await fetch(`/api/pos/tables/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tableEditData),
    });
    setTableEditId(null);
    fetchTables();
  };

  const handleTableDelete = async (id: string) => {
    if (!confirm("このテーブルを削除しますか？")) return;
    await fetch(`/api/pos/tables/${id}`, { method: "DELETE" });
    fetchTables();
  };

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyResult, setKeyResult] = useState<{ success?: string; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      setHasKey(d.hasKey);
      setMaskedKey(d.masked ?? "");
    });
  }, []);

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupResult(null);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setBackupResult({ success: `バックアップを保存しました: ${data.filename}` });
      } else {
        setBackupResult({ error: data.error || "バックアップに失敗しました。" });
      }
    } catch {
      setBackupResult({ error: "通信エラーが発生しました。" });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleSaveKey = async () => {
    setKeyLoading(true);
    setKeyResult(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setHasKey(true);
        setMaskedKey(apiKey.slice(0, 8) + "•".repeat(Math.min(apiKey.length - 8, 20)));
        setApiKey("");
        setKeyResult({ success: "APIキーを保存しました。" });
      } else {
        setKeyResult({ error: data.error });
      }
    } catch {
      setKeyResult({ error: "通信エラーが発生しました。" });
    } finally {
      setKeyLoading(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!confirm("APIキーを削除しますか？")) return;
    await fetch("/api/settings", { method: "DELETE" });
    setHasKey(false);
    setMaskedKey("");
    setKeyResult({ success: "APIキーを削除しました。" });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-sm text-gray-500 mt-1">データ管理・バックアップ</p>
      </div>

      <div className="space-y-6 max-w-2xl">

        {/* Anthropic APIキー */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-700" />
              Anthropic APIキー（レシートOCR用）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              レシート読み取り機能を使用するにはAnthropicのAPIキーが必要です。
              <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer"
                className="text-blue-700 underline ml-1">Anthropic Console</a>
              で取得できます。
            </p>

            {hasKey && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800">APIキー登録済み</p>
                  <p className="text-xs text-green-600 font-mono truncate">{maskedKey}</p>
                </div>
                <button onClick={handleDeleteKey} className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder={hasKey ? "新しいAPIキーで上書きする場合は入力" : "sk-ant-..."}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                onClick={handleSaveKey}
                disabled={keyLoading || !apiKey}
                className="bg-amber-800 hover:bg-amber-900 shrink-0"
              >
                {keyLoading ? "保存中..." : "保存"}
              </Button>
            </div>

            {keyResult?.success && (
              <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded">✓ {keyResult.success}</p>
            )}
            {keyResult?.error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded">✗ {keyResult.error}</p>
            )}
          </CardContent>
        </Card>

        {/* テーブル管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-amber-700" />
              POSレジ テーブル管理
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 新規追加 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1"><Plus className="h-3.5 w-3.5" />テーブルを追加</p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1">番号</p>
                  <Input type="number" min="1" value={newTable.number} onChange={(e) => setNewTable((p) => ({ ...p, number: e.target.value }))} placeholder="1" className="h-8 text-sm" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">名前</p>
                  <Input type="text" value={newTable.name} onChange={(e) => setNewTable((p) => ({ ...p, name: e.target.value }))} placeholder="テーブル1" className="h-8 text-sm" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">席数</p>
                  <Input type="number" min="1" value={newTable.capacity} onChange={(e) => setNewTable((p) => ({ ...p, capacity: e.target.value }))} className="h-8 text-sm" />
                </div>
              </div>
              <Button onClick={handleTableAdd} disabled={tableAdding || !newTable.number || !newTable.name} size="sm" className="bg-blue-700 hover:bg-blue-800 w-full">
                {tableAdding ? "追加中..." : "追加"}
              </Button>
            </div>

            {/* テーブル一覧 */}
            <div className="space-y-2">
              {tables.length === 0 && <p className="text-sm text-gray-400 text-center py-4">テーブルが登録されていません</p>}
              {tables.map((table) => (
                <div key={table.id} className="border border-gray-200 rounded-lg px-3 py-2">
                  {tableEditId === table.id ? (
                    <div className="flex items-center gap-2">
                      <Input type="number" value={tableEditData.number} onChange={(e) => setTableEditData((p) => ({ ...p, number: Number(e.target.value) }))} className="w-16 h-8 text-sm" />
                      <Input type="text" value={tableEditData.name} onChange={(e) => setTableEditData((p) => ({ ...p, name: e.target.value }))} className="flex-1 h-8 text-sm" />
                      <Input type="number" value={tableEditData.capacity} onChange={(e) => setTableEditData((p) => ({ ...p, capacity: Number(e.target.value) }))} className="w-16 h-8 text-sm" />
                      <button onClick={() => handleTableSave(table.id)} className="text-green-600 hover:text-green-800"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setTableEditId(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="flex-1">
                        <span className="font-medium text-sm text-gray-900">{table.name}</span>
                        <span className="text-xs text-gray-500 ml-2">No.{table.number} / {table.capacity}席</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setTableEditId(table.id); setTableEditData({ number: table.number, name: table.name, capacity: table.capacity }); }} className="text-gray-400 hover:text-blue-600"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleTableDelete(table.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* バックアップ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-amber-700" />
              データバックアップ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              データベースファイルを <code className="bg-gray-100 px-1 rounded">backups/</code> フォルダに日付付きでコピーします。
            </p>
            <Button onClick={handleBackup} disabled={backupLoading} className="bg-amber-800 hover:bg-amber-900">
              <Database className="h-4 w-4 mr-2" />
              {backupLoading ? "バックアップ中..." : "今すぐバックアップ"}
            </Button>
            {backupResult?.success && (
              <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded">✓ {backupResult.success}</p>
            )}
            {backupResult?.error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded">✗ {backupResult.error}</p>
            )}
          </CardContent>
        </Card>

        {/* CSVエクスポート */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-700" />
              CSVエクスポート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              各データをCSVファイルとしてダウンロードできます。Excel で開けます。
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-sm">食材一覧</p>
                  <p className="text-xs text-gray-500">登録済みの食材・仕入価格データ</p>
                </div>
                <a href="/api/export/ingredients" download>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />ダウンロード</Button>
                </a>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-sm">レシピ一覧</p>
                  <p className="text-xs text-gray-500">合計原価・単位原価を含むレシピデータ</p>
                </div>
                <a href="/api/export/recipes" download>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />ダウンロード</Button>
                </a>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">棚卸履歴</p>
                  <p className="text-xs text-gray-500">棚卸入力データの全履歴</p>
                </div>
                <a href="/api/export/inventory" download>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />ダウンロード</Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* スマホ・LANアクセス */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-amber-700" />
              スマホ・他端末からのアクセス
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              同じWi-Fiに接続したスマホやタブレットのブラウザから以下のURLでアクセスできます。
            </p>
            {lanUrl && lanUrl !== "http://localhost:3000" ? (
              <>
                <code className="block bg-blue-50 border border-blue-200 px-4 py-3 rounded text-sm text-blue-800 font-mono select-all">
                  {lanUrl}
                </code>
                <p className="text-xs text-gray-500 mt-2">
                  ※ このPCと同じWi-Fiネットワーク内でのみ有効です。PCのIPアドレスが変わると変わることがあります。
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">ネットワークに接続されていない場合は表示されません。</p>
            )}
          </CardContent>
        </Card>

        {/* データ保存場所 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-amber-700" />
              データ保存場所
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">すべてのデータはこのPC内に保存されています。</p>
            <code className="block bg-gray-100 px-4 py-3 rounded text-sm text-gray-700">
              genka-tool\prisma\dev.db
            </code>
            <p className="text-xs text-gray-500 mt-2">
              このファイルをコピーすることで手動バックアップも可能です。
            </p>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-12 pt-6 border-t text-center text-xs text-gray-400">
        &copy; 佐道中小企業診断士事務所、フードビジネス研究会
      </footer>
    </div>
  );
}
