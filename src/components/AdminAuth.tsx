"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authStorageKey, useAppDispatch } from "@/context/AppContext";
import { loadAppUser } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/client";
import { isSimulationMode } from "@/lib/supabase/mode";

export function AdminAuth() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    if (!email || !password || !form.get("consent")) {
      setError("Enter your staff credentials and confirm access authorization.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      if (isSimulationMode()) {
        const roleByPrefix: Record<string, { role: string; modules: string[] }> = {
          ops: { role: "Operations Manager", modules: ["dashboard", "shipments", "fleet", "drivers", "warehouse"] },
          sales: { role: "Customer Service", modules: ["dashboard", "crm", "customers", "support"] },
          finance: { role: "Finance Officer", modules: ["dashboard", "finance", "reports"] },
          support: { role: "Support Agent", modules: ["dashboard", "support"] },
          driver: { role: "Driver", modules: ["shipments"] },
        };
        const localRole = roleByPrefix[email.split("@")[0].toLowerCase()] ?? {
          role: "Super Admin",
          modules: ["dashboard", "crm", "customers", "shipments", "fleet", "drivers", "warehouse", "finance", "hr", "support", "reports", "admin"],
        };
        const account = {
          id: `sim-${email}`,
          email,
          name: email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
          role: localRole.role,
          modules: localRole.modules,
          type: "admin" as const,
        };
        sessionStorage.setItem(authStorageKey, JSON.stringify(account));
        dispatch({ type: "SET_CURRENT_USER", user: account });
        const requestedPath = new URLSearchParams(window.location.search).get("returnTo");
        const destination = requestedPath?.startsWith("/admin/") && requestedPath !== "/admin/login"
          ? requestedPath
          : "/admin/dashboard";
        router.replace(destination);
        return;
      }

      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data.user) {
        setError("Email or password is incorrect.");
        return;
      }

      const account = await loadAppUser(supabase, data.user.id, data.user.email || email);
      if (!account || account.type !== "admin") {
        await supabase.auth.signOut();
        setError("This account does not have active staff access.");
        return;
      }

      dispatch({ type: "SET_CURRENT_USER", user: account });
      const requestedPath = new URLSearchParams(window.location.search).get("returnTo");
      const destination = requestedPath?.startsWith("/admin/") && requestedPath !== "/admin/login"
        ? requestedPath
        : "/admin/dashboard";
      router.replace(destination);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-auth-page">
      <div className="auth-shell admin-auth-shell">
        <div className="auth-brand-panel">
          <div className="auth-brand-mark">
            <img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" />
          </div>
          <div className="auth-brand-copy">
            <span className="eyebrow" style={{ color: "#ff5c53" }}>Admin control center</span>
            <h2>Run every shipment, driver and account from one dashboard.</h2>
            <p>Secure, role-based access built for JAAD Logistics operations teams.</p>
          </div>
          <ul className="auth-points">
            <li>Real-time fleet &amp; shipment oversight</li>
            <li>Access follows assigned staff permissions</li>
            <li>Full visibility across every module</li>
          </ul>
        </div>
        <div className="auth-modal">
          <div className="auth-body">
            <form className="auth-form admin-auth-form" onSubmit={submitLogin}>
              <div className="auth-form-head">
                <p className="auth-kicker">Staff only</p>
                <h3>Sign in to administration</h3>
              </div>
              <div className="field"><label>Email</label><input name="email" type="email" required autoComplete="username" /></div>
              <div className="field"><label>Password</label><input name="password" type="password" required autoComplete="current-password" /></div>
              <label className="auth-consent"><input name="consent" type="checkbox" required /><span>I confirm I am authorized to access the admin portal.</span></label>
              {error && <div className="login-error" style={{ display: "block" }}>{error}</div>}
              <button className="btn btn-red auth-submit" type="submit" disabled={loading}>{loading ? "Signing in..." : "Continue as admin"}</button>
              <p className="admin-demo-hint">{isSimulationMode() ? "Simulation only: enter any email and password to select a local role. Use ops@simulation.local, sales@simulation.local, finance@simulation.local, support@simulation.local or driver@simulation.local to test role access." : "Admin accounts are provisioned by an administrator."}</p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
