"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { authStorageKey, useAppDispatch, useAppState } from "@/context/AppContext";
import type { Booking, Invoice, SupportChat } from "@/lib/dashboard";

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

function makeCustomerTrackingNumber(pickup: string, bookings: Booking[]) {
  const [year, month, day] = pickup.split("-");
  const highestSequence = bookings.reduce((highest, booking) => {
    const sequence = Number(booking.tracking.split("/").pop()) || 0;
    return Math.max(highest, sequence);
  }, 238);
  return `JAAD/${day}${month}/${year}/${String(highestSequence + 1).padStart(5, "0")}`;
}

function formatShipmentAddress(address?: string, city?: string, state?: string, country?: string) {
  return [address, [city, state, country].filter(Boolean).join(", ")].filter(Boolean).join("\n");
}

function ShipmentDocument({ booking, events, invoice }: { booking: Booking; events: string[][]; invoice?: Invoice }) {
  const hasParties = Boolean(booking.senderName || booking.receiverName);
  return <div className="doc">
    <div className="doc-head">
      <div><Image src="/legacy-assets/embedded_asset_1.png" width={305} height={201} alt="JAAD Logistics" style={{ height: 30, width: "auto" }} /></div>
      <div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div>
    </div>
    <h2>Shipment {booking.tracking}</h2>
    <div className="doc-route">
      <div className="pt"><div className="lbl">Picked up from</div><div className="v">{booking.origin}</div></div>
      <div className="arrow">→</div>
      <div className="pt" style={{ textAlign: "right" }}><div className="lbl">Headed to</div><div className="v">{booking.destination}</div></div>
    </div>
    {hasParties && <div className="doc-grid">
      <div>
        <div className="lbl">Sender</div>
        {booking.senderName || "—"}{booking.senderPhone && <> · {booking.senderPhone}</>}<br />
        {formatShipmentAddress(booking.senderAddress, booking.senderCity, booking.senderState, booking.senderCountry).split("\n").map((line, index) => <span key={`sender-${index}`}>{index > 0 && <br />}{line}</span>)}
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="lbl">Receiver</div>
        {booking.receiverName || "—"}{booking.receiverPhone && <> · {booking.receiverPhone}</>}<br />
        {formatShipmentAddress(booking.receiverAddress, booking.receiverCity, booking.receiverState, booking.receiverCountry).split("\n").map((line, index) => <span key={`receiver-${index}`}>{index > 0 && <br />}{line}</span>)}
      </div>
    </div>}
    <div className="doc-grid">
      <div><div className="lbl">Customer</div>{booking.customer}</div>
      <div style={{ textAlign: "right" }}><div className="lbl">Pickup date</div>{formatDate(booking.pickup)}<br /><div className="lbl" style={{ marginTop: 8 }}>Status</div><span className={`badge ${statusClass(booking.status)}`}>{booking.status}</span></div>
    </div>
    <div className="doc-grid">
      <div><div className="lbl">Mode</div>{booking.type}</div>
      <div style={{ textAlign: "right" }}><div className="lbl">Weight</div>{booking.weight}</div>
    </div>
    <div className="doc-grid">
      <div><div className="lbl">Declared value</div>{formatNaira(booking.value)}</div>
      <div style={{ textAlign: "right" }}>
        <div className="lbl">Invoice</div>
        {invoice?.posted === false ? `${invoice.no} (Draft, awaiting review)` : invoice ? <Link href={`/customer/invoices#invoice-${encodeURIComponent(invoice.no)}`}>{invoice.no}</Link> : "Not yet issued"}
      </div>
    </div>
    {booking.notes && <div className="note">{booking.notes}</div>}
    <div className="form-section-title">Tracking history</div>
    {events.length ? events.map(([time, description], index) => (
      <div key={`${time}-${index}`} style={{ display: "flex", gap: 12, padding: "6px 0", borderTop: "1px solid var(--border)", fontSize: 12 }}>
        <span className="mono" style={{ color: "var(--text-faint)", minWidth: 120 }}>{time}</span>
        <span>{description}</span>
      </div>
    )) : <div className="empty">No events yet</div>}
  </div>;
}

