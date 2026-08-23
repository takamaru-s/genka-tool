import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { RecipeForm } from "@/components/recipe-form";

interface EditRecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [recipe, ingredients, categories] = await Promise.all([
    prisma.recipe.findFirst({
      where: { id, userId: session.user.id },
      include: {
        ingredients: { include: { ingredient: true } },
      },
    }),
    prisma.ingredient.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
    prisma.recipeCategory.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!recipe) notFound();

  const initialData = {
    id: recipe.id,
    name: recipe.name,
    menuPrice: recipe.menuPrice,
    description: recipe.description,
    categoryId: recipe.categoryId,
    yieldQuantity: recipe.yieldQuantity,
    yieldUnit: recipe.yieldUnit,
    ingredients: recipe.ingredients.map((ri) => ({
      ingredientId: ri.ingredientId,
      quantity: ri.quantity,
    })),
  };

  return (
    <div>
      <RecipeForm ingredients={ingredients} categories={categories} initialData={initialData} />
    </div>
  );
}
