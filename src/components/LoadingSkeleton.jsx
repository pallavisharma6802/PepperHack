/**
 * LoadingSkeleton — shimmer rows while agents stream.
 * P4 owns this. Uses .skeleton CSS class from index.css.
 */
export function LoadingSkeleton({ count = 4 }) {
  return (
    <div className="space-y-1 pt-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-1 py-3">
          <div className="skeleton w-16 h-16 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 rounded w-2/3" />
            <div className="skeleton h-2.5 rounded w-1/2" />
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="skeleton h-3 w-10 rounded" />
            <div className="skeleton h-4 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
