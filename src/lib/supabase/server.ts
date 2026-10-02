import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSimulationMode } from "./mode";

export async function createClient() {
  if (isSimulationMode()) {
    throw new Error("Supabase network access is disabled in simulation mode.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase auth is not configured. Set the public Supabase URL and key in .env.local.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; middleware refreshes the session.
        }
      },
    },
  });
}