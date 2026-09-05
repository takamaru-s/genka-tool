"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Minus, ShoppingCart, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MenuCategory { id: string; name: string; color: string; }
interface MenuItem { id: string; name: string; menuPrice: number; category: MenuCategory | null; }
interface OrderLine { menuId: string; name: string; unitPrice: number; quantity: number; }
interface Session {
  id: string;
  guestCount: number;
  totalAmount: number;
  status: string;
  table: { name: string; number: number; capacity: number };
  orderItems: { menuId: string; quantity: number; unitPrice: number; menu: { name: string } }[];
}

export default function PosOrderPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [order, setOrder] = useState<Record<string, OrderLine>>({});
  const [saving, setSaving] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [guestCount, setGuestCount] = useState(2);

  const fetchData = useCallback(async () => {
    const [sessionRes, menuRes, catRes] = await Promise.all([
      fetch(`/api/pos/sessions/${sessionId}`),
      fetch("/api/menus"),
      fetch("/api/categories"),
    ]);
    if (sessionRes.ok) {
      const s: Session = await sessionRes.json();
      setSession(s);
      setGuestCount(s.guestCount);
      const initial: Record<string, OrderLine> = {};
      s.orderItems.forEach((item) => {
        initial[item.menuId] = { menuId: item.menuId, name: item.menu.name, unitPrice: item.unitPrice, quantity: item.quantity };
      });
      setOrder(initial);
    }
    if (menuRes.ok) setMenus(await menuRes.json());
    if (catRes.ok) setCategories(await catRes.json());
  }, [sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addItem = (menu: MenuItem) => {
    setOrder((prev) => {
      const existing = prev[menu.id];
      return { ...prev, [menu.id]: { menuId: menu.id, name: menu.name, unitPrice: menu.menuPrice, quantity: (existing?.quantity ?? 0) + 1 } };
    });
  };

  const changeQty = (menuId: string, delta: number) => {
    setOrder((prev) => {
      const cur = prev[menuId];
      if (!cur) return prev;
      const next = cur.quantity + delta;
      if (next <= 0) {
        const { [menuId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [menuId]: { ...cur, quantity: next } };
    });
  };

  const saveOrder = async () => {
    setSaving(true);
    await fetch(`/api/pos/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: Object.values(order),
        guestCount,
      }),
    });
    setSaving(false);
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    await saveOrder();
    const res = await fetch(`/api/pos/sessions/${sessionId}/checkout`, { method: "POST" });
    if (res.ok) {
      setCheckingOut(false);
      setShowCheckout(false);
      router.push("/pos");
    } else {
      setCheckingOut(false);
    }
  };

  const totalAmount = Object.values(order).reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const itemCount = Object.values(order).reduce((s, i) => s + i.quantity, 0);

  const filteredMenus = selectedCategory
    ? menus.filter((m) => m.category?.id === selectedCategory)
    : menus;

  if (!session) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { saveOrder(); router.push("/pos"); }} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">{session.table.name}</h1>
          <p className="text-xs text-gray-500">No.{session.table.number} / {guestCount}名</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-sm flex items-center justify-center">−</button>
          <span className="text-sm font-semibold w-12 text-center">{guestCount}名</span>
          <button onClick={() => setGuestCount((n) => Math.min(session.table.capacity, n + 1))}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-sm flex items-center justify-center">＋</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
        {/* 左：メニュー選択 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* カテゴリタブ */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 shrink-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                !selectedCategory ? "bg-blue-700 text-white border-blue-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >すべて</button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedCategory === cat.id ? "bg-blue-700 text-white border-blue-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >{cat.name}</button>
            ))}
          </div>

          {/* メニューボタングリッド */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto">
            {filteredMenus.map((menu) => {
              const qty = order[menu.id]?.quantity ?? 0;
              return (
                <button key={menu.id} onClick={() => addItem(menu)}
                  className={`relative rounded-xl p-3 text-left border-2 transition-all active:scale-95 ${
                    qty > 0 ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  {qty > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {qty}
                    </span>
                  )}
                  <p className="text-sm font-medium text-gray-800 leading-tight pr-4">{menu.name}</p>
                  <p className="text-xs font-bold text-amber-700 mt-1">¥{menu.menuPrice.toLocaleString()}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 右：注文一覧 */}
        <div className="md:w-64 flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shrink-0">
          <div className="p-3 border-b bg-white">
            <div className="flex items-center gap-2 font-semibold text-gray-700">
              <ShoppingCart className="h-4 w-4" />
              注文 ({itemCount}点)
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {Object.values(order).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">メニューを選択してください</p>
            ) : (
              Object.values(order).map((line) => (
                <div key={line.menuId} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 text-sm">
                  <span className="flex-1 text-xs font-medium leading-tight">{line.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => changeQty(line.menuId, -1)}
                      className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs">{line.quantity}</span>
                    <button onClick={() => changeQty(line.menuId, 1)}
                      className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 w-14 text-right shrink-0">
                    ¥{(line.unitPrice * line.quantity).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t bg-white space-y-2">
            <div className="flex justify-between font-bold text-base">
              <span>合計</span>
              <span className="text-amber-700">¥{totalAmount.toLocaleString()}</span>
            </div>
            <Button onClick={saveOrder} disabled={saving} variant="outline" className="w-full text-sm">
              {saving ? "保存中..." : "一時保存"}
            </Button>
            <Button onClick={() => setShowCheckout(true)} disabled={itemCount === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-sm">
              精算する
            </Button>
          </div>
        </div>
      </div>

      {/* 精算確認モーダル */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4">
            <div className="flex justify-center mb-3">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-center mb-1">精算確認</h2>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">テーブル</span>
                <span className="font-medium">{session.table.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">人数</span>
                <span className="font-medium">{guestCount}名</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">点数</span>
                <span className="font-medium">{itemCount}点</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>合計金額</span>
                <span className="text-green-700">¥{totalAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCheckout(false)}>戻る</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleCheckout} disabled={checkingOut}>
                {checkingOut ? "処理中..." : "精算完了"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
