import { Skeleton } from "@/components/ui/skeleton";

export default function RecoveryLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E5E0] pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3.5 w-80" />
        </div>
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>

      {/* Recovery Alert Banner Skeleton */}
      <div className="rounded-xl border border-[#FCA5A5]/40 bg-[#FEF2F2] p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>

      {/* Recovery Table Skeleton */}
      <div className="rounded-xl border border-[#E5E5E0] bg-white overflow-hidden shadow-xs">
        <div className="border-b border-[#E5E5E0] bg-[#FAFAF8] px-4 py-3">
          <div className="grid grid-cols-12 gap-4 w-full">
            <Skeleton className="col-span-4 h-3.5 w-28" />
            <Skeleton className="col-span-2 h-3.5 w-20" />
            <Skeleton className="col-span-3 h-3.5 w-24" />
            <Skeleton className="col-span-3 h-3.5 w-16 ml-auto" />
          </div>
        </div>

        <div className="divide-y divide-[#EFEFEA]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-3.5">
              <div className="grid grid-cols-12 gap-4 w-full items-center">
                <div className="col-span-4 space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <div className="col-span-3 space-y-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="col-span-3 flex justify-end gap-2">
                  <Skeleton className="h-7 w-24 rounded-md" />
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
