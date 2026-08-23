"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteIngredientButtonProps {
  id: string;
  name: string;
}

export function DeleteIngredientButton({ id, name }: DeleteIngredientButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`「${name}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/ingredients/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "削除に失敗しました。");
      }
    } catch {
      alert("削除中にエラーが発生しました。");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      className="text-xs"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      <Trash2 className="h-3 w-3 mr-1" />
      {isDeleting ? "削除中..." : "削除"}
    </Button>
  );
}
