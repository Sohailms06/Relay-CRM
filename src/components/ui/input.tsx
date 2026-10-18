import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[#18181B] tracking-tight"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-1.5 text-sm text-[#18181B] shadow-sm placeholder:text-[#A1A1AA] transition-colors focus:border-[#1E3A2F] focus:outline-none focus:ring-1 focus:ring-[#1E3A2F] disabled:cursor-not-allowed disabled:bg-[#FAFAF8] disabled:opacity-50",
            error && "border-[#991B1B] focus:border-[#991B1B] focus:ring-[#991B1B]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#991B1B] font-medium">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-[#71717A]">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
