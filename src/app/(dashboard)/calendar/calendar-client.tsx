"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/ui/feedback";
import { createAppointmentAction } from "@/app/actions/integrations";
import { Calendar, Clock, Plus, ExternalLink, CheckCircle2, UserCheck } from "lucide-react";

export interface AppointmentItem {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "cancelled" | "completed";
  external_calendar_event_id?: string | null;
  contacts?: { first_name: string; last_name?: string | null; email?: string | null } | null;
  profiles?: { full_name: string; email: string } | null;
}

export interface CalendarConnectionItem {
  id: string;
  provider: string;
  account_email: string;
  is_syncing: boolean;
  updated_at: string;
}

interface CalendarClientProps {
  workspaceId: string;
  appointments: AppointmentItem[];
  connections: CalendarConnectionItem[];
}

export function CalendarClient({
  workspaceId,
  appointments: initialAppointments,
  connections,
}: CalendarClientProps) {
  const [appointments, setAppointments] = useState<AppointmentItem[]>(initialAppointments);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Form states
  const [title, setTitle] = useState("Commercial HVAC On-Site Diagnostic");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [durationMinutes, setDurationMinutes] = useState(60);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooking(true);
    setFeedback(null);

    try {
      const startIso = new Date(startDate).toISOString();
      const endIso = new Date(new Date(startDate).getTime() + durationMinutes * 60 * 1000).toISOString();

      const res = await createAppointmentAction({
        workspaceId,
        title,
        startTime: startIso,
        endTime: endIso,
      });

      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setFeedback({
          type: "success",
          text: `Appointment "${title}" booked successfully${res.externalCalendarEventId ? " and synced to Google Calendar!" : " in CRM!"}`,
        });
        setAppointments((prev) => [
          {
            id: res.id || `appt-${Date.now()}`,
            title,
            start_time: startIso,
            end_time: endIso,
            status: "scheduled",
            external_calendar_event_id: res.externalCalendarEventId,
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to book appointment" });
    } finally {
      setIsBooking(false);
    }
  };

  const isGoogleConnected = connections.some((c) => c.is_syncing);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5E5E0]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#18181B]">
            Calendar & Appointments
          </h2>
          <p className="mt-1 text-xs text-[#71717A]">
            Two-way Google Calendar synchronization, scheduled service consultations, and SLA appointment tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isGoogleConnected ? "success" : "outline"}>
            {isGoogleConnected ? "Google Calendar Linked" : "Local CRM Sync"}
          </Badge>
          <a
            href={`/api/auth/google?workspace_id=${workspaceId}`}
            className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg border border-[#E5E5E0] bg-white text-[#18181B] hover:bg-[#FAFAF8] transition-colors shadow-sm"
          >
            <Calendar className="h-3.5 w-3.5 mr-1 text-[#4285F4]" />
            Connect Google
          </a>
        </div>
      </div>

      {feedback && (
        <Feedback
          variant={feedback.type}
          title={feedback.type === "success" ? "Appointment Confirmed" : "Booking Notice"}
        >
          {feedback.text}
        </Feedback>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#E5E5E0]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#1E3A2F]">
                {appointments.filter((a) => a.status === "scheduled").length}
              </span>
              <span className="text-xs text-green-700 font-medium">Scheduled</span>
            </div>
            <p className="mt-1 text-[11px] text-[#71717A]">
              Tied to employee availability
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E5E0]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
              Connected Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#18181B]">
                {connections.length}
              </span>
              <span className="text-xs text-[#71717A]">Google Workspaces</span>
            </div>
            <p className="mt-1 text-[11px] text-[#71717A]">
              {connections.length > 0 ? connections[0].account_email : "No account linked yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E5E0]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
              Sync Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold tracking-tight text-[#18181B]">
                OAuth 2.0 Real-Time
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#71717A]">
              Automatic lead SLA acknowledgement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Booking Form */}
      <Card className="border-[#E5E5E0]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#18181B] flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#1E3A2F]" />
            Schedule New Service Consultation / Appointment
          </CardTitle>
          <CardDescription className="text-xs text-[#71717A]">
            Books an appointment slot in CRM and synchronizes directly to the connected Google Calendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAppointment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[#18181B]">Appointment Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 flex h-9 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-1.5 text-xs text-[#18181B] focus:border-[#1E3A2F] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#18181B]">Start Date & Time</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="mt-1 flex h-9 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-1.5 text-xs text-[#18181B] focus:border-[#1E3A2F] focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" className="h-9 text-xs" isLoading={isBooking}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Book Appointment
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <Card className="border-[#E5E5E0]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[#18181B]">
              Scheduled Appointments
            </CardTitle>
            <Badge variant="outline">{appointments.length} Appointments</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] border-y border-[#E5E5E0] text-[#71717A] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Title</th>
                  <th className="py-2.5 px-4 font-semibold">Staff Host</th>
                  <th className="py-2.5 px-4 font-semibold">Start Time</th>
                  <th className="py-2.5 px-4 font-semibold">End Time</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Calendar Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFEA] text-[#18181B]">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#71717A]">
                      No appointments booked yet. Schedule a consultation above to sync with Google Calendar.
                    </td>
                  </tr>
                ) : (
                  appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-[#FAFAF8]/80 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-[#18181B]">
                        {a.title}
                      </td>
                      <td className="py-2.5 px-4 text-[#71717A]">
                        {a.profiles?.full_name || "Assigned Rep"}
                      </td>
                      <td className="py-2.5 px-4 text-[#18181B]">
                        {new Date(a.start_time).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-4 text-[#71717A]">
                        {new Date(a.end_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={
                            a.status === "scheduled"
                              ? "success"
                              : a.status === "completed"
                              ? "sage"
                              : "outline"
                          }
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {a.external_calendar_event_id ? (
                          <span className="text-[11px] text-green-700 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Google Synced
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#71717A]">CRM Scheduled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
