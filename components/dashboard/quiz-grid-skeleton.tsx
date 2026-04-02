import { Skeleton } from '@/components/ui/skeleton'

export function QuizGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="space-y-3 rounded-xl border border-border bg-card p-5"
        >
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 flex-1 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
