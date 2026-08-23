import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { MenuForm } from "@/components/menu-form";
import { calcMenuCost, componentInclude, ComponentForCost } from "@/lib/menu-cost";

export default async function EditMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { id } = await params;

  const [menu, ingredients, categories, recipesRaw, menusRaw] = await Promise.all([
    prisma.menu.findFirst({
      where: { id, userId: session.user.id },
      include: { components: true },
    }),
    prisma.ingredient.findMany({ where: { userId: session.user.id }, orderBy: { name: "asc" } }),
    prisma.recipeCategory.findMany({ where: { userId: session.user.id }, orderBy: { name: "asc" } }),
    prisma.recipe.findMany({
      where: { userId: session.user.id },
      include: { ingredients: { include: { ingredient: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.menu.findMany({
      where: { userId: session.user.id, NOT: { id } },
      include: { components: { include: componentInclude } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!menu) notFound();

  const recipes = recipesRaw.map((r) => ({
    id: r.id,
    name: r.name,
    yieldQuantity: r.yieldQuantity,
    yieldUnit: r.yieldUnit,
    totalCost: r.ingredients.reduce((s, ri) => s + (ri.ingredient.packagePrice / ri.ingredient.packageSize) * ri.quantity, 0),
  }));

  const otherMenus = menusRaw.map((m) => ({
    id: m.id,
    name: m.name,
    totalCost: calcMenuCost(m.components as ComponentForCost[]),
  }));

  const initialData = {
    id: menu.id,
    name: menu.name,
    menuPrice: menu.menuPrice,
    description: menu.description,
    categoryId: menu.categoryId,
    components: menu.components.map((c) => ({
      type: c.type,
      recipeId: c.recipeId,
      ingredientId: c.ingredientId,
      subMenuId: c.subMenuId,
      quantity: c.quantity,
    })),
  };

  return (
    <div>
      <MenuForm ingredients={ingredients} recipes={recipes} otherMenus={otherMenus} categories={categories} initialData={initialData} />
    </div>
  );
}
