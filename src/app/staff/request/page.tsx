"use client";
import { RequestAccessForm, StaffShell } from "@/components/staff-access";

/** First-time professors ask for access here. */
export default function RequestAccessPage() {
  return (
    <StaffShell>
      <RequestAccessForm />
    </StaffShell>
  );
}
