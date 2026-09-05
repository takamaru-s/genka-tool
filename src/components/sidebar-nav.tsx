"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, ShoppingBasket, BookOpen, LogOut, ChefHat,
  ClipboardList, Settings, CalendarDays, Tag, TrendingUp,
  BarChart3, LineChart, UtensilsCrossed, Menu, X, MonitorSmartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface User { name?: string | null; email?: string | null; }
interface SidebarNavProps { user: User; }

const navItems = [
  { title: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { title: "POSレジ", href: "/pos", icon: MonitorSmartphone },
  { title: "食材管理", href: "/ingredients", icon: ShoppingBasket },
  { title: "レシピ管理", href: "/recipes", icon: BookOpen },
  { title: "メニュー管理", href: "/menus", icon: UtensilsCrossed },
  { title: "カテゴリマスタ", href: "/categories", icon: Tag },
  { title: "棚卸入力", href: "/inventory", icon: ClipboardList, exact: true },
  { title: "月間棚卸表", href: "/inventory/monthly", icon: CalendarDays },
  { title: "出数登録", href: "/sales", icon: TrendingUp, exact: true },
  { title: "出数履歴", href: "/sales/history", icon: LineChart },
  { title: "ABC分析・原価差異", href: "/sales/analysis", icon: BarChart3 },
  { title: "設定・バックアップ", href: "/settings", icon: Settings },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 p-4 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/dashboard"
          ? pathname === "/dashboard"
          : item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              isActive ? "bg-blue-700 text-white" : "text-blue-200 hover:bg-blue-800 hover:text-white"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  return (
    <div className="p-4 border-t border-blue-800">
      <div className="mb-3 px-4">
        <p className="text-xs text-blue-400">ログイン中</p>
        <p className="text-sm font-medium text-white truncate">{user.name}</p>
        <p className="text-xs text-blue-300 truncate">{user.email}</p>
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start text-blue-200 hover:text-white hover:bg-blue-800"
        onClick={onSignOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        ログアウト
      </Button>
    </div>
  );
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const handleSignOut = () => signOut({ callbackUrl: "/login" });

  return (
    <>
      {/* PC: サイドバー */}
      <aside className="hidden md:flex w-64 bg-blue-900 text-white flex-col shadow-xl shrink-0">
        <div className="p-6 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-700 p-2 rounded-lg">
              <ChefHat className="h-6 w-6 text-blue-100" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">原価管理</h1>
              <p className="text-blue-300 text-xs">ツール</p>
            </div>
          </div>
        </div>
        <NavLinks pathname={pathname} />
        <UserFooter user={user} onSignOut={handleSignOut} />
      </aside>

      {/* スマホ: トップバー */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-blue-900 text-white flex items-center justify-between px-4 h-14 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-blue-700 p-1.5 rounded-lg">
            <ChefHat className="h-5 w-5 text-blue-100" />
          </div>
          <span className="font-bold text-base">原価管理ツール</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-blue-800 transition-colors"
          aria-label="メニューを開く"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* スマホ: ドロワーメニュー */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          {/* ドロワー */}
          <div className="relative w-72 max-w-[85vw] bg-blue-900 text-white flex flex-col h-full shadow-2xl">
            <div className="p-5 border-b border-blue-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-700 p-2 rounded-lg">
                  <ChefHat className="h-5 w-5 text-blue-100" />
                </div>
                <div>
                  <h1 className="font-bold text-base leading-tight">原価管理</h1>
                  <p className="text-blue-300 text-xs">ツール</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-blue-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <UserFooter user={user} onSignOut={handleSignOut} />
          </div>
        </div>
      )}
    </>
  );
}
