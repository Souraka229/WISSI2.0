import { Skeleton } from '@/components/ui/skeleton'

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="mx-auto mb-3 h-10 w-10 rounded-xl" />
          <Skeleton className="mx-auto h-8 w-16 rounded" />
          <Skeleton className="mx-auto mt-2 h-4 w-24 rounded" />
        </div>
      ))}
    </div>
  )
}

export function ActivitySkeleton() {
  return (
    <div className="mt-10 space-y-3">
      <Skeleton className="h-6 w-48 rounded" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function DashboardCockpitSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded" />
        <Skeleton className="h-4 w-96 max-w-full rounded" />
      </div>
      <StatsSkeleton />
      <ActivitySkeleton />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <QuizGridSkeletonInline />
    </div>
  )
}

function QuizGridSkeletonInline() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-5">
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