function downloadShipmentPdf(booking: Booking, events: string[][]) {
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = 56;
  document.setFontSize(16);
  document.text("JAAD Logistics Ltd", margin, y);
  y += 24;
  document.setFontSize(13);
  document.text(`Shipment ${booking.tracking}`, margin, y);
  y += 26;

  const addField = (label: string, value: string) => {
    const lines = document.splitTextToSize(value || "—", 340) as string[];
    if (y + Math.max(lines.length, 1) * 14 > 770) {
      document.addPage();
      y = 48;
    }
    document.setFontSize(9);
    document.setTextColor(120);
    document.text(label.toUpperCase(), margin, y);
    document.setFontSize(10);
    document.setTextColor(30);
    document.text(lines, margin + 130, y);
    y += Math.max(lines.length, 1) * 16 + 6;
  };

  addField("Customer", booking.customer);
  addField("From", booking.origin);
  addField("To", booking.destination);
  if (booking.senderName || booking.senderPhone || booking.senderAddress || booking.senderCity) {
    addField("Sender", [booking.senderName, booking.senderPhone, formatShipmentAddress(booking.senderAddress, booking.senderCity, booking.senderState, booking.senderCountry)].filter(Boolean).join(" · "));
  }
  if (booking.receiverName || booking.receiverPhone || booking.receiverAddress || booking.receiverCity) {
    addField("Receiver", [booking.receiverName, booking.receiverPhone, formatShipmentAddress(booking.receiverAddress, booking.receiverCity, booking.receiverState, booking.receiverCountry)].filter(Boolean).join(" · "));
  }
  addField("Mode", booking.type);
  addField("Pickup date", formatDate(booking.pickup));
  addField("Status", booking.status);
  addField("Weight", booking.weight);
  addField("Declared value", formatNaira(booking.value));
  if (booking.notes) addField("Notes", booking.notes);
  y += 10;
  events.forEach(([time, description]) => addField(time, description));
  document.save(`${booking.tracking.replace(/\//g, "-")}.pdf`);
}

