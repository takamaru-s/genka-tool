import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface SortableTHProps {
  column: string;
  label: string;
  sortColumn: string | null;
  sortOrder: "asc" | "desc";
  onSort: (column: string) => void;
  className?: string;
}

export function SortableTH({
  column,
  label,
  sortColumn,
  sortOrder,
  onSort,
  className = "",
}: SortableTHProps) {
  const isActive = sortColumn === column;

  return (
    <th
      onClick={() => onSort(column)}
      className={`select-none cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortOrder === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5 text-blue-600" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-blue-600" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />
        )}
      </div>
    </th>
  );
}
