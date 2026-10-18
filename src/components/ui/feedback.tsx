import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export interface FeedbackProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
}

export function Feedback({
  variant = "info",
  title,
  children,
  className,
  ...props
}: FeedbackProps) {
  const configs = {
    info: {
      icon: Info,
      style: "bg-[#F0F5F2] border-[#D2E0D5] text-[#1E3A2F]",
      iconColor: "text-[#1E3A2F]",
    },
    success: {
      icon: CheckCircle2,
      style: "bg-[#E8EFE9] border-[#D2E0D5] text-[#1E3A2F]",
      iconColor: "text-[#1E3A2F]",
    },
    warning: {
      icon: AlertTriangle,
      style: "bg-[#FEFCE8] border-[#FEF08A] text-[#854D0E]",
      iconColor: "text-[#A16207]",
    },
    error: {
      icon: AlertCircle,
      style: "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]",
      iconColor: "text-[#DC2626]",
    },
  };

  const current = configs[variant];
  const Icon = current.icon;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3.5 text-xs",
        current.style,
        className
      )}
      {...props}
    >
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", current.iconColor)} />
      <div className="flex-1 space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}
