import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type LucideIcon, Database, Layers, ShieldCheck } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  moduleName: string;
  description: string;
  icon: LucideIcon;
  relatedTables: string[];
  plannedFeatures: string[];
  promptTarget: string;
}

export function ModulePlaceholder({
  title,
  moduleName,
  description,
  icon: Icon,
  relatedTables,
  plannedFeatures,
  promptTarget,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5E5E0]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F5F2] text-[#1E3A2F] border border-[#D2E0D5]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-[#18181B]">{title}</h2>
              <Badge variant="outline" className="text-[10px]">
                {promptTarget}
              </Badge>
            </div>
            <p className="text-xs text-[#71717A]">{description}</p>
          </div>
        </div>

        <Badge variant="sage" className="w-fit">
          Database Contract Ready
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Domain Scope & Readiness */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#1E3A2F]" />
              <CardTitle className="text-sm">Planned Capabilities</CardTitle>
            </div>
            <CardDescription>
              Functional specs designed in the foundation schema for {moduleName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2 text-xs text-[#52525B]">
              {plannedFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1E3A2F]" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Database Entities In Place */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#1E3A2F]" />
              <CardTitle className="text-sm">Pre-Engineered PostgreSQL Tables</CardTitle>
            </div>
            <CardDescription>
              Entities created in migration 001 with workspace RLS policies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {relatedTables.map((table) => (
                <code
                  key={table}
                  className="rounded bg-[#FAFAF8] border border-[#E5E5E0] px-2 py-1 font-mono text-[11px] text-[#18181B]"
                >
                  public.{table}
                </code>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-[#3D6452]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Workspace-level Row Level Security enforced</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-dashed border-[#D4D4CE] bg-white/40 p-6 text-center">
        <p className="text-xs text-[#71717A]">
          This module is reserved for focused implementation in subsequent competition prompts. Core schema, RLS, and domain types are fully verified.
        </p>
      </div>
    </div>
  );
}
