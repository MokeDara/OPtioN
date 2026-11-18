import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DSI portal: give a staff profile its login, or set a new password.
 * Body: { action: "create" | "reset", profileId, password }
 * Only an active DSI admin may call it; their session cookie is checked first.
 */
export async function POST(request: Request) {
  const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
  let body: { action?: string; profileId?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.");
  }
  const { action, profileId, password } = body;
  if ((action !== "create" && action !== "reset") || !profileId || !password) return fail("Invalid request.");
  if (password.length < 8) return fail("The password must be at least 8 characters.");

  // Who is calling? Their own session, under row-level security.
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("Sign in first.", 401);
  const { data: me } = await supabase.from("profiles").select("role, active").eq("auth_id", auth.user.id).maybeSingle();
  if (!me || me.role !== "admin" || !me.active) return fail("Only the DSI team can create logins.", 403);

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return fail((e as Error).message, 500);
  }
  const { data: profile, error: pErr } = await admin.from("profiles").select("id, email, name, role, auth_id").eq("id", profileId).maybeSingle();
  if (pErr || !profile) return fail("Account not found.", 404);
  if (profile.role === "student") return fail("Students create their own login when they sign up.");

  if (profile.auth_id) {
    const { error } = await admin.auth.admin.updateUserById(profile.auth_id, { password });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true });
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: profile.email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { profile_id: profile.id, name: profile.name },
  });
  if (error || !created.user) {
    const taken = /already|registered|exists/i.test(error?.message ?? "");
    return fail(taken ? `${profile.email} already has a login. Ask them to sign in, or remove that login under Supabase → Authentication.` : error?.message ?? "Could not create the login.");
  }
  const { error: linkErr } = await admin.from("profiles").update({ auth_id: created.user.id, invited_at: new Date().toISOString() }).eq("id", profile.id);
  if (linkErr) return fail(linkErr.message, 500);
  return NextResponse.json({ ok: true });
}
