import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { IngredientsTable } from "@/components/ingredients-table";
import { ImportIngredientsButton } from "@/components/import-ingredients-button";
import { ReceiptOcrButton } from "@/components/receipt-ocr-button";

export default async function IngredientsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const ingredients = await prisma.ingredient.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">食材管理</h1>
          <p className="text-gray-500 mt-1">食材の仕入れ情報を管理します</p>
        </div>
        <div className="flex items-center gap-2">
          <ReceiptOcrButton ingredients={ingredients} />
          <ImportIngredientsButton />
          <Link href="/ingredients/new">
            <Button className="bg-blue-700 hover:bg-blue-800">
              <Plus className="h-4 w-4 mr-2" />
              新規登録
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">
            食材一覧{" "}
            <span className="text-sm font-normal text-gray-500">
              ({ingredients.length}品目)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ingredients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">食材が登録されていません</p>
              <Link href="/ingredients/new">
                <Button className="bg-blue-700 hover:bg-blue-800">
                  <Plus className="h-4 w-4 mr-2" />
                  最初の食材を登録する
                </Button>
              </Link>
            </div>
          ) : (
            <IngredientsTable ingredients={ingredients} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
