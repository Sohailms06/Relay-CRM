"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Feedback } from "@/components/ui/feedback";
import { Building2, ArrowRight } from "lucide-react";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    signUpAction,
    {}
  );
  const [cooldown, setCooldown] = React.useState(0);
  const isRateLimited = Boolean(state?.error && state.error.toLowerCase().includes("rate limit"));

  React.useEffect(() => {
    if (isRateLimited) {
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [state?.error, isRateLimited]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF8] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A2F] text-white shadow-sm font-bold text-base">
            R
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#18181B]">
            Create your company workspace
          </h2>
          <p className="text-xs text-[#71717A]">
            Set up Relay CRM with round-robin lead allocation and SLA tracking.
          </p>
        </div>

        {/* Signup Card */}
        <Card className="border-[#E5E5E0] shadow-sm">
          <form action={formAction}>
            <CardContent className="space-y-4 pt-6">
              {state?.error && (
                <Feedback variant="error" title="Setup Error">
                  {state.error}
                </Feedback>
              )}

              <Input
                label="Full Name"
                id="fullName"
                name="fullName"
                placeholder="Jane Doe"
                required
              />

              <Input
                label="Company / Workspace Name"
                id="workspaceName"
                name="workspaceName"
                placeholder="Apex Commercial Services"
                helperText="This creates an isolated workspace where you are designated Owner."
                required
              />

              <Input
                label="Work Email"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="jane@apexservices.com"
                required
              />

              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isPending}
                disabled={isPending || cooldown > 0}
              >
                {cooldown > 0 ? `Rate Limit Cooldown (${cooldown}s)` : "Create Workspace & Sign In"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2 text-center text-xs text-[#71717A]">
              <div>
                Already have an established workspace?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#1E3A2F] hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Architecture Note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#A1A1AA]">
          <Building2 className="h-3.5 w-3.5 text-[#1E3A2F]" />
          <span>Provisioning workspace with automated Owner permission assignment</span>
        </div>
      </div>
    </div>
  );
}
