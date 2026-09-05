"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings, Users, Clock, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";


interface OpenSession {
  id: string;
  guestCount: number;
  totalAmount: number;
  openedAt: string;
  orderItems: unknown[];
}

interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
  sessions: OpenSession[];
}

function elapsed(openedAt: string) {
  const mins = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000);
  if (mins < 60) return `${mins}分`;
  return `${Math.floor(mins / 60)}時間${mins % 60}分`;
}

export default function PosPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState<Table | null>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [opening, setOpening] = useState(false);

  const fetchTables = useCallback(async () => {
    const res = await fetch("/api/pos/tables");
    if (res.ok) setTables(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleTableClick = (table: Table) => {
    if (table.sessions.length > 0) {
      router.push(`/pos/${table.sessions[0].id}`);
    } else {
      setGuestCount(2);
      setOpenModal(table);
    }
  };

  const handleOpen = async () => {
    if (!openModal) return;
    setOpening(true);
    const res = await fetch("/api/pos/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: openModal.id, guestCount }),
    });
    if (res.ok) {
      const session = await res.json();
      router.push(`/pos/${session.id}`);
    }
    setOpening(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POSレジ</h1>
          <p className="text-gray-500 text-sm mt-1">テーブルをタップして注文を開始</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTables}>更新</Button>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />テーブル設定
            </Button>
          </Link>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ChefHat className="h-16 w-16 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">テーブルが登録されていません</p>
          <Link href="/settings">
            <Button className="bg-blue-700 hover:bg-blue-800">
              <Plus className="h-4 w-4 mr-2" />テーブルを追加
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const session = table.sessions[0];
            const occupied = !!session;
            return (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`relative rounded-2xl p-4 text-left transition-all shadow-sm border-2 active:scale-95 ${
                  occupied
                    ? "bg-red-50 border-red-400 hover:bg-red-100"
                    : "bg-green-50 border-green-400 hover:bg-green-100"
                }`}
              >
                <div className={`text-xs font-bold mb-1 ${occupied ? "text-red-500" : "text-green-600"}`}>
                  {occupied ? "●使用中" : "○空席"}
                </div>
                <div className="font-bold text-gray-900 text-lg leading-tight">{table.name}</div>
                <div className="text-xs text-gray-500">No.{table.number} / {table.capacity}席</div>
                {occupied && session && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <Users className="h-3 w-3" />{session.guestCount}名
                    </div>
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <Clock className="h-3 w-3" />{elapsed(session.openedAt)}
                    </div>
                    <div className="text-sm font-bold text-red-700">
                      ¥{session.totalAmount.toLocaleString()}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 来店人数入力モーダル */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4">
            <h2 className="text-lg font-bold mb-1">{openModal.name}</h2>
            <p className="text-sm text-gray-500 mb-5">来店人数を入力してください</p>
            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-2xl font-bold flex items-center justify-center"
              >−</button>
              <span className="text-4xl font-bold w-16 text-center">{guestCount}</span>
              <button
                onClick={() => setGuestCount((n) => Math.min(openModal.capacity, n + 1))}
                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-2xl font-bold flex items-center justify-center"
              >＋</button>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setOpenModal(null)}>キャンセル</Button>
              <Button className="flex-1 bg-blue-700 hover:bg-blue-800" onClick={handleOpen} disabled={opening}>
                {opening ? "開始中..." : "注文開始"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
