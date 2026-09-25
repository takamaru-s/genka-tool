"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteMenuButton({ menuId, menuName }: { menuId: string; menuName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`「${menuName}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/menus/${menuId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "削除に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-gray-400 hover:text-red-600 transition-colors p-1 disabled:opacity-40"
      title="削除"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
