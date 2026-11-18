"use client";
import Link from "next/link";
import { SignInForm } from "@/components/sign-in";
import { useT } from "@/lib/prefs";

/** Student link. */
export default function StudentLoginPage() {
  return (
    <SignInForm
      roles={["student"]}
      badge="Student"
      title="Student sign in"
      subtitle="Choose your options, follow your requests and see the calendar."
      idLabel="Student number or email"
      idPlaceholder="pg55000"
      extra={<ForgotLink />}
      footer={
        <>
          <FirstTime />
        </>
      }
    />
  );
}

function ForgotLink() {
  const t = useT();
  return (
    <div className="-mt-2 text-right">
      <Link href="/forgot-password" className="text-xs font-semibold text-ink/55 hover:text-brand hover:underline">
        {t("Forgot password?")}
      </Link>
    </div>
  );
}

function FirstTime() {
  const t = useT();
  return (
    <>
      {t("First time here?")}{" "}
      <Link href="/signup" className="font-semibold text-brand hover:underline">
        {t("Create your student account")}
      </Link>
    </>
  );
}
