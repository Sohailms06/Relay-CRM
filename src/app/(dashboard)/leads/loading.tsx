import { Skeleton } from "@/components/ui/skeleton";

export default function LeadsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header bar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E5E0] pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-80" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-[#E5E5E0] bg-white p-3 space-y-1.5 shadow-xs">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>

      {/* Search & Filter Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-9 w-full sm:w-64 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      {/* Leads Table Skeleton */}
      <div className="rounded-xl border border-[#E5E5E0] bg-white overflow-hidden shadow-xs">
        <div className="border-b border-[#E5E5E0] bg-[#FAFAF8] px-4 py-3 flex items-center justify-between">
          <div className="grid grid-cols-12 gap-4 w-full">
            <Skeleton className="col-span-4 h-3.5 w-24" />
            <Skeleton className="col-span-2 h-3.5 w-16" />
            <Skeleton className="col-span-3 h-3.5 w-20" />
            <Skeleton className="col-span-2 h-3.5 w-16" />
            <Skeleton className="col-span-1 h-3.5 w-12 ml-auto" />
          </div>
        </div>

        <div className="divide-y divide-[#EFEFEA]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-3.5 flex items-center justify-between">
              <div className="grid grid-cols-12 gap-4 w-full items-center">
                <div className="col-span-4 space-y-1.5">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="col-span-1 flex justify-end">
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
