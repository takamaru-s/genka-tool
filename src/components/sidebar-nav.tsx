"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBasket,
  BookOpen,
  LogOut,
  ChefHat,
  ClipboardList,
  Settings,
  CalendarDays,
  Tag,
  TrendingUp,
  BarChart3,
  LineChart,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface User {
  name?: string | null;
  email?: string | null;
}

interface SidebarNavProps {
  user: User;
}

const navItems = [
  {
    title: "ダッシュボード",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "食材管理",
    href: "/ingredients",
    icon: ShoppingBasket,
  },
  {
    title: "レシピ管理",
    href: "/recipes",
    icon: BookOpen,
  },
  {
    title: "メニュー管理",
    href: "/menus",
    icon: UtensilsCrossed,
  },
  {
    title: "カテゴリマスタ",
    href: "/categories",
    icon: Tag,
  },
  {
    title: "棚卸入力",
    href: "/inventory",
    icon: ClipboardList,
    exact: true,
  },
  {
    title: "月間棚卸表",
    href: "/inventory/monthly",
    icon: CalendarDays,
  },
  {
    title: "出数登録",
    href: "/sales",
    icon: TrendingUp,
    exact: true,
  },
  {
    title: "出数履歴",
    href: "/sales/history",
    icon: LineChart,
  },
  {
    title: "ABC分析・原価差異",
    href: "/sales/analysis",
    icon: BarChart3,
  },
  {
    title: "設定・バックアップ",
    href: "/settings",
    icon: Settings,
  },
];

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col shadow-xl">
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

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-700 text-white"
                  : "text-blue-200 hover:bg-blue-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-blue-800">
        <div className="mb-3 px-4">
          <p className="text-xs text-blue-400">ログイン中</p>
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <p className="text-xs text-blue-300 truncate">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-blue-200 hover:text-white hover:bg-blue-800"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          ログアウト
        </Button>
      </div>
    </aside>
  );
}
