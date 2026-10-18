import { NextResponse } from "next/server";
import { captureIncomingLead } from "@/lib/services/lead-intake";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, name, email, phone, company, inquiry } = body;

    if (!workspaceId || !name || (!email && !phone)) {
      return NextResponse.json(
        { error: "Missing required contact fields" },
        { status: 400 }
      );
    }

    const result = await captureIncomingLead({
      workspaceId,
      source: "form",
      contactIdentity: {
        name,
        email: email || null,
        phone: phone || null,
        companyName: company || null,
      },
      inquiryTitle: `${name} - Web Inquiry`,
      inquiryNotes: inquiry || undefined,
      deadlineSeconds: 900, // 15 minutes default
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Intake failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      leadId: result.leadId,
      ownerId: result.assignment?.ownerId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
