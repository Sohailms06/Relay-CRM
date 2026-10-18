"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users2,
  PhoneForwarded,
  Building2,
  MessageSquare,
  CreditCard,
  Calendar,
  ShieldCheck,
  Blocks,
  History,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface SidebarProps {
  workspaceName?: string;
  userRole?: string;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
  className?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isReady?: boolean;
}

export function Sidebar({
  workspaceName = "Acme Services",
  userRole = "Owner",
  userName = "Lead Operator",
  userEmail = "operator@relay.internal",
  onSignOut,
  className,
}: SidebarProps) {
  const pathname = usePathname();

  const primaryNav: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isReady: true,
    },
    {
      name: "Leads Queue",
      href: "/leads",
      icon: PhoneForwarded,
      badge: "SLA",
      isReady: true,
    },
    {
      name: "Recovery & Missed",
      href: "/recovery",
      icon: ShieldCheck,
      isReady: true,
    },
    {
      name: "CRM Contacts",
      href: "/crm",
      icon: Users2,
      isReady: true,
    },
    {
      name: "Conversations",
      href: "/conversations",
      icon: MessageSquare,
      isReady: true,
    },
    {
      name: "Payments",
      href: "/payments",
      icon: CreditCard,
      isReady: true,
    },
    {
      name: "Calendar Sync",
      href: "/calendar",
      icon: Calendar,
      isReady: true,
    },
    {
      name: "Team & Availability",
      href: "/team",
      icon: Building2,
      isReady: true,
    },
    {
      name: "Integrations",
      href: "/integrations",
      icon: Blocks,
      isReady: true,
    },
    {
      name: "Audit Events",
      href: "/audit",
      icon: History,
      isReady: true,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      isReady: true,
    },
  ];

  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col border-r border-[#E5E5E0] bg-[#FFFFFF] text-[#18181B]",
        className
      )}
    >
      {/* Workspace Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-[#EFEFEA] px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1E3A2F] text-white shadow-sm font-semibold text-sm">
            R
          </div>
          <div className="flex flex-col overflow-hidden text-left">
            <span className="truncate text-xs font-semibold text-[#18181B] tracking-tight">
              {workspaceName}
            </span>
            <span className="text-[10px] text-[#71717A] flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#1E3A2F]" />
              Relay CRM
            </span>
          </div>
        </Link>
        <span className="rounded bg-[#E8EFE9] px-1.5 py-0.5 text-[10px] font-semibold text-[#1E3A2F] uppercase tracking-wider">
          {userRole}
        </span>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
          Operations
        </div>
        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-[#F0F5F2] text-[#1E3A2F] font-semibold"
                  : "text-[#52525B] hover:bg-[#F4F4F0] hover:text-[#18181B]"
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-[#1E3A2F]"
                      : "text-[#71717A] group-hover:text-[#18181B]"
                  )}
                />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span className="rounded bg-[#E8EFE9] px-1.5 py-0.2 text-[9px] font-medium text-[#1E3A2F]">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom User Bar */}
      <div className="border-t border-[#EFEFEA] p-3">
        <div className="flex items-center justify-between rounded-lg bg-[#FAFAF8] p-2 border border-[#E5E5E0]">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8EFE9] text-xs font-semibold text-[#1E3A2F]">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden text-left">
              <span className="truncate text-xs font-medium text-[#18181B]">
                {userName}
              </span>
              <span className="truncate text-[10px] text-[#71717A]">
                {userEmail}
              </span>
            </div>
          </div>
          {onSignOut ? (
            <button
              onClick={onSignOut}
              title="Sign Out"
              className="p-1 text-[#71717A] hover:text-[#991B1B] transition-colors rounded hover:bg-white"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                title="Sign Out"
                className="p-1 text-[#71717A] hover:text-[#991B1B] transition-colors rounded hover:bg-white"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
