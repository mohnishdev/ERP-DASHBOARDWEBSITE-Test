import { createBrowserClient } from "@supabase/ssr";
import { isSimulationMode } from "./mode";

export function createClient() {
  if (isSimulationMode()) {
    throw new Error("Supabase network access is disabled in simulation mode.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase auth is not configured. Set the public Supabase URL and key in .env.local.");
  }

  return createBrowserClient(url, key);
}