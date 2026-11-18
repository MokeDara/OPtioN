"use client";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { SignInCard } from "@/components/sign-in";
import { StaffShell } from "@/components/staff-access";
import { useT } from "@/lib/prefs";

/** Professor & staff sign-in. First-timers go to "Request access"; forgotten passwords to /staff/forgot. */
export default function StaffLoginPage() {
  const t = useT();
  return (
    <StaffShell>
      <SignInCard
        roles={["director", "assistant", "professor"]}
        badge="Staff"
        title="Sign in"
        subtitle="Use the username or email and the password the DSI team gave you when your access was approved."
        idLabel="Username or email"
        idPlaceholder="name@dsi.uminho.pt"
        showLogo={false}
        extra={
          <div className="-mt-2 text-right">
            <Link href="/staff/forgot" className="text-xs font-semibold text-ink/55 hover:text-brand hover:underline">
              {t("Forgot password?")}
            </Link>
          </div>
        }
        footer={
          <Link href="/staff/request" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
            <GraduationCap className="size-4" /> {t("First time here? Request access")}
          </Link>
        }
      />
    </StaffShell>
  );
}
