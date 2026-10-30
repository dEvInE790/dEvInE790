export default function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3 rounded-full" style={{ width: `${i === lines - 1 ? 60 : 100 - i * 8}%` }} />
      ))}
    </div>
  )
}

/** Screen-reader announcement for regions that are loading. */
export function LoadingRegion({ label = 'Loading', children }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  )
}
