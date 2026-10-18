import { Skeleton } from "@/components/ui/skeleton";

export default function CrmLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E5E0] pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3.5 w-80" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* CRM Navigation Tabs Skeleton */}
      <div className="flex items-center gap-2 border-b border-[#E5E5E0] pb-px">
        <Skeleton className="h-8 w-24 rounded-t-lg" />
        <Skeleton className="h-8 w-24 rounded-t-lg" />
        <Skeleton className="h-8 w-28 rounded-t-lg" />
        <Skeleton className="h-8 w-36 rounded-t-lg" />
      </div>

      {/* Search & Actions Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Skeleton className="h-9 w-full sm:w-72 rounded-lg" />
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Directory Table Skeleton */}
      <div className="rounded-xl border border-[#E5E5E0] bg-white overflow-hidden shadow-xs">
        <div className="border-b border-[#E5E5E0] bg-[#FAFAF8] px-4 py-3">
          <div className="grid grid-cols-12 gap-4 w-full">
            <Skeleton className="col-span-4 h-3.5 w-24" />
            <Skeleton className="col-span-3 h-3.5 w-20" />
            <Skeleton className="col-span-3 h-3.5 w-28" />
            <Skeleton className="col-span-2 h-3.5 w-16 ml-auto" />
          </div>
        </div>

        <div className="divide-y divide-[#EFEFEA]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-3.5">
              <div className="grid grid-cols-12 gap-4 w-full items-center">
                <div className="col-span-4 flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="col-span-3 space-y-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="col-span-3 space-y-1">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
