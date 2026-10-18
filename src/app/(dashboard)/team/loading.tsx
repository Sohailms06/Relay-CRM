import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E5E0] pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      {/* Staff Availability Summary Cards (4 states) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[#E5E5E0] bg-white p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
            </div>
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        ))}
      </div>

      {/* Team Roster Table Skeleton */}
      <div className="rounded-xl border border-[#E5E5E0] bg-white overflow-hidden shadow-xs">
        <div className="border-b border-[#E5E5E0] bg-[#FAFAF8] px-4 py-3">
          <div className="grid grid-cols-12 gap-4 w-full">
            <Skeleton className="col-span-4 h-3.5 w-28" />
            <Skeleton className="col-span-2 h-3.5 w-16" />
            <Skeleton className="col-span-2 h-3.5 w-20" />
            <Skeleton className="col-span-2 h-3.5 w-24" />
            <Skeleton className="col-span-2 h-3.5 w-16 ml-auto" />
          </div>
        </div>

        <div className="divide-y divide-[#EFEFEA]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3.5">
              <div className="grid grid-cols-12 gap-4 w-full items-center">
                <div className="col-span-4 flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="col-span-2 flex justify-end gap-1.5">
                  <Skeleton className="h-7 w-20 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
