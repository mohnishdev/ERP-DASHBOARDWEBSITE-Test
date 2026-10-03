import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadAppUser } from "@/lib/supabase/account";
import { isSimulationMode } from "@/lib/supabase/mode";

export async function POST(request: NextRequest) {
  if (isSimulationMode()) {
    return NextResponse.json({ error: "Staff invitations are unavailable in simulation mode." }, { status: 409 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const sessionClient = await createClient();
  const { data: { user }, error: userError } = await sessionClient.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const caller = await loadAppUser(sessionClient, user.id, user.email || "");
  if (!caller || caller.type !== "admin" || !caller.modules.includes("admin")) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: { name?: unknown; email?: unknown; roleId?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const roleId = typeof body.roleId === "string" ? body.roleId : "";
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[0-9a-f-]{36}$/i.test(roleId)) {
    return NextResponse.json({ error: "Enter a valid name, email and role." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Staff invitations require the server-only SUPABASE_SERVICE_ROLE_KEY setting." }, { status: 503 });
  }

  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: role, error: roleError } = await adminClient.from("roles").select("id, name").eq("id", roleId).maybeSingle();
  if (roleError || !role) return NextResponse.json({ error: "Selected role was not found." }, { status: 400 });

  const { data: invitation, error: invitationError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
  });
  if (invitationError || !invitation.user) {
    return NextResponse.json({ error: invitationError?.message || "Invitation could not be created." }, { status: 400 });
  }

  const { error: profileError } = await adminClient.from("profiles").update({ full_name: name, role_id: roleId, status: "Active" }).eq("id", invitation.user.id);
  if (profileError) {
    await adminClient.auth.admin.deleteUser(invitation.user.id);
    return NextResponse.json({ error: "Invitation was rolled back because the staff role could not be assigned." }, { status: 500 });
  }

  return NextResponse.json({ user: { id: invitation.user.id, name, email, role: role.name, status: "Active" } }, { status: 201 });
}
