"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authStorageKey, useAppDispatch, useAppState } from "@/context/AppContext";
import type { Booking, SupportChat } from "@/lib/dashboard";

type CustomerView = "overview" | "shipments" | "track" | "invoices" | "profile" | "support";

type CustomerPortalProps = {
  view?: CustomerView;
};

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function formatDate(date: string) {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClass(status: string) {
  if (status === "Delivered") return "b-green";
  if (status === "In Transit" || status === "Assigned") return "b-amber";
  if (status === "Exception" || status === "Cancelled") return "b-red";
  return "b-gray";
}

export function CustomerPortal({ view = "overview" }: CustomerPortalProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentUser, authReady, DB, theme } = useAppState();
  const customerName = currentUser?.name || "";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [submittedTracking, setSubmittedTracking] = useState("");
  const [selectedShipment, setSelectedShipment] = useState<Booking | null>(null);
  const [supportChat, setSupportChat] = useState<SupportChat | null>(() => {
    const inMemoryChat = DB.chats.find((chat) => chat.visitor === customerName) || null;
    if (typeof window === "undefined") return inMemoryChat;
    try {
      const saved = JSON.parse(localStorage.getItem("jaad_erp_state_v3") || "null");
      const storedChats = saved?.data?.chats as SupportChat[] | undefined;
      return storedChats?.find((chat) => chat.visitor === customerName) || inMemoryChat;
    } catch {
      return inMemoryChat;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (authReady && currentUser?.type !== "customer") {
      router.replace(currentUser?.type === "admin" ? "/admin/dashboard" : "/");
    }
  }, [authReady, currentUser, router]);

  if (!authReady || currentUser?.type !== "customer") return null;

  const signedInCustomerName = customerName;
  const customerRecord = DB.customers.find((customer) => customer.name === signedInCustomerName);
  const bookings = DB.bookings.filter((booking) => booking.customer === signedInCustomerName);
  const trackedBooking = submittedTracking
    ? bookings.find((booking) => booking.tracking.toLowerCase() === submittedTracking.toLowerCase())
    : undefined;
  const trackingEvents = trackedBooking ? DB.trackingEvents[trackedBooking.id] || [] : [];
  const trackingInvoice = trackedBooking
    ? DB.invoices.find((invoice) => invoice.customer === customerName && invoice.linkedShipment === trackedBooking.tracking)
    : undefined;
  const selectedShipmentEvents = selectedShipment ? DB.trackingEvents[selectedShipment.id] || [] : [];
  const selectedShipmentInvoice = selectedShipment
    ? DB.invoices.find((invoice) => invoice.customer === customerName && invoice.linkedShipment === selectedShipment.tracking)
    : undefined;
  const invoices = DB.invoices.filter((invoice) => invoice.customer === signedInCustomerName && (!("posted" in invoice) || invoice.posted !== false));
  const openInvoices = invoices.filter((invoice) => invoice.status !== "Paid");
  const customerChat = supportChat || DB.chats.find((chat) => chat.visitor === signedInCustomerName) || null;
  const recentBookings = [...bookings]
    .sort((first, second) => new Date(second.pickup).getTime() - new Date(first.pickup).getTime())
    .slice(0, 6);
  const initials = signedInCustomerName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  const toggleTheme = () => dispatch({ type: "SET_THEME", theme: theme === "light" ? "dark" : "light" });
  const logout = () => {
    sessionStorage.removeItem(authStorageKey);
    dispatch({ type: "SET_CURRENT_USER", user: null });
    router.replace("/");
  };

  const sendCustomerMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = String(form.get("message") || "").trim();
    if (!text) return;

    const now = new Date();
    const message = {
      from: "visitor",
      text,
      time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    };
    let storedState: { data?: Record<string, unknown>; [key: string]: unknown } = {};
    let chatsToUpdate = DB.chats;
    try {
      storedState = JSON.parse(localStorage.getItem("jaad_erp_state_v3") || "null") || {};
      const storedChats = storedState.data?.chats;
      if (Array.isArray(storedChats)) chatsToUpdate = storedChats as SupportChat[];
    } catch {
      storedState = {};
    }
    const existing = supportChat || chatsToUpdate.find((chat) => chat.visitor === signedInCustomerName) || null;
    const nextChat: SupportChat = existing
      ? {
          ...existing,
          status: "Open",
          ...(existing.status === "Resolved" ? { humanTookOver: false } : {}),
          messages: [...existing.messages, message],
        }
      : {
          id: `cust-${Date.now()}`,
          visitor: signedInCustomerName,
          status: "Open",
          ticketId: null,
          waitingForAgent: false,
          messages: [message],
        };

    const nextChats = [...chatsToUpdate.filter((chat) => chat.visitor !== signedInCustomerName), nextChat];
    const nextDB = { ...DB, chats: nextChats };
    dispatch({ type: "SET_DB", DB: nextDB });
    setSupportChat(nextChat);
    try {
      localStorage.setItem("jaad_erp_state_v3", JSON.stringify({
        ...storedState,
        savedAt: Date.now(),
        data: { ...(storedState.data || {}), chats: nextChats },
      }));
    } catch {
      // Keep the in-memory thread available for this session if storage is unavailable.
    }
    event.currentTarget.reset();
  };

  const visibleCustomerMessages = customerChat?.messages.slice(customerChat.clearedIndex || 0) || [];

  return (
    <div id="customerApp">
      <aside
        id="csidebar"
        className={sidebarOpen ? "open" : ""}
        style={sidebarOpen ? { transform: "translateX(0)" } : undefined}
      >
        <div className="brand">
          <Image src="/legacy-assets/embedded_asset_1.png" width={305} height={201} alt="JAAD Logistics" />
          <div>
            <div className="brand-word">JAAD Logistics</div>
            <div className="brand-sub">Customer portal</div>
          </div>
        </div>
        <nav className="navlist">
          <div className="nav-group-label">My account</div>
          <Link className={`nav-item${view === "overview" ? " active" : ""}`} href="/customer" aria-current={view === "overview" ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span>Overview</span>
          </Link>
          <Link className={`nav-item${view === "shipments" ? " active" : ""}`} href="/customer/shipments" aria-current={view === "shipments" ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
              <path d="m3.5 7.8 8.5 4.4 8.5-4.4M12 12.2V21" />
            </svg>
            <span>My Shipments</span>
          </Link>
          <Link className={`nav-item${view === "track" ? " active" : ""}`} href="/customer/track" aria-current={view === "track" ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 5 5" />
            </svg>
            <span>Track</span>
          </Link>
          <Link className={`nav-item${view === "invoices" ? " active" : ""}`} href="/customer/invoices" aria-current={view === "invoices" ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M8 8h8M8 12h8M8 16h4" />
            </svg>
            <span>Invoices</span>
          </Link>
          <Link className={`nav-item${view === "profile" ? " active" : ""}`} href="/customer/profile" aria-current={view === "profile" ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
            <span>Profile</span>
          </Link>
          <Link className={`nav-item${view === "support" ? " active" : ""}`} href="/customer/support" aria-current={view === "support" ? "page" : undefined} onClick={() => setSidebarOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
            </svg>
            <span>Support</span>
          </Link>
        </nav>
        <div className="sidebar-foot">JAAD Logistics Ltd<br />Lagos, Nigeria · est. 2018<br />Prototype build, sample data only<br /><b style={{ color: "var(--red)" }}>Build 17</b></div>
      </aside>

      <div id="cshell">
        <header id="ctopbar">
          <div className="topbar-left">
            <button id="menu-toggle" type="button" aria-label="Toggle customer menu" onClick={() => setSidebarOpen((open) => !open)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <div className="crumb">{view === "overview" ? "Overview" : view === "shipments" ? "My Shipments" : view === "track" ? "Track a shipment" : view === "invoices" ? "Invoices" : view === "profile" ? "Profile" : "Support"}</div>
          </div>
          <div className="topbar-right">
            <button className="icon-btn" type="button" title="Toggle theme" aria-label="Toggle theme" onClick={toggleTheme}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            </button>
            <div className="avatar" aria-label={`Signed in as ${customerName}`}>{initials}</div>
            <button className="icon-btn" type="button" title="Log out" aria-label="Log out" onClick={logout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </header>

        <main id="cmain">
          {view === "support" ? <>
            <div className="view-head"><div><h1>Support</h1></div></div>
            <div className="card" style={{ marginTop: 16 }}>
              {customerChat?.status === "Resolved" && <div style={{ background: "var(--green-dim)", color: "var(--green)", fontSize: 12, fontWeight: 700, padding: "9px 14px", borderRadius: 8, marginBottom: 12 }}>✓ Your last conversation was resolved. Send a new message any time to start again.</div>}
              <div className="card-title" style={{ marginBottom: 10 }}>Send us a message</div>
              {customerChat && customerChat.status !== "Resolved" && visibleCustomerMessages.length ? (
                <div className="chat-msgs" style={{ maxHeight: 280, marginBottom: 14, border: "1px solid var(--border)", borderRadius: 8 }}>
                  {visibleCustomerMessages.map((message, index) => (
                    <div className={`msg ${message.from}`} key={`${customerChat.id}-${index}`}>
                      {message.text}<span className="tm">{message.time || ""}</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{ fontSize: 12.4, color: "var(--text-dim)", margin: "0 0 14px" }}>No messages yet, say hello and our team will reply here.</p>}
              <form onSubmit={sendCustomerMessage}>
                <div className="field"><label htmlFor="customer-support-message">Message</label><textarea id="customer-support-message" name="message" rows={3} placeholder="How can we help?" /></div>
                <button className="btn btn-primary" type="submit">Send message</button>
              </form>
            </div>
          </> : view === "profile" ? <>
            <div className="view-head"><div><h1>Profile</h1></div></div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Photo</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
                <div className="avatar" style={{ width: 56, height: 56, fontSize: 16 }}>{initials}</div>
                <input type="file" accept="image/*" aria-label="Choose profile photo" />
              </div>
              <div className="card-title" style={{ marginBottom: 12 }}>Details</div>
              <div className="grid g-2">
                <div className="field"><label htmlFor="customer-profile-company">Company</label><input id="customer-profile-company" defaultValue={customerName} /></div>
                <div className="field"><label htmlFor="customer-profile-contact">Contact</label><input id="customer-profile-contact" defaultValue={customerRecord?.contact || ""} /></div>
              </div>
              <button className="btn btn-primary" type="button" style={{ marginTop: 6 }}>Save changes</button>
              <div style={{ borderTop: "1px solid var(--border)", margin: "20px 0 16px", paddingTop: 16 }}>
                <div className="card-title" style={{ marginBottom: 12 }}>Change password</div>
                <div className="grid g-2">
                  <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="customer-current-password">Current password</label><input id="customer-current-password" type="password" /></div>
                  <div className="field"><label htmlFor="customer-new-password">New password</label><input id="customer-new-password" type="password" /></div>
                  <div className="field"><label htmlFor="customer-confirm-password">Confirm new password</label><input id="customer-confirm-password" type="password" /></div>
                </div>
                <button className="btn btn-primary" type="button" style={{ marginTop: 6 }}>Update password</button>
              </div>
            </div>
          </> : view === "invoices" ? <>
            <div className="view-head">
              <div>
                <h1>Invoices</h1>
                <p>Billing history for your account.</p>
              </div>
            </div>
            <div className="table-wrap">
              {invoices.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.no}>
                        <td className="mono">{invoice.no}</td>
                        <td>{formatDate(invoice.date)}</td>
                        <td>{formatNaira(invoice.amount)}</td>
                        <td><span className={`badge ${invoice.status === "Paid" ? "st-connected" : invoice.status === "Overdue" ? "b-red" : "b-gray"}`}><span className="dot" />{invoice.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="empty">Nothing to show yet</div>}
            </div>
          </> : view === "track" ? <>
            <div className="view-head">
              <div>
                <h1>Track a shipment</h1>
                <p>Enter any tracking number on your account.</p>
              </div>
            </div>
            <div className="card">
              <div style={{ display: "flex", gap: 9, maxWidth: 420 }}>
                <input id="track-input" placeholder="e.g. JAAD/2807/2026/00231" style={{ flex: 1 }} value={trackingInput} onChange={(event) => setTrackingInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setSubmittedTracking(trackingInput.trim()); }} />
                <button className="btn btn-primary" type="button" onClick={() => setSubmittedTracking(trackingInput.trim())}>Track</button>
              </div>
              <div id="track-result">
                {submittedTracking && !trackedBooking && <div className="empty">No shipment matches that tracking number yet, keep typing</div>}
                {trackedBooking && <div className="doc-page-wrap" style={{ marginTop: 16 }}>
                  <div className="doc">
                    <div className="doc-head">
                      <div><Image src="/legacy-assets/embedded_asset_1.png" width={305} height={201} alt="JAAD Logistics" style={{ height: 30, width: "auto" }} /></div>
                      <div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div>
                    </div>
                    <h2>Shipment {trackedBooking.tracking}</h2>
                    <div className="doc-route">
                      <div className="pt"><div className="lbl">Picked up from</div><div className="v">{trackedBooking.origin}</div></div>
                      <div className="arrow">→</div>
                      <div className="pt" style={{ textAlign: "right" }}><div className="lbl">Headed to</div><div className="v">{trackedBooking.destination}</div></div>
                    </div>
                    <div className="doc-grid">
                      <div><div className="lbl">Customer</div>{trackedBooking.customer}</div>
                      <div style={{ textAlign: "right" }}><div className="lbl">Pickup date</div>{formatDate(trackedBooking.pickup)}<br /><div className="lbl" style={{ marginTop: 8 }}>Status</div><span className={`badge ${statusClass(trackedBooking.status)}`}>{trackedBooking.status}</span></div>
                    </div>
                    <div className="doc-grid">
                      <div><div className="lbl">Mode</div>{trackedBooking.type}</div>
                      <div style={{ textAlign: "right" }}><div className="lbl">Weight</div>{trackedBooking.weight}</div>
                    </div>
                    <div className="doc-grid">
                      <div><div className="lbl">Declared value</div>{formatNaira(trackedBooking.value)}</div>
                      <div style={{ textAlign: "right" }}><div className="lbl">Invoice</div>{trackingInvoice?.no || "Not yet issued"}</div>
                    </div>
                    {trackedBooking.notes && <div className="note">{trackedBooking.notes}</div>}
                    <div className="form-section-title">Tracking history</div>
                    {trackingEvents.length ? trackingEvents.map((trackingEvent, index) => (
                      <div key={`${trackingEvent[0]}-${index}`} style={{ display: "flex", gap: 12, padding: "6px 0", borderTop: "1px solid var(--border)", fontSize: 12 }}>
                        <span className="mono" style={{ color: "var(--text-faint)", minWidth: 120 }}>{trackingEvent[0]}</span>
                        <span>{trackingEvent[1]}</span>
                      </div>
                    )) : <div className="empty">No events yet</div>}
                  </div>
                </div>}
              </div>
            </div>
          </> : view === "overview" ? <>
          <div className="view-head">
            <div>
              <h1>Welcome back, {customerName}</h1>
              <p>Here is a snapshot of your account.</p>
            </div>
          </div>

          {DB.announcements.map((announcement) => (
            <div className="alert-banner" key={announcement.id}>
              <div className="a-text"><strong>{announcement.title}</strong><br />{announcement.body}</div>
            </div>
          ))}

          <div className="grid g-4" style={{ margin: "14px 0" }}>
            <div className="kpi-card"><div className="kpi-label">Total shipments</div><div className="kpi-value">{bookings.length}</div><div className="kpi-cap">shipments on file</div></div>
            <div className="kpi-card"><div className="kpi-label">Active shipments</div><div className="kpi-value">{bookings.filter((booking) => booking.status === "In Transit" || booking.status === "Assigned").length}</div><div className="kpi-cap">currently moving</div></div>
            <div className="kpi-card"><div className="kpi-label">Open invoices</div><div className="kpi-value">{openInvoices.length}</div><div className="kpi-cap">{formatNaira(openInvoices.reduce((total, invoice) => total + invoice.amount, 0))} due</div></div>
            <div className="kpi-card"><div className="kpi-label">Open conversation</div><div className="kpi-value">{customerChat && customerChat.status !== "Resolved" ? "1" : "0"}</div><div className="kpi-cap">with our support team</div></div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Recent shipments</div>
              <Link className="subtle-link" href="/customer/shipments">View all</Link>
            </div>
            {recentBookings.length ? recentBookings.map((booking) => (
              <div key={booking.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                <span className="mono" style={{ fontSize: 11.6 }}>{booking.tracking}</span>
                <span style={{ fontSize: 12, color: "var(--text-dim)", flex: 1, textAlign: "right" }}>{booking.destination}</span>
                <span className={`badge ${statusClass(booking.status)}`}>{booking.status}</span>
              </div>
            )) : <div className="empty">No shipments on file yet.</div>}
          </div>
          </> : <>
            <div className="view-head">
              <div>
                <h1>My Shipments</h1>
                <p>Every shipment booked under your account.</p>
              </div>
            </div>
            <div className="table-wrap">
              {bookings.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Tracking #</th>
                      <th>Route</th>
                      <th>Mode</th>
                      <th>Pickup date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <button className="mono link-cell" type="button" style={{ background: "none", border: 0, padding: 0 }} onClick={() => setSelectedShipment(booking)}>
                            {booking.tracking}
                          </button>
                        </td>
                        <td>{booking.origin} → {booking.destination}</td>
                        <td>{booking.type}</td>
                        <td>{formatDate(booking.pickup)}</td>
                        <td><span className={`badge ${statusClass(booking.status)}`}><span className="dot" />{booking.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="empty">Nothing to show yet</div>}
            </div>
          </>}
        </main>
      </div>
      {selectedShipment && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelectedShipment(null); }}>
        <div className="modal doc-modal" role="dialog" aria-modal="true" aria-label={`Shipment ${selectedShipment.tracking}`}>
          <div className="modal-head">
            <h3>{selectedShipment.tracking} <span className={`badge ${statusClass(selectedShipment.status)}`}>{selectedShipment.status}</span></h3>
            <button className="x-btn" type="button" aria-label="Close shipment details" onClick={() => setSelectedShipment(null)}>×</button>
          </div>
          <div className="modal-body">
            <div className="doc">
              <div className="doc-head">
                <div><Image src="/legacy-assets/embedded_asset_1.png" width={305} height={201} alt="JAAD Logistics" style={{ height: 30, width: "auto" }} /></div>
                <div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div>
              </div>
              <h2>Shipment {selectedShipment.tracking}</h2>
              <div className="doc-route">
                <div className="pt"><div className="lbl">Picked up from</div><div className="v">{selectedShipment.origin}</div></div>
                <div className="arrow">→</div>
                <div className="pt" style={{ textAlign: "right" }}><div className="lbl">Headed to</div><div className="v">{selectedShipment.destination}</div></div>
              </div>
              <div className="doc-grid">
                <div><div className="lbl">Customer</div>{selectedShipment.customer}</div>
                <div style={{ textAlign: "right" }}><div className="lbl">Pickup date</div>{formatDate(selectedShipment.pickup)}<br /><div className="lbl" style={{ marginTop: 8 }}>Status</div><span className={`badge ${statusClass(selectedShipment.status)}`}>{selectedShipment.status}</span></div>
              </div>
              <div className="doc-grid">
                <div><div className="lbl">Mode</div>{selectedShipment.type}</div>
                <div style={{ textAlign: "right" }}><div className="lbl">Weight</div>{selectedShipment.weight}</div>
              </div>
              <div className="doc-grid">
                <div><div className="lbl">Declared value</div>{formatNaira(selectedShipment.value)}</div>
                <div style={{ textAlign: "right" }}><div className="lbl">Invoice</div>{selectedShipmentInvoice?.no || "Not yet issued"}</div>
              </div>
              {selectedShipment.notes && <div className="note">{selectedShipment.notes}</div>}
              <div className="form-section-title">Tracking history</div>
              {selectedShipmentEvents.length ? selectedShipmentEvents.map((trackingEvent, index) => (
                <div key={`${trackingEvent[0]}-${index}`} style={{ display: "flex", gap: 12, padding: "6px 0", borderTop: "1px solid var(--border)", fontSize: 12 }}>
                  <span className="mono" style={{ color: "var(--text-faint)", minWidth: 120 }}>{trackingEvent[0]}</span>
                  <span>{trackingEvent[1]}</span>
                </div>
              )) : <div className="empty">No events yet</div>}
            </div>
          </div>
          <div className="modal-foot"><button className="btn" type="button" onClick={() => setSelectedShipment(null)}>Close</button></div>
        </div>
      </div>}
    </div>
  );
}