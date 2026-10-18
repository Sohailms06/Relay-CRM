"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, Bell } from "lucide-react";

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
    if (path.includes("/leads")) return "Leads";
    if (path.includes("/recovery")) return "Recovery";
    if (path.includes("/crm")) return "CRM";
    if (path.includes("/conversations")) return "Conversations";
    if (path.includes("/payments")) return "Payments";
    if (path.includes("/calendar")) return "Calendar";
    if (path.includes("/team")) return "Team";
    if (path.includes("/integrations")) return "Integrations";
    if (path.includes("/audit")) return "Audit";
    if (path.includes("/settings")) return "Settings";
    return "Dashboard";
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-[#E5E5E0] bg-[#FFFFFF] px-4 sm:px-6">
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-[#71717A] hover:bg-[#F4F4F0] active:bg-[#EFEFEA] md:hidden relay-focus"
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
            <span className="text-xs text-[#A1A1AA]" aria-hidden="true">/</span>
            <span className="text-xs text-[#71717A] font-medium truncate max-w-[140px] sm:max-w-[240px]">
              {workspaceName}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Operational Status & System Health */}
      <div className="flex items-center gap-3">
        <div
          className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] text-[#71717A] bg-[#FAFAF8] border border-[#E5E5E0]"
          title={isLiveDatabase ? "Live database connection active" : "Database setup pending"}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isLiveDatabase ? "bg-[#1E3A2F]" : "bg-[#854D0E]"
            }`}
            aria-hidden="true"
          />
          <span className="text-[10px] font-mono text-[#52525B]">
            {isLiveDatabase ? "Live" : "Offline"}
          </span>
        </div>

        <button
          type="button"
          aria-label="System notifications"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E0] bg-white text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F0] transition-colors relay-focus"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
