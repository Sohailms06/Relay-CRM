import { Skeleton } from "@/components/ui/skeleton";

export default function ConversationsLoading() {
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

      {/* Split Pane Inbox Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[600px] rounded-xl border border-[#E5E5E0] bg-white overflow-hidden shadow-xs">
        {/* Left: Threads List (col-span-4) */}
        <div className="md:col-span-4 border-r border-[#E5E5E0] flex flex-col h-full bg-[#FAFAF8]">
          <div className="p-3 border-b border-[#E5E5E0]">
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="divide-y divide-[#EFEFEA] overflow-y-auto flex-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-3 space-y-1.5 bg-white">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
                <Skeleton className="h-3 w-44" />
                <div className="flex items-center gap-2 pt-0.5">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Message View (col-span-8) */}
        <div className="hidden md:flex md:col-span-8 flex-col h-full bg-white">
          <div className="p-4 border-b border-[#E5E5E0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Chat Bubble Placeholders */}
          <div className="flex-1 p-6 space-y-4 bg-[#FAFAF8]">
            <div className="flex items-start gap-2.5 max-w-md">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="rounded-xl rounded-tl-xs bg-white border border-[#E5E5E0] p-3 space-y-1 w-64 shadow-xs">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>

            <div className="flex items-start justify-end gap-2.5 max-w-md ml-auto">
              <div className="rounded-xl rounded-tr-xs bg-[#1E3A2F]/10 border border-[#1E3A2F]/20 p-3 space-y-1 w-64">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </div>

          {/* Reply Bar */}
          <div className="p-3 border-t border-[#E5E5E0] bg-white flex items-center gap-2">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
