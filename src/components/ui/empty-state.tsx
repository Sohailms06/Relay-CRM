import * as React from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D4D4CE] bg-white/50 p-8 text-center",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#F4F4F0] text-[#1E3A2F]">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h4 className="text-sm font-semibold text-[#18181B] tracking-tight">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-[#71717A] leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
