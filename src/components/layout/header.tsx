"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, Bell, Shield, CheckCircle2 } from "lucide-react";
import { Badge } from "@/lib/../components/ui/badge";

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  workspaceName?: string;
  isLiveDatabase?: boolean;
}

export function Header({
  onToggleMobileMenu,
  workspaceName = "Workspace",
  isLiveDatabase = false,
}: HeaderProps) {
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path.includes("/leads")) return "Leads & SLA Escalation";
    if (path.includes("/recovery")) return "Lead Recovery Hub";
    if (path.includes("/crm")) return "Contacts & Companies";
    if (path.includes("/conversations")) return "Unified Inbox";
    if (path.includes("/payments")) return "Payment Processing";
    if (path.includes("/calendar")) return "Calendar Bookings";
    if (path.includes("/team")) return "Team & On-Call Shifts";
    if (path.includes("/integrations")) return "Connected Services";
    if (path.includes("/audit")) return "Immutable Audit Log";
    if (path.includes("/settings")) return "Workspace Settings";
    return "Operational Overview";
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-[#E5E5E0] bg-[#FFFFFF] px-4 sm:px-6">
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="rounded-lg p-1.5 text-[#71717A] hover:bg-[#F4F4F0] md:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-[#18181B] tracking-tight">
              {getPageTitle(pathname)}
            </h1>
            <span className="text-xs text-[#A1A1AA]">/</span>
            <span className="text-xs text-[#71717A] font-medium">{workspaceName}</span>
          </div>
        </div>
      </div>

      {/* Right: Operational Status & System Health */}
      <div className="flex items-center gap-3">
        <Badge
          variant={isLiveDatabase ? "success" : "warning"}
          className="hidden sm:inline-flex items-center gap-1.5 text-[11px]"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isLiveDatabase ? "bg-[#1E3A2F]" : "bg-[#854D0E] animate-pulse"
            }`}
          />
          {isLiveDatabase ? "Supabase Live" : "Pending Supabase Setup"}
        </Badge>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E0] bg-white text-[#71717A] hover:text-[#18181B] transition-colors cursor-pointer">
          <Bell className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
