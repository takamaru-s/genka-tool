export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded" />
      </div>

      {/* カード */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-5 w-32 bg-gray-200 rounded mb-6" />
        <div className="space-y-3">
          {/* テーブルヘッダー */}
          <div className="grid grid-cols-4 gap-4 pb-3 border-b border-gray-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
          {/* テーブル行 */}
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 py-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className={`h-4 bg-gray-100 rounded ${j === 0 ? "w-3/4" : ""}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
