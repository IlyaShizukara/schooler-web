export function TopicsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-3.5 rounded-2xl border border-border bg-surface p-4">
          <div className="h-8 w-8 rounded-full bg-surface-2" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-32 rounded bg-surface-2" />
              <div className="h-3 w-10 rounded bg-surface-2" />
            </div>
            <div className="flex gap-2.5">
              <div className="h-3 w-10 rounded bg-surface-2" />
              <div className="h-3 w-10 rounded bg-surface-2" />
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}