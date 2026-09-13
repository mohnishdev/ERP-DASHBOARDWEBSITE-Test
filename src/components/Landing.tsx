"use client";

import { useState } from "react";
import { useAppDispatch, useNavigate } from "@/context/AppContext";

type Account = { email: string; pass: string; name: string; role: string; modules: "all" | string[]; type: "admin" | "customer" };

const defaultAccounts: Account[] = [
  { email: "admin@jaadlogistics.com", pass: "admin123", name: "Joseph Abidoye", role: "Super Admin", modules: "all", type: "admin" },
  { email: "support@jaadlogistics.com", pass: "support123", name: "Support Agent", role: "Customer Support", modules: ["dashboard", "support"], type: "admin" },
  { email: "customer@jaadlogistics.com", pass: "customer123", name: "EricBoss Furnitures", role: "Customer", modules: [], type: "customer" },
];

function readAccounts() {
  if (typeof window === "undefined") return defaultAccounts;
  try { return [...defaultAccounts, ...(JSON.parse(localStorage.getItem("jaad_mock_accounts") || "[]") as Account[])]; } catch { return defaultAccounts; }
}

export function Landing() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<"login" | "signup" | "admin" | null>(null);
  const [verification, setVerification] = useState<{ account: Account; code: string; signup: boolean } | null>(null);
  const [verificationInput, setVerificationInput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const startVerification = (account: Account, signup: boolean) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setVerification({ account, code, signup });
    setVerificationInput("");
    setError("");
  };

  const submitLogin = (event: React.FormEvent<HTMLFormElement>, admin: boolean) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const consent = form.get("consent");
    const account = readAccounts().find((candidate) => candidate.email === email && candidate.pass === password);
    if (!consent || !account || (admin && account.type !== "admin")) { setError("Incorrect email or password."); return; }
    startVerification(account, false);
  };

  const submitSignup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (!name || !email || !phone || !password || password !== confirmation || !form.get("consent")) { setError(password !== confirmation ? "Passwords do not match." : "Complete all required fields and agree to the terms."); return; }
    if (readAccounts().some((account) => account.email === email)) { setError("An account already exists for that email."); return; }
    const account: Account = { email, pass: password, name, role: "Customer", modules: [], type: "customer" };
    localStorage.setItem("jaad_mock_accounts", JSON.stringify([...readAccounts().filter((candidate) => !defaultAccounts.some((defaultAccount) => defaultAccount.email === candidate.email)), account]));
    startVerification(account, true);
  };

  const verify = () => {
    if (!verification || verificationInput !== verification.code) { setError("Verification code is incorrect"); return; }
    sessionStorage.setItem("jaad_mock_auth", JSON.stringify(verification.account));
    dispatch({ type: "SET_CURRENT_USER", user: verification.account });
    setVerification(null); setAuthMode(null);
    if (verification.signup || verification.account.type === "customer") { setNotice(verification.signup ? "Account created. Your mock customer account is ready." : "Customer account signed in."); return; }
    navigate("dashboard");
  };

  return <main className="landing-page">
    <header><div className="wrap nav"><div className="brand"><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" /></div><nav className="navlinks"><a href="#services">Services</a><a href="#coverage">Coverage</a><a href="#track">Track</a><a href="#about">About</a><a href="#careers">Careers</a><a href="#contact">Contact</a></nav><div className="navcta"><a href="#contact" className="btn small">Get a quote</a><button className="btn ghost small" onClick={() => { setAuthMode("login"); setError(""); }}>Sign up / Login</button></div></div></header>
    <section className="hero" id="home"><div className="wrap hero-grid"><div><div className="eyebrow" style={{ color: "#ff5c53" }}>Registered &amp; trademarked in Nigeria</div><h1>Africa&apos;s most trusted <span className="red">logistics</span> partner.</h1><p className="lead">JAAD Logistics moves cargo across all 36 Nigerian states and beyond — truck hire, freight, haulage and customs clearing, handled with precision from pickup to delivery.</p><div className="hero-actions"><a href="#contact" className="btn light">Request a quote</a><a href="#track" className="btn ghost" style={{ borderColor: "#3a3a40", color: "#fff" }}>Track a shipment</a></div><div className="hero-route"><div className="routeline"><div className="dot red" /><div className="track" /><div className="dot" style={{ background: "#fff" }} /></div><div className="labels"><span>Pickup</span><span>36 states · nationwide</span><span>Delivered</span></div></div></div><div className="hero-manifest stamp"><div className="mtitle">Sample waybill · JAAD/2026</div><div className="mrow"><span>Route</span><span>Fagba → Ilubirin</span></div><div className="mrow"><span>Service</span><span>Haulage</span></div><div className="mrow"><span>Status</span><span style={{ color: "#4ade80" }}>Delivered</span></div><div className="mrow"><span>Claims window</span><span>24 hrs</span></div><div className="mrow"><span>Checked by</span><span>Ops team</span></div></div></div></section>
    <div className="trust"><div className="wrap trust-grid"><div><div className="num">36</div><div className="lbl">States covered</div></div><div><div className="num">10+</div><div className="lbl">Major cities</div></div><div><div className="num">200+</div><div className="lbl">Countries shipped to</div></div><div><div className="num">Mon–Sat</div><div className="lbl">8am – 6pm ops</div></div></div></div>
    <section id="services"><div className="wrap"><div className="section-head"><div><div className="eyebrow">What we move</div><h2>Built for every kind of cargo.</h2></div><p>From a single pallet to a full fleet contract, one team handles booking, transit and proof of delivery.</p></div><div className="services-grid">{[["01", "Truck hire & haulage", "Mini trucks to 20-ton flatbeds and low-bed trailers, booked per trip or on contract."], ["02", "Interstate delivery", "Scheduled and same-day routes connecting all 36 states."], ["03", "Heavy equipment transport", "Machinery and industrial equipment moved with proper rigging and route planning."], ["04", "Corporate & contract logistics", "Dedicated trucks and consolidated monthly invoicing for business accounts."], ["05", "House & office relocation", "Full-service moves with careful handling for fragile items."], ["06", "Container & freight forwarding", "International shipping to over 200 countries with customs clearance support."]].map(([number, title, text]) => <div className="svc-card" key={number}><span className="idx">{number}</span><h3>{title}</h3><p>{text}</p></div>)}</div></div></section>
    <section className="steps"><div className="wrap"><div className="section-head"><div><div className="eyebrow">How booking works</div><h2>Five steps, start to delivered.</h2></div></div><div className="steps-row">{[["Share details", "Pickup, delivery, goods type, weight and preferred date."], ["Get a free quote", "No hidden charges — every fee is confirmed before dispatch."], ["Schedule pickup", "Same-day, next-day or a date you set."], ["Track in transit", "Status updates as your shipment moves."], ["Delivered", "Signed proof of delivery, invoice included."]].map(([title, text], index) => <div className="step" key={title}><div className="dotline"><div className="circle">{index + 1}</div>{index < 4 && <div className="line" />}</div><h4>{title}</h4><p>{text}</p></div>)}</div></div></section>
    <section id="coverage"><div className="wrap coverage-grid"><div><div className="eyebrow">Coverage</div><h2>Every state. Every major city.</h2><p style={{ color: "var(--grey-600)", marginTop: 14, fontSize: 15 }}>We operate across all 36 Nigerian states, with dedicated volume in these hubs:</p><div className="coverage-list">{["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Benin", "Enugu", "Aba", "Onitsha", "Kaduna"].map((city) => <span key={city}>{city}</span>)}</div></div><div className="coverage-stat stamp"><div className="big">36/36</div><div className="cap">Nigerian states served</div><div className="sub">International shipping available to over 200 countries and territories, with customs clearance assistance included.</div></div></div></section>
    <section className="tracking" id="track"><div className="wrap"><div className="section-head"><div><div className="eyebrow" style={{ color: "#ff5c53" }}>Shipment tracking</div><h2>Where&apos;s your shipment?</h2></div><p>Enter a tracking or waybill reference number.</p></div><div className="track-panel stamp"><div className="track-form"><input placeholder="e.g. JAAD/07/01/26/001" /><button className="btn light" onClick={() => setNotice("Live status lookups will appear here once the shipment database is connected.")}>Track</button></div>{notice && <div className="track-result" style={{ display: "block" }}><span className="flag">Tracking not yet live</span>{notice}</div>}</div></div></section>
    <section id="about"><div className="wrap"><div className="section-head"><div><div className="eyebrow">About JAAD Logistics</div><h2>Moving people forward.</h2></div></div><div className="about-grid"><div className="about-col"><div className="tag">Vision</div><h3>Africa&apos;s most trusted logistics partner</h3><p>A continent fully connected, where businesses move goods across borders without friction and Nigerian enterprise is represented at the highest global standard.</p></div><div className="about-col"><div className="tag">Mission</div><h3>Delivering excellence, every mile</h3><p>Reliable, efficient logistics solutions connecting Nigerian businesses to global markets.</p></div><div className="about-col purpose"><div className="tag">Purpose</div><h3>We simplify the complex, so you can build</h3><p>We remove the friction — customs, multi-modal transport and time-sensitive cargo — so our clients can focus on what they do best.</p></div></div></div></section>
    <section id="contact"><div className="wrap contact-grid"><div><div className="eyebrow">Get a quote</div><h2 style={{ marginBottom: 24 }}>Tell us what&apos;s moving.</h2><div className="form-row"><div className="field"><label>Full name</label><input /></div><div className="field"><label>Company (optional)</label><input /></div></div><div className="form-row"><div className="field"><label>Phone</label><input /></div><div className="field"><label>Email</label><input type="email" /></div></div><div className="form-row"><div className="field"><label>Pickup location</label><input /></div><div className="field"><label>Delivery location</label><input /></div></div><button className="btn" onClick={() => setNotice("Quote requests are recorded by the team in the connected legacy flow.")}>Request quote</button></div><div><div className="eyebrow">Contact</div><h2 style={{ marginBottom: 24 }}>Reach the team directly.</h2><div className="contact-info"><div className="row"><div className="k">Email</div><div className="v">info@jaadlogistics.com</div></div><div className="row"><div className="k">Phone</div><div className="v">+234 806 147 2153</div></div><div className="row"><div className="k">Address</div><div className="v">64a Olushi Street, Lagos Island, Lagos, Nigeria</div></div><div className="row"><div className="k">Hours</div><div className="v">Monday – Saturday, 8:00am – 6:00pm.</div></div></div></div></div></section>
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-cta">
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Let&apos;s move your cargo</div>
            <h3>Start shipping with JAAD Logistics.</h3>
          </div>
          <div className="footer-cta-actions">
            <a href="#contact" className="btn light">Get started</a>
            <a href="#track" className="btn ghost light-ghost">Track shipment</a>
          </div>
        </div>

        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand"><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" /></div>
            <p>JAAD Logistics helps businesses move cargo across Nigeria and beyond with reliable haulage, customs support, and end-to-end delivery coordination.</p>
            <div className="footer-badge">Trusted freight partner</div>
          </div>

          <div className="footer-column">
            <h4>Product</h4>
            <a href="#services">Services</a>
            <a href="#coverage">Coverage</a>
            <a href="#track">Tracking</a>
            <a href="#contact">Get a quote</a>
          </div>

          <div className="footer-column">
            <h4>Solutions</h4>
            <a href="#services">Truck hire &amp; haulage</a>
            <a href="#services">Interstate delivery</a>
            <a href="#services">Freight forwarding</a>
            <a href="#services">Corporate logistics</a>
          </div>

          <div className="footer-column">
            <h4>Company</h4>
            <a href="#about">About</a>
            <a href="#careers">Careers</a>
            <a href="#contact">Contact</a>
            <a href="#track">Shipment status</a>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-credit">© 2026 JAAD LOGISTICS. ALL RIGHTS RESERVED.</div>
          <div className="footer-bottom-links">
            <a href="#contact">Privacy</a>
            <a href="#contact">Terms</a>
            <a href="#contact">Legal</a>
          </div>
        </div>
      </div>
    </footer>

    {authMode && (
  <div className="modal-overlay open" onClick={(event) => { if (event.target === event.currentTarget) setAuthMode(null); }}>
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="auth-brand-mark">
          <img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" />
        </div>
        <div className="auth-brand-copy">
          <span className="eyebrow" style={{ color: "#ff5c53", marginBottom: 12 }}>Trusted logistics platform</span>
          <h2>Operate your freight business with confidence.</h2>
          <p>From daily haulage and inter-state dispatch to customer updates and operational visibility, JAAD keeps every move streamlined.</p>
        </div>
        <ul className="auth-points">
          <li>Real-time shipment visibility</li>
          <li>Trusted nationwide coverage</li>
          <li>Operational clarity for teams</li>
        </ul>
      </div>
      <div className="auth-modal">
        <button className="close" onClick={() => setAuthMode(null)}>×</button>
        <div className="auth-body">
          {authMode !== "admin" && (
            <div className="modal-tabs">
              <button className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setError(""); }}>Log in</button>
              <button className={authMode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); setError(""); }}>Sign up</button>
            </div>
          )}
          {authMode === "signup" ? (
            <form className="auth-form" onSubmit={submitSignup}>
              <div className="auth-form-head">
                <p className="auth-kicker">Create account</p>
                <h3>Create your account</h3>
              </div>
              <div className="field">
                <label>Full name</label>
                <input name="name" required />
              </div>
              <div className="field">
                <label>Email</label>
                <input name="email" type="email" required />
              </div>
              <div className="field">
                <label>Phone</label>
                <input name="phone" type="tel" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input name="password" type="password" required />
              </div>
              <div className="field">
                <label>Confirm password</label>
                <input name="confirmation" type="password" required />
              </div>
              <label className="auth-consent">
                <input name="consent" type="checkbox" required />
                <span>I agree to the Terms of Service and Privacy Policy.</span>
              </label>
              {error && <div className="login-error" style={{ display: "block" }}>{error}</div>}
              <button className="btn btn-red auth-submit" type="submit">Create account</button>
              <div className="auth-footer-switch">Already have an account? <button type="button" onClick={() => { setAuthMode("login"); setError(""); }}>Sign in</button></div>
            </form>
          ) : (
            <form className="auth-form" onSubmit={(event) => submitLogin(event, authMode === "admin")}>
              <div className="auth-form-head">
                <p className="auth-kicker">{authMode === "admin" ? "Admin access" : "Welcome back"}</p>
                <h3>{authMode === "admin" ? "Sign in to the dashboard" : "Sign in"}</h3>
              </div>
              <div className="field">
                <label>Email</label>
                <input name="email" type="email" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input name="password" type="password" required />
              </div>
              <div className="auth-inline-meta">
                <label className="auth-consent compact">
                  <input name="consent" type="checkbox" required />
                  <span>Remember me</span>
                </label>
                <button type="button" className="auth-link-button">Forgot password?</button>
              </div>
              {error && <div className="login-error" style={{ display: "block" }}>{error}</div>}
              <button className="btn btn-red auth-submit" type="submit">{authMode === "admin" ? "Access dashboard" : "Sign in"}</button>
              <div className="auth-footer-switch">
                {authMode === "admin" ? "Need customer access?" : "Need an account?"}
                <button type="button" onClick={() => { setAuthMode(authMode === "admin" ? "login" : "signup"); setError(""); }}>
                  {authMode === "admin" ? "Use customer login" : "Create account"}
                </button>
              </div>
              <div className="modal-note">{authMode === "admin" ? "Use your admin credentials to continue." : "Secure sign in for ordering, tracking, and support updates."}</div>
            </form>
          )}
        </div>
      </div>
    </div>
  </div>
)}
{verification && <div className="modal-overlay open"><div className="auth-modal auth-verify-modal"><div className="auth-verify-panel"><div className="auth-form-head center"><p className="auth-kicker">Two-factor verification</p><h3>Verify your account</h3></div><p className="auth-verify-copy">We sent a 6-digit code to your phone ending in ••••7832</p><div className="auth-otp-row"><input className="auth-otp-input" value={verificationInput} onChange={(event) => setVerificationInput(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="••••••" aria-label="Verification code" /></div>{error && <div className="login-error" style={{ display: "block" }}>{error}</div>}<div className="auth-verify-meta">Demo code: <strong>{verification.code}</strong></div><button className="btn btn-red auth-submit" onClick={verify}>Verify &amp; Sign In</button><div className="auth-footer-switch"><button type="button" onClick={() => setVerification(null)}>Back</button></div></div></div></div>}
  </main>;
}
