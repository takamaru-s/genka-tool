import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { EditIngredientForm } from "@/components/edit-ingredient-form";

interface EditIngredientPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditIngredientPage({
  params,
}: EditIngredientPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const ingredient = await prisma.ingredient.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!ingredient) notFound();

  return (
    <div>
      <EditIngredientForm ingredient={ingredient} />
    </div>
  );
}
