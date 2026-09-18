"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authStorageKey, useAppDispatch } from "@/context/AppContext";
import { readAccounts, saveAccount, type Account } from "@/lib/auth";

export function AdminAuth() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [verification, setVerification] = useState<{ account: Account; code: string } | null>(null);
  const [verificationInput, setVerificationInput] = useState("");
  const [error, setError] = useState("");

  const startVerification = (account: Account) => {
    setVerification({ account, code: String(Math.floor(100000 + Math.random() * 900000)) });
    setVerificationInput("");
    setError("");
  };

  const submitLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const account = readAccounts().find((candidate) => candidate.email === email && candidate.pass === password && candidate.type === "admin");
    if (!account || !form.get("consent")) { setError("Use valid admin credentials and accept the access terms."); return; }
    startVerification(account);
  };

  const submitSignup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (!name || !email || !phone || !password || password !== confirmation || !form.get("consent")) { setError(password !== confirmation ? "Passwords do not match." : "Complete all fields and accept the access terms."); return; }
    if (readAccounts().some((account) => account.email === email)) { setError("An account already exists for that email."); return; }
    const account: Account = { email, pass: password, name, role: "Operations Manager", modules: "all", type: "admin" };
    saveAccount(account);
    startVerification(account);
  };

  const verify = () => {
    if (!verification || verificationInput !== verification.code) { setError("Verification code is incorrect."); return; }
    sessionStorage.setItem(authStorageKey, JSON.stringify(verification.account));
    dispatch({ type: "SET_CURRENT_USER", user: verification.account });
    router.replace("/admin/dashboard");
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
            <li>Two-factor protected admin access</li>
            <li>Full visibility across every module</li>
          </ul>
        </div>
        <div className="auth-modal">
          <div className="auth-body">
            {verification ? (
              <div className="auth-verify-panel">
                <div className="auth-form-head center">
                  <p className="auth-kicker">Two-factor verification</p>
                  <h3>Verify admin access</h3>
                </div>
                <p className="auth-verify-copy">Enter the six-digit code generated for this admin session.</p>
                <div className="auth-otp-row">
                  <input className="auth-otp-input" value={verificationInput} onChange={(event) => setVerificationInput(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="••••••" aria-label="Verification code" />
                </div>
                {error && <div className="login-error" style={{ display: "block" }}>{error}</div>}
                <div className="auth-verify-meta">Demo code: <strong>{verification.code}</strong></div>
                <button className="btn btn-red auth-submit" type="button" onClick={verify}>Verify &amp; access dashboard</button>
                <div className="auth-footer-switch"><button type="button" onClick={() => setVerification(null)}>Back to sign in</button></div>
              </div>
            ) : (
              <>
                <div className="modal-tabs">
                  <button className={mode === "login" ? "active" : ""} type="button" onClick={() => { setMode("login"); setError(""); }}>Admin login</button>
                  <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => { setMode("signup"); setError(""); }}>Admin signup</button>
                </div>
                {mode === "login" ? (
                  <form className="auth-form admin-auth-form" onSubmit={submitLogin}>
                    <div className="auth-form-head">
                      <p className="auth-kicker">Staff only</p>
                      <h3>Sign in to administration</h3>
                    </div>
                    <div className="field"><label>Email</label><input name="email" type="email" required /></div>
                    <div className="field"><label>Password</label><input name="password" type="password" required /></div>
                    <label className="auth-consent"><input name="consent" type="checkbox" required /><span>I confirm I am authorized to access the admin portal.</span></label>
                    {error && <div className="login-error" style={{ display: "block" }}>{error}</div>}
                    <button className="btn btn-red auth-submit" type="submit">Continue as admin</button>
                    <p className="admin-demo-hint">Demo: admin@jaadlogistics.com / admin123</p>
                  </form>
                ) : (
                  <form className="auth-form admin-auth-form" onSubmit={submitSignup}>
                    <div className="auth-form-head">
                      <p className="auth-kicker">Request admin access</p>
                      <h3>Create admin account</h3>
                    </div>
                    <div className="field"><label>Full name</label><input name="name" required /></div>
                    <div className="field"><label>Work email</label><input name="email" type="email" required /></div>
                    <div className="field"><label>Phone</label><input name="phone" type="tel" required /></div>
                    <div className="field"><label>Password</label><input name="password" type="password" required /></div>
                    <div className="field"><label>Confirm password</label><input name="confirmation" type="password" required /></div>
                    <label className="auth-consent"><input name="consent" type="checkbox" required /><span>I agree to the admin access terms.</span></label>
                    {error && <div className="login-error" style={{ display: "block" }}>{error}</div>}
                    <button className="btn btn-red auth-submit" type="submit">Create admin account</button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