export function CustomerPortal({ view = "overview" }: CustomerPortalProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentUser, authReady, DB, theme } = useAppState();
  const customerName = currentUser?.name || "";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [submittedTracking, setSubmittedTracking] = useState("");
  const [selectedTrackingNumber, setSelectedTrackingNumber] = useState("");
  const [selectedShipment, setSelectedShipment] = useState<Booking | null>(null);
  const [printBooking, setPrintBooking] = useState<Booking | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingNotice, setBookingNotice] = useState("");
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
    if (!printBooking) return;
    const clearPrintBooking = () => setPrintBooking(null);
    window.addEventListener("afterprint", clearPrintBooking, { once: true });
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", clearPrintBooking);
    };
  }, [printBooking]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("jaad_erp_state_v3") || "null");
      const savedBookings = saved?.data?.bookings as Booking[] | undefined;
      const savedInvoices = saved?.data?.invoices as Invoice[] | undefined;
      const knownTrackingNumbers = new Set(DB.bookings.map((booking) => booking.tracking));
      const knownInvoiceNumbers = new Set(DB.invoices.map((invoice) => invoice.no));
      const restoredBookings = Array.isArray(savedBookings) ? savedBookings.filter((booking) => !knownTrackingNumbers.has(booking.tracking)) : [];
      const restoredInvoices = Array.isArray(savedInvoices) ? savedInvoices.filter((invoice) => !knownInvoiceNumbers.has(invoice.no)) : [];
      if (!restoredBookings.length && !restoredInvoices.length) return;

      DB.bookings.push(...restoredBookings);
      DB.invoices.push(...restoredInvoices);
      dispatch({ type: "SET_DB", DB: { ...DB, bookings: [...DB.bookings], invoices: [...DB.invoices] } });
    } catch {
      // Keep the built-in sample data available if stored bookings cannot be read.
    }
  }, [DB, dispatch]);

  useEffect(() => {
    if (authReady && currentUser?.type !== "customer") {
      router.replace(currentUser?.type === "admin" ? "/admin/dashboard" : "/");
    }
  }, [authReady, currentUser, router]);

  if (!authReady || currentUser?.type !== "customer") return null;

  const signedInCustomerName = customerName;
  const customerRecord = DB.customers.find((customer) => customer.name === signedInCustomerName);
  const bookings = DB.bookings.filter((booking) => booking.customer === signedInCustomerName);
  const trackingMatches = submittedTracking
    ? bookings.filter((booking) => booking.tracking.toLowerCase().includes(submittedTracking.toLowerCase()))
    : [];
  const exactTrackingMatch = trackingMatches.find((booking) => booking.tracking.toLowerCase() === submittedTracking.toLowerCase());
  const trackedBooking = exactTrackingMatch
    || trackingMatches.find((booking) => booking.tracking === selectedTrackingNumber)
    || (trackingMatches.length === 1 ? trackingMatches[0] : undefined);
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

  const issueShipmentInvoice = (booking: Booking) => {
    if (DB.invoices.some((invoice) => invoice.linkedShipment === booking.tracking)) return;
    const sequence = DB.invoices.reduce((highest, invoice) => Math.max(highest, Number(invoice.no.replace("INV-", "")) || 0), 409) + 1;
    const invoice: Invoice = {
      no: `INV-${String(sequence).padStart(5, "0")}`,
      customer: booking.customer,
      amount: booking.value,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
      linkedShipment: booking.tracking,
      items: [{ desc: `${booking.type} freight, ${booking.origin} to ${booking.destination} (${booking.tracking})`, amount: booking.value }],
      posted: false,
    };
    DB.invoices.unshift(invoice);
    dispatch({ type: "SET_DB", DB: { ...DB, invoices: [...DB.invoices] } });
    try {
      const saved = JSON.parse(localStorage.getItem("jaad_erp_state_v3") || "null") || {};
      localStorage.setItem("jaad_erp_state_v3", JSON.stringify({
        ...saved,
        savedAt: Date.now(),
        data: { ...(saved.data || {}), invoices: DB.invoices },
      }));
    } catch {
      // Keep the draft available for this session if storage is unavailable.
    }
  };

  const submitCustomerBooking = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || "").trim();
    const receiverName = value("receiverName");
    const receiverCity = value("receiverCity");
    if (!receiverName || !receiverCity) {
      setBookingError("Please add the receiver's name and city so we know where this is going.");
      return;
    }

    const pickup = value("pickup") || new Date().toISOString().slice(0, 10);
    const senderCity = value("senderCity") || "—";
    const senderState = value("senderState");
    const receiverState = value("receiverState");
    const tracking = makeCustomerTrackingNumber(pickup, DB.bookings);
    const booking: Booking = {
      id: `cust-${Date.now()}-${tracking.split("/").pop()}`,
      tracking,
      customer: signedInCustomerName,
      origin: senderCity + (senderState ? `, ${senderState}` : ""),
      destination: receiverCity + (receiverState ? `, ${receiverState}` : ""),
      type: value("type") || "Road",
      status: "Pending",
      pickup,
      weight: value("weight") || "—",
      value: Number(value("value")) || 0,
      notes: value("notes"),
      senderName: value("senderName") || signedInCustomerName,
      senderPhone: value("senderPhone"),
      senderAddress: value("senderAddress"),
      senderCity,
      senderState,
      senderCountry: value("senderCountry") || "Nigeria",
      receiverName,
      receiverPhone: value("receiverPhone"),
      receiverAddress: value("receiverAddress"),
      receiverCity,
      receiverState,
      receiverCountry: value("receiverCountry") || "Nigeria",
    };

    DB.bookings.unshift(booking);
    dispatch({ type: "SET_DB", DB: { ...DB, bookings: [...DB.bookings] } });
    try {
      const saved = JSON.parse(localStorage.getItem("jaad_erp_state_v3") || "null") || {};
      localStorage.setItem("jaad_erp_state_v3", JSON.stringify({
        ...saved,
        savedAt: Date.now(),
        data: { ...(saved.data || {}), bookings: DB.bookings },
      }));
    } catch {
      // Keep the new booking available for this session if storage is unavailable.
    }

    setBookingModalOpen(false);
    setBookingError("");
    setBookingNotice(`Shipment booked: ${tracking}`);
    event.currentTarget.reset();
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
                      <tr id={`invoice-${invoice.no}`} key={invoice.no}>
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
                <input id="track-input" placeholder="e.g. JAAD/2807/2026/00231" style={{ flex: 1 }} value={trackingInput} onChange={(event) => setTrackingInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { setSelectedTrackingNumber(""); setSubmittedTracking(trackingInput.trim()); } }} />
                <button className="btn btn-primary" type="button" onClick={() => { setSelectedTrackingNumber(""); setSubmittedTracking(trackingInput.trim()); }}>Track</button>
              </div>
              <div id="track-result">
                {submittedTracking && trackingMatches.length === 0 && <div className="empty">No shipment matches that tracking number yet, keep typing</div>}
                {!exactTrackingMatch && trackingMatches.length > 1 && !selectedTrackingNumber && <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 12.5, color: "var(--text-dim)", marginBottom: 8 }}>Several of your shipments match. Select one to view its tracking document.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {trackingMatches.map((booking) => <button className="btn" type="button" key={booking.id} aria-pressed={selectedTrackingNumber === booking.tracking} onClick={() => setSelectedTrackingNumber(booking.tracking)}>
                      <span className="mono">{booking.tracking}</span><span>{booking.origin} → {booking.destination}</span>
                    </button>)}
                  </div>
                </div>}
                {trackedBooking && <div className="doc-page-wrap" style={{ marginTop: 16 }}>
                  <ShipmentDocument booking={trackedBooking} events={trackingEvents} invoice={trackingInvoice} />
                </div>}
                {trackedBooking && <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 12 }}>
                  <button className="btn" type="button" onClick={() => downloadShipmentPdf(trackedBooking, trackingEvents)}>Download PDF</button>
                  <button className="btn btn-primary" type="button" onClick={() => setPrintBooking(trackedBooking)}>Print</button>
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
              <button className="btn btn-primary" type="button" onClick={() => { setBookingError(""); setBookingNotice(""); setBookingModalOpen(true); }}>+ Book a shipment</button>
            </div>
            {bookingNotice && <div role="status" style={{ background: "var(--green-dim)", color: "var(--green)", fontSize: 12.4, fontWeight: 700, padding: "10px 14px", borderRadius: 8, marginBottom: 12 }}>{bookingNotice}</div>}
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
      {bookingModalOpen && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setBookingModalOpen(false); }}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="customer-booking-title">
          <form onSubmit={submitCustomerBooking}>
            <div className="modal-head">
              <h3 id="customer-booking-title">Book a shipment</h3>
              <button className="x-btn" type="button" aria-label="Close booking form" onClick={() => setBookingModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-section-title">Sender</div>
              <div className="field-row">
                <div className="field"><label htmlFor="booking-sender-name">Full name</label><input id="booking-sender-name" name="senderName" /></div>
                <div className="field"><label htmlFor="booking-sender-phone">Phone number</label><input id="booking-sender-phone" name="senderPhone" type="tel" /></div>
              </div>
              <div className="field"><label htmlFor="booking-sender-address">Address</label><input id="booking-sender-address" name="senderAddress" /></div>
              <div className="field-row">
                <div className="field"><label htmlFor="booking-sender-city">City</label><input id="booking-sender-city" name="senderCity" /></div>
                <div className="field"><label htmlFor="booking-sender-state">State</label><input id="booking-sender-state" name="senderState" /></div>
                <div className="field"><label htmlFor="booking-sender-country">Country</label><input id="booking-sender-country" name="senderCountry" defaultValue="Nigeria" /></div>
              </div>
              <div className="form-section-title">Receiver</div>
              <div className="field-row">
                <div className="field"><label htmlFor="booking-receiver-name">Full name</label><input id="booking-receiver-name" name="receiverName" /></div>
                <div className="field"><label htmlFor="booking-receiver-phone">Phone number</label><input id="booking-receiver-phone" name="receiverPhone" type="tel" /></div>
              </div>
              <div className="field"><label htmlFor="booking-receiver-address">Address</label><input id="booking-receiver-address" name="receiverAddress" /></div>
              <div className="field-row">
                <div className="field"><label htmlFor="booking-receiver-city">City</label><input id="booking-receiver-city" name="receiverCity" /></div>
                <div className="field"><label htmlFor="booking-receiver-state">State</label><input id="booking-receiver-state" name="receiverState" /></div>
                <div className="field"><label htmlFor="booking-receiver-country">Country</label><input id="booking-receiver-country" name="receiverCountry" defaultValue="Nigeria" /></div>
              </div>
              <div className="form-section-title">Shipment</div>
              <div className="field-row">
                <div className="field"><label htmlFor="booking-type">Mode</label><select id="booking-type" name="type" defaultValue="Road"><option>Road</option><option>Haulage</option><option>Air</option><option>Sea</option></select></div>
                <div className="field"><label htmlFor="booking-pickup">Preferred pickup date</label><input id="booking-pickup" name="pickup" type="date" /></div>
              </div>
              <div className="field-row">
                <div className="field"><label htmlFor="booking-weight">Estimated weight</label><input id="booking-weight" name="weight" placeholder="e.g. 2t" /></div>
                <div className="field"><label htmlFor="booking-value">Declared value (₦)</label><input id="booking-value" name="value" type="number" min="0" step="1" placeholder="0" /></div>
              </div>
              <div className="field"><label htmlFor="booking-notes">Notes (optional)</label><textarea id="booking-notes" name="notes" rows={2} /></div>
              {bookingError && <div className="note" role="alert" style={{ color: "var(--red)" }}>{bookingError}</div>}
            </div>
            <div className="modal-foot">
              <button className="btn" type="button" onClick={() => setBookingModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Submit booking</button>
            </div>
          </form>
        </div>
      </div>}
      {selectedShipment && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelectedShipment(null); }}>
        <div className="modal doc-modal" role="dialog" aria-modal="true" aria-label={`Shipment ${selectedShipment.tracking}`}>
          <div className="modal-head">
            <h3>{selectedShipment.tracking} <span className={`badge ${statusClass(selectedShipment.status)}`}>{selectedShipment.status}</span></h3>
            <button className="x-btn" type="button" aria-label="Close shipment details" onClick={() => setSelectedShipment(null)}>×</button>
          </div>
          <div className="modal-body">
            <ShipmentDocument booking={selectedShipment} events={selectedShipmentEvents} invoice={selectedShipmentInvoice} />
          </div>
          <div className="modal-foot">
            {!selectedShipmentInvoice && <button className="btn" type="button" onClick={() => issueShipmentInvoice(selectedShipment)}>Issue invoice</button>}
            <button className="btn" type="button" onClick={() => setSelectedShipment(null)}>Close</button>
            <button className="btn" type="button" onClick={() => downloadShipmentPdf(selectedShipment, selectedShipmentEvents)}>Download PDF</button>
            <button className="btn btn-primary" type="button" onClick={() => setPrintBooking(selectedShipment)}>Print</button>
          </div>
        </div>
      </div>}
      {printBooking && <div id="print-area" aria-hidden="true"><ShipmentDocument booking={printBooking} events={DB.trackingEvents[printBooking.id] || []} invoice={DB.invoices.find((invoice) => invoice.customer === customerName && invoice.linkedShipment === printBooking.tracking)} /></div>}
    </div>
  );
}