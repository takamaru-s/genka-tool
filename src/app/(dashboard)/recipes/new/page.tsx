import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RecipeForm } from "@/components/recipe-form";

export default async function NewRecipePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [ingredients, categories] = await Promise.all([
    prisma.ingredient.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
    prisma.recipeCategory.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <RecipeForm ingredients={ingredients} categories={categories} />
    </div>
  );
}
