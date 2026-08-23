"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { getCategoryColor } from "@/lib/category-colors";

interface Category {
  id: string;
  name: string;
  color: string;
}

export function CategoryFilter({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("categoryId") ?? "";

  const select = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("categoryId", id);
    else params.delete("categoryId");
    router.push(`/recipes?${params.toString()}`);
  };

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-gray-500 font-medium">絞り込み:</span>
      <button
        onClick={() => select("")}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          current === ""
            ? "bg-blue-700 text-white border-blue-700"
            : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
        }`}
      >
        すべて
      </button>
      <button
        onClick={() => select("none")}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          current === "none"
            ? "bg-gray-700 text-white border-gray-700"
            : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
        }`}
      >
        未分類
      </button>
      {categories.map((cat) => {
        const color = getCategoryColor(cat.color);
        const isActive = current === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => select(cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              isActive
                ? `${color.bg} ${color.text} ${color.border} ring-2 ring-offset-1 ring-current`
                : `${color.bg} ${color.text} ${color.border} opacity-60 hover:opacity-100`
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
