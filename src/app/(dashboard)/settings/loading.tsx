import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in-50 duration-200">
      {/* Header bar */}
      <div className="border-b border-[#E5E5E0] pb-4 space-y-1.5">
        <Skeleton className="h-6 w-60" />
        <Skeleton className="h-3.5 w-96" />
      </div>

      {/* Workspace Profile Card Skeleton */}
      <div className="rounded-xl border border-[#E5E5E0] bg-white p-5 space-y-4 shadow-xs">
        <div className="space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>

        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Role Access Matrix Card Skeleton */}
      <div className="rounded-xl border border-[#E5E5E0] bg-white p-5 space-y-4 shadow-xs">
        <div className="space-y-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-80" />
        </div>

        <div className="rounded-lg border border-[#E5E5E0] overflow-hidden">
          <div className="bg-[#FAFAF8] px-4 py-3 border-b border-[#E5E5E0] grid grid-cols-12 gap-2">
            <Skeleton className="col-span-5 h-3.5 w-28" />
            <Skeleton className="col-span-2 h-3.5 w-16" />
            <Skeleton className="col-span-2 h-3.5 w-16" />
            <Skeleton className="col-span-3 h-3.5 w-16" />
          </div>
          <div className="divide-y divide-[#EFEFEA]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
                <Skeleton className="col-span-5 h-3.5 w-40" />
                <Skeleton className="col-span-2 h-4 w-12 rounded-full" />
                <Skeleton className="col-span-2 h-4 w-12 rounded-full" />
                <Skeleton className="col-span-3 h-4 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
