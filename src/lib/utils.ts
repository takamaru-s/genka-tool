import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);
}

export function formatUnitCost(amount: number, unit: string): string {
  return `¥${amount.toFixed(1)}/${unit}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calcCostRate(cost: number, menuPrice: number): number {
  if (menuPrice === 0) return 0;
  return (cost / menuPrice) * 100;
}
