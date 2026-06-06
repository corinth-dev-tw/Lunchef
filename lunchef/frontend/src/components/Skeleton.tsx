const shimmer = 'bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-pulse'

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className={`h-36 w-full ${shimmer}`} />
      <div className="p-4 space-y-3">
        <div className={`h-4 rounded-full w-3/4 ${shimmer}`} />
        <div className={`h-3 rounded-full w-1/2 ${shimmer}`} />
        <div className="flex gap-2 mt-2">
          <div className={`h-5 rounded-full w-20 ${shimmer}`} />
          <div className={`h-5 rounded-full w-24 ${shimmer}`} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 rounded-full ${shimmer}`}
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar() {
  return <div className={`w-10 h-10 rounded-full ${shimmer}`} />
}
