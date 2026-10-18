import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "outline" | "sage";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-[#F4F4F0] text-[#18181B] border-[#E5E5E0]",
    success: "bg-[#E8EFE9] text-[#1E3A2F] border-[#D2E0D5]",
    sage: "bg-[#F0F5F2] text-[#3D6452] border-[#D2E0D5]",
    warning: "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]",
    destructive: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
    outline: "bg-transparent text-[#52525B] border-[#E5E5E0]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
