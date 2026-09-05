"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Table { id: string; number: number; name: string; capacity: number; }

export default function TableSettingsPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ number: 0, name: "", capacity: 4 });
  const [newData, setNewData] = useState({ number: "", name: "", capacity: "4" });
  const [adding, setAdding] = useState(false);

  const fetchTables = useCallback(async () => {
    const res = await fetch("/api/pos/tables");
    if (res.ok) setTables(await res.json());
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleAdd = async () => {
    if (!newData.number || !newData.name) return;
    setAdding(true);
    await fetch("/api/pos/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: Number(newData.number), name: newData.name, capacity: Number(newData.capacity) }),
    });
    setNewData({ number: "", name: "", capacity: "4" });
    await fetchTables();
    setAdding(false);
  };

  const handleEdit = (table: Table) => {
    setEditId(table.id);
    setEditData({ number: table.number, name: table.name, capacity: table.capacity });
  };

  const handleSave = async (id: string) => {
    await fetch(`/api/pos/tables/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    setEditId(null);
    fetchTables();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このテーブルを削除しますか？")) return;
    await fetch(`/api/pos/tables/${id}`, { method: "DELETE" });
    fetchTables();
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pos">
          <button className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">テーブル設定</h1>
          <p className="text-sm text-gray-500">テーブル番号・名前・席数を管理します</p>
        </div>
      </div>

      {/* 新規追加フォーム */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-1">
          <Plus className="h-4 w-4" />テーブルを追加
        </h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">番号</label>
            <input type="number" min="1" value={newData.number} onChange={(e) => setNewData((p) => ({ ...p, number: e.target.value }))}
              placeholder="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-1">
            <label className="text-xs text-gray-600 mb-1 block">名前</label>
            <input type="text" value={newData.name} onChange={(e) => setNewData((p) => ({ ...p, name: e.target.value }))}
              placeholder="テーブル1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">席数</label>
            <input type="number" min="1" value={newData.capacity} onChange={(e) => setNewData((p) => ({ ...p, capacity: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={adding || !newData.number || !newData.name} className="bg-blue-700 hover:bg-blue-800 w-full">
          {adding ? "追加中..." : "追加"}
        </Button>
      </div>

      {/* テーブル一覧 */}
      <div className="space-y-2">
        {tables.length === 0 && <p className="text-gray-400 text-sm text-center py-8">テーブルがありません</p>}
        {tables.map((table) => (
          <div key={table.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            {editId === table.id ? (
              <div className="flex items-center gap-2">
                <input type="number" value={editData.number} onChange={(e) => setEditData((p) => ({ ...p, number: Number(e.target.value) }))}
                  className="w-16 border rounded px-2 py-1 text-sm" />
                <input type="text" value={editData.name} onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                  className="flex-1 border rounded px-2 py-1 text-sm" />
                <input type="number" value={editData.capacity} onChange={(e) => setEditData((p) => ({ ...p, capacity: Number(e.target.value) }))}
                  className="w-16 border rounded px-2 py-1 text-sm" />
                <button onClick={() => handleSave(table.id)} className="text-green-600 hover:text-green-800"><Check className="h-4 w-4" /></button>
                <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{table.name}</span>
                  <span className="text-xs text-gray-500 ml-2">No.{table.number} / {table.capacity}席</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(table)} className="text-gray-400 hover:text-blue-600"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(table.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
