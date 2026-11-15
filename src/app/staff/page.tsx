"use client";
import { KeyRound, UserCog } from "lucide-react";
import { SignInForm } from "@/components/sign-in";

/** Course director & assistant link. Accounts are created in the School of Engineering portal. */
export default function StaffLoginPage() {
  return (
    <SignInForm
      roles={["director", "assistant"]}
      badge="Course director"
      title="Course director sign in"
      subtitle="For the course director and programme assistants. Your username and password were emailed to you by the School of Engineering."
      idLabel="Username or email"
      idPlaceholder="director"
      demo={[
        { label: "Director", username: "director", icon: <KeyRound className="size-4" /> },
        { label: "Assistant", username: "assistant", icon: <UserCog className="size-4" /> },
      ]}
      showHome={false}
      footer={<>No account? Use the help button to ask the School of Engineering for access.</>}
    />
  );
}
