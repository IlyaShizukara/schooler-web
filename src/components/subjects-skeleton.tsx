export function SubjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <div className="h-11 w-11 rounded-xl bg-surface-2" />
            <div className="h-5 w-5 rounded bg-surface-2" />
          </div>
          <div className="mt-4 h-4 w-2/3 rounded bg-surface-2" />
          <div className="mt-4 flex items-center justify-between">
            <div className="h-3 w-16 rounded bg-surface-2" />
            <div className="h-3 w-10 rounded bg-surface-2" />
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-surface-2" />
          <div className="mt-4 h-6 w-24 rounded-lg bg-surface-2" />
        </div>
      ))}
    </div>
  );
}