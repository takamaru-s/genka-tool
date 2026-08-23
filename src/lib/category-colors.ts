export const CATEGORY_COLORS = [
  { value: "blue",   label: "青",   bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-200" },
  { value: "green",  label: "緑",   bg: "bg-green-100",  text: "text-green-800",  border: "border-green-200" },
  { value: "orange", label: "橙",   bg: "bg-orange-500", text: "text-white",      border: "border-orange-500" },
  { value: "red",    label: "赤",   bg: "bg-red-500",    text: "text-white",      border: "border-red-500" },
  { value: "purple", label: "紫",   bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  { value: "pink",   label: "ピンク", bg: "bg-pink-500",  text: "text-white",     border: "border-pink-500" },
  { value: "sky",    label: "水色", bg: "bg-sky-500",    text: "text-white",      border: "border-sky-500" },
  { value: "teal",   label: "緑青", bg: "bg-teal-500",   text: "text-white",      border: "border-teal-500" },
] as const;

export type CategoryColorValue = (typeof CATEGORY_COLORS)[number]["value"];

export function getCategoryColor(colorValue: string) {
  return CATEGORY_COLORS.find((c) => c.value === colorValue) ?? CATEGORY_COLORS[0];
}
