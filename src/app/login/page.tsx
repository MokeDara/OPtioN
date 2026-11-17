"use client";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
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
      idLabel="Student number"
      idPlaceholder="pg55000"
      demo={[
        { label: "Year 2 student", username: "pg50001", icon: <GraduationCap className="size-4" /> },
        { label: "Year 1 student", username: "pg50101", icon: <GraduationCap className="size-4" /> },
      ]}
      footer={
        <>
          <FirstTime />
        </>
      }
    />
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
