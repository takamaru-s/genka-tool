import { prisma } from "@/lib/prisma";

export async function runMigrations() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "IngredientPriceHistory" (
      "id"           TEXT    NOT NULL PRIMARY KEY,
      "userId"       TEXT    NOT NULL,
      "ingredientId" TEXT    NOT NULL,
      "packagePrice" REAL    NOT NULL,
      "packageSize"  REAL    NOT NULL,
      "recordedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "IngredientPriceHistory_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "IngredientPriceHistory_ingredientId_fkey"
        FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `;

  try {
    await prisma.$executeRaw`ALTER TABLE "Recipe" ADD COLUMN "yieldQuantity" REAL NOT NULL DEFAULT 1`;
  } catch (_) {}
  try {
    await prisma.$executeRaw`ALTER TABLE "Recipe" ADD COLUMN "yieldUnit" TEXT NOT NULL DEFAULT 'g'`;
  } catch (_) {}

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Menu" (
      "id"          TEXT     NOT NULL PRIMARY KEY,
      "userId"      TEXT     NOT NULL,
      "name"        TEXT     NOT NULL,
      "menuPrice"   REAL     NOT NULL,
      "description" TEXT,
      "categoryId"  TEXT,
      "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Menu_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Menu_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "RecipeCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "MenuComponent" (
      "id"           TEXT NOT NULL PRIMARY KEY,
      "menuId"       TEXT NOT NULL,
      "type"         TEXT NOT NULL,
      "recipeId"     TEXT,
      "ingredientId" TEXT,
      "subMenuId"    TEXT,
      "quantity"     REAL NOT NULL,
      CONSTRAINT "MenuComponent_menuId_fkey"
        FOREIGN KEY ("menuId") REFERENCES "Menu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MenuComponent_recipeId_fkey"
        FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MenuComponent_ingredientId_fkey"
        FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MenuComponent_subMenuId_fkey"
        FOREIGN KEY ("subMenuId") REFERENCES "Menu" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "MenuSalesRecord" (
      "id"        TEXT     NOT NULL PRIMARY KEY,
      "userId"    TEXT     NOT NULL,
      "year"      INTEGER  NOT NULL,
      "month"     INTEGER  NOT NULL,
      "menuId"    TEXT     NOT NULL,
      "quantity"  INTEGER  NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MenuSalesRecord_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MenuSalesRecord_menuId_fkey"
        FOREIGN KEY ("menuId") REFERENCES "Menu" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `;
  try {
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "MenuSalesRecord_userId_year_month_menuId_key"
      ON "MenuSalesRecord"("userId", "year", "month", "menuId")
    `;
  } catch (_) {}

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Setting" (
      "id"        TEXT     NOT NULL PRIMARY KEY,
      "key"       TEXT     NOT NULL UNIQUE,
      "value"     TEXT     NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
}
