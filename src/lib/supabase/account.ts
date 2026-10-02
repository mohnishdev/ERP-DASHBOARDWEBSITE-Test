import type { SupabaseClient } from "@supabase/supabase-js";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  modules: string[];
  type: "admin" | "customer";
};

export async function loadAppUser(client: SupabaseClient, userId: string, email = ""): Promise<AppUser | null> {
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("full_name, email, status, roles(name, permitted_modules)")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || profile?.status !== "Active") return null;

  const role = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles;
  if (role?.name && Array.isArray(role.permitted_modules) && role.permitted_modules.length > 0) {
    return {
      id: userId,
      email: profile.email || email,
      name: profile.full_name || email,
      role: role.name,
      modules: role.permitted_modules,
      type: "admin",
    };
  }

  const { data: customer, error: customerError } = await client
    .from("customers")
    .select("name, email")
    .eq("user_id", userId)
    .maybeSingle();

  if (customerError || !customer) return null;

  return {
    id: userId,
    email: customer.email || email,
    name: customer.name || email,
    role: "Customer",
    modules: [],
    type: "customer",
  };
}