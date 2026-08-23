type Ri = { ingredient: { packagePrice: number; packageSize: number }; quantity: number };

export type ComponentForCost = {
  type: string;
  quantity: number;
  recipe?: { yieldQuantity: number; ingredients: Ri[] } | null;
  ingredient?: { packagePrice: number; packageSize: number } | null;
  subMenu?: { components: ComponentForCost[] } | null;
};

export function calcMenuCost(components: ComponentForCost[]): number {
  return components.reduce((sum, c) => {
    if (c.type === "recipe" && c.recipe) {
      const recipeCost = c.recipe.ingredients.reduce(
        (s, ri) => s + (ri.ingredient.packagePrice / ri.ingredient.packageSize) * ri.quantity,
        0
      );
      const perUnit = c.recipe.yieldQuantity > 0 ? recipeCost / c.recipe.yieldQuantity : 0;
      return sum + perUnit * c.quantity;
    }
    if (c.type === "ingredient" && c.ingredient) {
      return sum + (c.ingredient.packagePrice / c.ingredient.packageSize) * c.quantity;
    }
    if (c.type === "menu" && c.subMenu) {
      return sum + calcMenuCost(c.subMenu.components) * c.quantity;
    }
    return sum;
  }, 0);
}

export const componentInclude = {
  recipe: { include: { ingredients: { include: { ingredient: true } } } },
  ingredient: true,
  subMenu: {
    include: {
      components: {
        include: {
          recipe: { include: { ingredients: { include: { ingredient: true } } } },
          ingredient: true,
        },
      },
    },
  },
} as const;
