import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPageLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E5E0] pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-80" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
      </div>

      {/* Row 1: Primary Operational KPIs (Leads, SLA Response, Recovery, Escalations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={`kpi-1-${i}`} className="rounded-xl border border-[#E5E5E0] bg-white p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Secondary Operational KPIs (Team, Pipeline Value, Revenue, Appointments) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={`kpi-2-${i}`} className="rounded-xl border border-[#E5E5E0] bg-white p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-7 w-24" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>

      {/* Recharts Chart Card Loading Placeholder */}
      <div className="rounded-xl border border-[#E5E5E0] bg-white p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-72" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28 hidden sm:block" />
          </div>
        </div>

        {/* Graph-shaped loading placeholder */}
        <div className="h-64 w-full rounded-lg bg-[#FAFAF8] border border-dashed border-[#E5E5E0] p-4 flex flex-col justify-end gap-2">
          <div className="flex items-end justify-between gap-2 h-44 w-full px-2">
            {[35, 60, 45, 80, 50, 90, 65, 40, 75, 55, 70, 85].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <Skeleton className="w-full rounded-xs" style={{ height: `${h}%` }} />
                <Skeleton className="h-2.5 w-6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
