"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { authStorageKey, useAppDispatch, useAppState } from "@/context/AppContext";
import { dashboardDB, invoiceSubtotal, invoiceVat } from "@/lib/dashboard";
import type { Booking, Customer, Invoice, SupportChat } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/client";
import { isSimulationMode } from "@/lib/supabase/mode";

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

function evaluateCalculatorExpression(expression: string) {
  const tokens = expression.match(/(?:\d+\.?\d*|\.\d+|[()+\-*/])/g) || [];
  if (!tokens.length || tokens.join("") !== expression.replace(/\s/g, "")) throw new Error("Invalid expression");
  let position = 0;

  function parseFactor(): number {
    const token = tokens[position];
    if (token === "+" || token === "-") {
      position += 1;
      const value = parseFactor();
      return token === "-" ? -value : value;
    }
    if (token === "(") {
      position += 1;
      const value = parseExpression();
      if (tokens[position] !== ")") throw new Error("Missing closing parenthesis");
      position += 1;
      return value;
    }
    if (token && /^(?:\d+\.?\d*|\.\d+)$/.test(token)) {
      position += 1;
      return Number(token);
    }
    throw new Error("Invalid expression");
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position++];
      const next = parseFactor();
      value = operator === "*" ? value * next : value / next;
    }
    return value;
  }

  function parseExpression(): number {
    let value = parseTerm();
    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position++];
      const next = parseTerm();
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  }

  const result = parseExpression();
  if (position !== tokens.length || !Number.isFinite(result)) throw new Error("Invalid expression");
  return result;
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

function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const paid = invoice.status === "Paid";
  const signedLine = paid ? `Signed electronically, ${formatDate(invoice.paidDate || invoice.date)}` : "Received by";
  return <div className="doc" style={{ position: "relative" }}>
    <div className="doc-head">
      <div><Image src="/legacy-assets/embedded_asset_1.png" width={305} height={201} alt="JAAD Logistics" style={{ height: 30, width: "auto" }} /></div>
      <div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div>
    </div>
    <h2>Invoice {invoice.no}</h2>
    <div className="doc-grid">
      <div><div className="lbl">Billed to</div>{invoice.customer}</div>
      <div style={{ textAlign: "right" }}><div className="lbl">Date</div>{formatDate(invoice.date)}<br /><div className="lbl" style={{ marginTop: 8 }}>Status</div>{invoice.status}</div>
    </div>
    <table>
      <thead><tr><th>Description</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
      <tbody>
        {invoice.items.map((item, index) => <tr key={`${item.desc}-${index}`}><td>{item.desc}</td><td style={{ textAlign: "right" }}>{formatNaira(item.amount)}</td></tr>)}
        <tr><td style={{ textAlign: "right" }}>Subtotal</td><td style={{ textAlign: "right" }}>{formatNaira(invoiceSubtotal(invoice.amount))}</td></tr>
        <tr><td style={{ textAlign: "right" }}>VAT, 7.5%</td><td style={{ textAlign: "right" }}>{formatNaira(invoiceVat(invoice.amount))}</td></tr>
        <tr className="doc-total-row"><td>Total</td><td style={{ textAlign: "right" }}>{formatNaira(invoice.amount)}</td></tr>
      </tbody>
    </table>
    <div className="doc-sign"><div className="line">Prepared by</div><div className="line">{signedLine}</div></div>
    {paid && <div className="paid-stamp">PAID</div>}
  </div>;
}

function downloadInvoicePdf(invoice: Invoice) {
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = 56;
  document.setFontSize(16);
  document.text("JAAD Logistics Ltd", margin, y);
  y += 24;
  document.setFontSize(13);
  document.text(`Invoice ${invoice.no}`, margin, y);
  y += 26;

  const addRow = (label: string, amount: string) => {
    const descriptionLines = document.splitTextToSize(label, 330) as string[];
    const amountLines = document.splitTextToSize(amount, 140) as string[];
    const rowHeight = Math.max(descriptionLines.length, amountLines.length) * 14;
    if (y + rowHeight > 770) {
      document.addPage();
      y = 48;
    }
    document.setFontSize(10);
    document.setTextColor(30);
    document.text(descriptionLines, margin, y);
    document.text(amountLines, 547, y, { align: "right" });
    y += rowHeight + 8;
  };

  addRow("Billed to", invoice.customer);
  addRow("Date", formatDate(invoice.date));
  addRow("Status", invoice.status);
  y += 8;
  invoice.items.forEach((item) => addRow(item.desc, formatNaira(item.amount)));
  y += 4;
  addRow("Subtotal", formatNaira(invoiceSubtotal(invoice.amount)));
  addRow("VAT, 7.5%", formatNaira(invoiceVat(invoice.amount)));
  addRow("Total", formatNaira(invoice.amount));
  if (invoice.status === "Paid") addRow("Payment", `PAID · Signed electronically ${formatDate(invoice.paidDate || invoice.date)}`);
  else addRow("Received by", "____________________________");
  document.save(`${invoice.no}.pdf`);
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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Booking | null>(null);
  const [printDocument, setPrintDocument] = useState<{ type: "shipment"; booking: Booking } | { type: "invoice"; invoice: Invoice } | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingNotice, setBookingNotice] = useState("");
  const [profileFeedback, setProfileFeedback] = useState("");
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorExpression, setCalculatorExpression] = useState("");
  const [actualWeight, setActualWeight] = useState("0");
  const [packageLength, setPackageLength] = useState("0");
  const [packageWidth, setPackageWidth] = useState("0");
  const [packageHeight, setPackageHeight] = useState("0");
  const [volumetricDivisor, setVolumetricDivisor] = useState("6000");
  const [chargeableWeight, setChargeableWeight] = useState("");
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

  const loadCustomerData = useCallback(async () => {
    if (!currentUser?.id || isSimulationMode()) return;
    const userId = currentUser.id;
    try {
      const supabase = createClient();
      const { data: customerRow, error: customerError } = await supabase.from("customers").select("id, name, type, contact, credit_limit, balance, status, client_since, email, phone, address, linkedin").eq("user_id", userId).maybeSingle();
      if (customerError) throw customerError;
      if (!customerRow) throw new Error("Customer profile is not available for this account");
      const [bookingResult, invoiceResult, chatResult] = await Promise.all([
        supabase.from("bookings").select("id, tracking_no, customer_name, origin, destination, type, status, pickup_date, weight, declared_value, notes, sender_name, sender_phone, sender_address, sender_city, sender_state, sender_country, receiver_name, receiver_phone, receiver_address, receiver_city, receiver_state, receiver_country").eq("user_id", userId).order("pickup_date", { ascending: false }),
        supabase.from("invoices").select("id, invoice_no, customer_name, amount, status, invoice_date, linked_booking_id, posted").eq("customer_id", customerRow.id).order("invoice_date", { ascending: false }),
        supabase.from("live_chats").select("id, status, created_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (bookingResult.error || invoiceResult.error || chatResult.error) throw bookingResult.error || invoiceResult.error || chatResult.error;
      const bookingRows = bookingResult.data || [];
      const invoiceRows = invoiceResult.data || [];
      const bookingIds = bookingRows.map((booking) => booking.id);
      const invoiceIds = invoiceRows.map((invoice) => invoice.id);
      const [eventResult, itemResult, messageResult] = await Promise.all([
        bookingIds.length ? supabase.from("tracking_events").select("booking_id, event_time, description").in("booking_id", bookingIds).order("event_time") : Promise.resolve({ data: [], error: null }),
        invoiceIds.length ? supabase.from("invoice_items").select("invoice_id, description, amount").in("invoice_id", invoiceIds) : Promise.resolve({ data: [], error: null }),
        chatResult.data ? supabase.from("live_chat_messages").select("sender, message, attachment_url, created_at").eq("chat_id", chatResult.data.id).order("created_at") : Promise.resolve({ data: [], error: null }),
      ]);
      if (eventResult.error || itemResult.error || messageResult.error) throw eventResult.error || itemResult.error || messageResult.error;
      const customer: Customer = {
        id: customerRow.id,
        name: customerRow.name,
        type: customerRow.type,
        contact: customerRow.contact || `${customerRow.name}, ${customerRow.phone || ""}`,
        credit: Number(customerRow.credit_limit) || 0,
        balance: Number(customerRow.balance) || 0,
        since: customerRow.client_since || "",
        status: customerRow.status,
        email: customerRow.email || "",
        address: customerRow.address || "",
        linkedin: customerRow.linkedin || "",
        profile: { firstName: customerRow.name.split(" ")[0] || "", lastName: customerRow.name.split(" ").slice(1).join(" "), companyName: customerRow.name, phone: customerRow.phone || "", email: customerRow.email || "", companyAddress: customerRow.address || "", linkedin: customerRow.linkedin || "" },
      };
      const bookings: Booking[] = bookingRows.map((row) => ({ id: row.id, tracking: row.tracking_no, customer: row.customer_name, origin: row.origin, destination: row.destination, type: row.type, status: row.status, pickup: row.pickup_date, weight: row.weight || "—", value: Number(row.declared_value) || 0, notes: row.notes || "", senderName: row.sender_name || "", senderPhone: row.sender_phone || "", senderAddress: row.sender_address || "", senderCity: row.sender_city || "", senderState: row.sender_state || "", senderCountry: row.sender_country || "", receiverName: row.receiver_name || "", receiverPhone: row.receiver_phone || "", receiverAddress: row.receiver_address || "", receiverCity: row.receiver_city || "", receiverState: row.receiver_state || "", receiverCountry: row.receiver_country || "" }));
      const invoices: Invoice[] = invoiceRows.map((row) => ({ no: row.invoice_no, customer: row.customer_name, amount: Number(row.amount) || 0, status: row.status, date: row.invoice_date, linkedShipment: bookingRows.find((booking) => booking.id === row.linked_booking_id)?.tracking_no || null, posted: row.posted, items: (itemResult.data || []).filter((item) => item.invoice_id === row.id).map((item) => ({ desc: item.description, amount: Number(item.amount) || 0 })) }));
      const trackingEvents = Object.fromEntries(bookingIds.map((id) => [id, (eventResult.data || []).filter((event) => event.booking_id === id).map((event) => [new Date(event.event_time).toLocaleString("en-GB"), event.description])]));
      const chat = chatResult.data ? { id: chatResult.data.id, visitor: customer.name, status: chatResult.data.status, ticketId: null, messages: (messageResult.data || []).map((message) => ({ from: message.sender === "customer" ? "visitor" : message.sender, text: message.message || "", img: message.attachment_url || undefined, time: new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })) } satisfies SupportChat : null;
      dashboardDB.customers.splice(0, dashboardDB.customers.length, customer);
      dashboardDB.bookings.splice(0, dashboardDB.bookings.length, ...bookings);
      dashboardDB.invoices.splice(0, dashboardDB.invoices.length, ...invoices);
      dashboardDB.trackingEvents = trackingEvents;
      if (chat) dashboardDB.chats.splice(0, dashboardDB.chats.length, chat);
      dispatch({ type: "SET_DB", DB: { ...dashboardDB } });
      setSupportChat(chat);
    } catch (error) {
      setBookingNotice(error instanceof Error ? error.message : "Could not load customer account");
    }
  }, [currentUser, dispatch]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!authReady || currentUser?.type !== "customer" || isSimulationMode()) return;
    queueMicrotask(() => { void loadCustomerData(); });
  }, [authReady, currentUser, loadCustomerData]);

  useEffect(() => {
    if (!printDocument) return;
    const clearPrintDocument = () => setPrintDocument(null);
    window.addEventListener("afterprint", clearPrintDocument, { once: true });
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", clearPrintDocument);
    };
  }, [printDocument]);

  useEffect(() => {
    if (!isSimulationMode()) return;
    try {
      const saved = JSON.parse(localStorage.getItem("jaad_erp_state_v3") || "null");
      const savedBookings = saved?.data?.bookings as Booking[] | undefined;
      const savedCustomers = saved?.data?.customers as Customer[] | undefined;
      const savedInvoices = saved?.data?.invoices as Invoice[] | undefined;
      const hasSavedCustomers = Array.isArray(savedCustomers) && JSON.stringify(savedCustomers) !== JSON.stringify(DB.customers);
      const hasSavedBookings = Array.isArray(savedBookings) && JSON.stringify(savedBookings) !== JSON.stringify(DB.bookings);
      const hasSavedInvoices = Array.isArray(savedInvoices) && JSON.stringify(savedInvoices) !== JSON.stringify(DB.invoices);
      if (!hasSavedCustomers && !hasSavedBookings && !hasSavedInvoices) return;

      if (hasSavedCustomers) dashboardDB.customers.splice(0, dashboardDB.customers.length, ...savedCustomers);
      if (hasSavedBookings) dashboardDB.bookings.splice(0, dashboardDB.bookings.length, ...savedBookings);
      if (hasSavedInvoices) dashboardDB.invoices.splice(0, dashboardDB.invoices.length, ...savedInvoices);
      dispatch({ type: "SET_DB", DB: {
        ...DB,
        customers: hasSavedCustomers ? savedCustomers : DB.customers,
        bookings: hasSavedBookings ? savedBookings : DB.bookings,
        invoices: hasSavedInvoices ? savedInvoices : DB.invoices,
      } });
    } catch {
      // Keep the built-in sample data available if stored bookings cannot be read.
    }
  }, [DB, dispatch]);

  useEffect(() => {
    if (!authReady || currentUser?.type !== "customer" || view !== "support" || !isSimulationMode()) return;

    const syncSupportChat = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("jaad_erp_state_v3") || "null");
        const savedChats = saved?.data?.chats as SupportChat[] | undefined;
        const latestChat = savedChats?.find((chat) => chat.visitor === customerName);
        if (!latestChat) return;

        setSupportChat((current) => JSON.stringify(current) === JSON.stringify(latestChat) ? current : latestChat);
        const currentChat = dashboardDB.chats.find((chat) => chat.visitor === customerName);
        if (JSON.stringify(currentChat) === JSON.stringify(latestChat)) return;
        const nextChats = [...dashboardDB.chats.filter((chat) => chat.visitor !== customerName), latestChat];
        dashboardDB.chats.splice(0, dashboardDB.chats.length, ...nextChats);
        dispatch({ type: "SET_DB", DB: { ...dashboardDB, chats: nextChats } });
      } catch {
        // Ignore incomplete cross-tab writes and retry on the next poll.
      }
    };

    syncSupportChat();
    const interval = window.setInterval(syncSupportChat, 2500);
    window.addEventListener("storage", syncSupportChat);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", syncSupportChat);
    };
  }, [authReady, currentUser?.type, customerName, dispatch, view]);

  useEffect(() => {
    if (authReady && currentUser?.type !== "customer") {
      router.replace(currentUser?.type === "admin" ? "/admin/dashboard" : "/");
    }
  }, [authReady, currentUser, router]);

  if (!authReady || currentUser?.type !== "customer") return null;

  const signedInCustomerName = customerName;
  const customerRecord = DB.customers.find((customer) => customer.name === signedInCustomerName);
  const profileContactParts = (customerRecord?.contact.split(",")[0] || "").trim().split(/\s+/).filter(Boolean);
  const profilePhone = customerRecord?.contact.match(/(?:\+?\d[\d\s-]{6,})/)?.[0].trim() || "";
  const customerProfile = customerRecord?.profile || {
    firstName: profileContactParts[0] || "",
    lastName: profileContactParts.slice(1).join(" "),
    companyName: customerRecord?.name || signedInCustomerName,
    phone: profilePhone,
    email: customerRecord?.email || "",
    companyAddress: customerRecord?.address || "",
    linkedin: customerRecord?.linkedin || "",
  };
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
  const pressCalculatorKey = (key: string) => {
    if (key === "C") {
      setCalculatorExpression("");
      return;
    }
    if (key === "=") {
      setCalculatorExpression((current) => {
        try {
          return String(evaluateCalculatorExpression(current));
        } catch {
          return "Error";
        }
      });
      return;
    }
    setCalculatorExpression((current) => `${current === "Error" ? "" : current}${key}`);
  };

  const calculateChargeableWeight = () => {
    const actual = Number(actualWeight) || 0;
    const volume = ((Number(packageLength) || 0) * (Number(packageWidth) || 0) * (Number(packageHeight) || 0)) / (Number(volumetricDivisor) || 6000);
    setChargeableWeight(`Volumetric weight: ${volume.toFixed(2)} kg · Chargeable weight: ${Math.max(actual, volume).toFixed(2)} kg`);
  };

  const logout = async () => {
    if (!isSimulationMode()) {
      try { await createClient().auth.signOut(); } catch { /* Clear local app state even if sign-out cannot reach the auth service. */ }
    }
    sessionStorage.removeItem(authStorageKey);
    dispatch({ type: "SET_CURRENT_USER", user: null });
    router.replace("/");
  };

  const saveCustomerProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customerRecord) return;

    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || "").trim();
    const firstName = value("firstName");
    const lastName = value("lastName");
    const companyName = value("companyName");
    if (!firstName || !lastName || !companyName) {
      setProfileFeedback("First name, last name, and company name are required.");
      return;
    }

    const oldName = customerRecord.name;
    const profile = {
      firstName,
      lastName,
      companyName,
      phone: value("phone"),
      email: value("email"),
      companyAddress: value("companyAddress"),
      linkedin: value("linkedin"),
    };
    const renameCompany = companyName !== oldName;
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const { error } = await supabase.from("customers").update({ name: companyName, contact: `${firstName} ${lastName}, ${profile.phone}`.replace(/, $/, ""), email: profile.email, phone: profile.phone, address: profile.companyAddress, linkedin: profile.linkedin }).eq("user_id", currentUser?.id);
          if (error) throw error;
          const updatedCustomer = { ...customerRecord, name: companyName, profile, email: profile.email, address: profile.companyAddress, linkedin: profile.linkedin, contact: `${firstName} ${lastName}, ${profile.phone}`.replace(/, $/, "") };
          dashboardDB.customers.splice(0, dashboardDB.customers.length, updatedCustomer);
          if (renameCompany && currentUser) dispatch({ type: "SET_CURRENT_USER", user: { ...currentUser, name: companyName } });
          dispatch({ type: "SET_DB", DB: { ...DB, customers: dashboardDB.customers } });
          setProfileFeedback("Profile updated in your account.");
        } catch (error) { setProfileFeedback(error instanceof Error ? error.message : "Could not update your profile"); }
      })();
      return;
    }
    const nextCustomers = DB.customers.map((customer) => customer.name === oldName ? {
      ...customer,
      name: companyName,
      profile,
      email: profile.email,
      address: profile.companyAddress,
      linkedin: profile.linkedin,
      contact: `${firstName} ${lastName}, ${profile.phone}`.replace(/, $/, ""),
    } : customer);
    const nextBookings = DB.bookings.map((booking) => renameCompany && booking.customer === oldName ? { ...booking, customer: companyName } : booking);
    const nextInvoices = DB.invoices.map((invoice) => renameCompany && invoice.customer === oldName ? { ...invoice, customer: companyName } : invoice);
    if (renameCompany) {
      const updatedUser = { ...currentUser, name: companyName };
      sessionStorage.setItem(authStorageKey, JSON.stringify(updatedUser));
      dispatch({ type: "SET_CURRENT_USER", user: updatedUser });
    }

    dashboardDB.customers.splice(0, dashboardDB.customers.length, ...nextCustomers);
    dashboardDB.bookings.splice(0, dashboardDB.bookings.length, ...nextBookings);
    dashboardDB.invoices.splice(0, dashboardDB.invoices.length, ...nextInvoices);
    dispatch({ type: "SET_DB", DB: { ...DB, customers: nextCustomers, bookings: nextBookings, invoices: nextInvoices } });
    try {
      const saved = JSON.parse(localStorage.getItem("jaad_erp_state_v3") || "null") || {};
      localStorage.setItem("jaad_erp_state_v3", JSON.stringify({
        ...saved,
        savedAt: Date.now(),
        data: { ...(saved.data || {}), customers: nextCustomers, bookings: nextBookings, invoices: nextInvoices },
      }));
    } catch {
      // Keep the updated profile in shared app state if storage is unavailable.
    }
    setProfileFeedback("Profile updated in your account and JAAD ERP.");
  };

  const issueShipmentInvoice = (booking: Booking) => {
    if (DB.invoices.some((invoice) => invoice.linkedShipment === booking.tracking)) return;
    if (!isSimulationMode()) { setBookingNotice("Invoices are issued by the JAAD finance team."); return; }
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
    const formElement = event.currentTarget;
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

    if (!isSimulationMode()) {
      if (!customerRecord?.id || !currentUser?.id) { setBookingError("Your customer profile is still loading. Please try again shortly."); return; }
      const customerUserId = currentUser.id;
      void (async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase.from("bookings").insert({
            user_id: customerUserId,
            customer_id: customerRecord.id,
            customer_name: signedInCustomerName,
            origin: booking.origin,
            destination: booking.destination,
            type: booking.type,
            status: "Pending",
            pickup_date: pickup,
            weight: booking.weight,
            declared_value: booking.value,
            notes: booking.notes,
            sender_name: booking.senderName,
            sender_phone: booking.senderPhone,
            sender_address: booking.senderAddress,
            sender_city: booking.senderCity,
            sender_state: booking.senderState,
            sender_country: booking.senderCountry,
            receiver_name: booking.receiverName,
            receiver_phone: booking.receiverPhone,
            receiver_address: booking.receiverAddress,
            receiver_city: booking.receiverCity,
            receiver_state: booking.receiverState,
            receiver_country: booking.receiverCountry,
          }).select("id, tracking_no").single();
          if (error) throw error;
          const savedBooking = { ...booking, id: data.id, tracking: data.tracking_no };
          dashboardDB.bookings.unshift(savedBooking);
          dispatch({ type: "SET_DB", DB: { ...DB, bookings: [...dashboardDB.bookings] } });
          setBookingModalOpen(false);
          setBookingError("");
          setBookingNotice(`Shipment booked: ${savedBooking.tracking}`);
          formElement.reset();
        } catch (error) { setBookingError(error instanceof Error ? error.message : "Could not create your shipment booking"); }
      })();
      return;
    }

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
    formElement.reset();
  };

  const sendCustomerMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const text = String(form.get("message") || "").trim();
    if (!text) return;

    const now = new Date();
    const message = {
      from: "visitor",
      text,
      time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    };
    if (!isSimulationMode()) {
      if (!currentUser?.id) { setBookingNotice("Your session has expired. Please sign in again."); return; }
      const customerUserId = currentUser.id;
      void (async () => {
        try {
          const supabase = createClient();
          let chatId = supportChat?.id;
          if (!chatId) {
            const { data, error } = await supabase.from("live_chats").insert({ user_id: customerUserId, customer_name: signedInCustomerName, customer_email: currentUser.email, status: "Open" }).select("id").single();
            if (error) throw error;
            chatId = data.id;
          } else {
            const { error } = await supabase.from("live_chats").update({ status: "Open" }).eq("id", chatId);
            if (error) throw error;
          }
          if (!chatId) throw new Error("Could not initialize the support conversation");
          const { error } = await supabase.from("live_chat_messages").insert({ chat_id: chatId, sender: "customer", message: text });
          if (error) throw error;
          const nextChat: SupportChat = supportChat ? { ...supportChat, status: "Open", messages: [...supportChat.messages, message] } : { id: chatId, visitor: signedInCustomerName, status: "Open", ticketId: null, messages: [message] };
          setSupportChat(nextChat);
          dashboardDB.chats.splice(0, dashboardDB.chats.length, nextChat);
          dispatch({ type: "SET_DB", DB: { ...DB, chats: dashboardDB.chats } });
          formElement.reset();
        } catch (error) { setBookingNotice(error instanceof Error ? error.message : "Could not send support message"); }
      })();
      return;
    }
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
    const storedNotifications = storedState.data?.notifications;
    const notifications = Array.isArray(storedNotifications) ? storedNotifications : DB.notifications;
    const nextNotifications = [{ t: `New message from ${signedInCustomerName} in Support`, time: "just now" }, ...notifications];
    dashboardDB.chats.splice(0, dashboardDB.chats.length, ...nextChats);
    dashboardDB.notifications.splice(0, dashboardDB.notifications.length, ...nextNotifications);
    const nextDB = { ...DB, chats: nextChats, notifications: nextNotifications };
    dispatch({ type: "SET_DB", DB: nextDB });
    setSupportChat(nextChat);
    try {
      localStorage.setItem("jaad_erp_state_v3", JSON.stringify({
        ...storedState,
        savedAt: Date.now(),
        data: { ...(storedState.data || {}), chats: nextChats, notifications: nextNotifications },
      }));
    } catch {
      // Keep the in-memory thread available for this session if storage is unavailable.
    }
    formElement.reset();
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
          <button className="nav-item" type="button" onClick={() => { setCalculatorOpen(true); setSidebarOpen(false); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01" />
            </svg>
            <span>Calculator</span>
          </button>
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
            <button className="icon-btn" type="button" title="Calculator" aria-label="Open calculator" onClick={() => setCalculatorOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="3" width="14" height="18" rx="2" />
                <path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01" />
              </svg>
            </button>
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
            <div className="view-head"><div><h1>Profile</h1><p>Your account information is synced with JAAD ERP Customer Management.</p></div></div>
            <div className="card">
              <form onSubmit={saveCustomerProfile}>
                <div className="grid g-2">
                  <div className="field"><label htmlFor="customer-profile-first">First Name</label><input id="customer-profile-first" name="firstName" defaultValue={customerProfile.firstName} required /></div>
                  <div className="field"><label htmlFor="customer-profile-last">Last Name</label><input id="customer-profile-last" name="lastName" defaultValue={customerProfile.lastName} required /></div>
                  <div className="field"><label htmlFor="customer-profile-company">Company Name</label><input id="customer-profile-company" name="companyName" defaultValue={customerProfile.companyName} required /></div>
                  <div className="field"><label htmlFor="customer-profile-phone">Phone Number</label><input id="customer-profile-phone" name="phone" type="tel" defaultValue={customerProfile.phone} /></div>
                  <div className="field"><label htmlFor="customer-profile-email">Email</label><input id="customer-profile-email" name="email" type="email" defaultValue={customerProfile.email} /></div>
                  <div className="field"><label htmlFor="customer-profile-linkedin">LinkedIn</label><input id="customer-profile-linkedin" name="linkedin" type="url" placeholder="https://linkedin.com/in/..." defaultValue={customerProfile.linkedin} /></div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="customer-profile-address">Company Address</label><textarea id="customer-profile-address" name="companyAddress" rows={3} defaultValue={customerProfile.companyAddress} /></div>
                </div>
                {profileFeedback && <div role="status" style={{ margin: "6px 0 12px", color: profileFeedback.startsWith("Profile updated") ? "var(--green)" : "var(--red)", fontSize: 12.5, fontWeight: 600 }}>{profileFeedback}</div>}
                <button className="btn btn-primary" type="submit">Save changes</button>
              </form>
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
                        <td><button className="mono link-cell" type="button" style={{ background: "none", border: 0, padding: 0 }} onClick={() => setSelectedInvoice(invoice)}>{invoice.no}</button></td>
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
                  <button className="btn btn-primary" type="button" onClick={() => setPrintDocument({ type: "shipment", booking: trackedBooking })}>Print</button>
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
            <button className="btn btn-primary" type="button" onClick={() => setPrintDocument({ type: "shipment", booking: selectedShipment })}>Print</button>
          </div>
        </div>
      </div>}
      {selectedInvoice && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelectedInvoice(null); }}>
        <div className="modal doc-modal" role="dialog" aria-modal="true" aria-label={`Invoice ${selectedInvoice.no}`}>
          <div className="modal-head">
            <h3>{selectedInvoice.no}{selectedInvoice.posted === false && <> <span className="badge b-amber">Draft</span></>}</h3>
            <button className="x-btn" type="button" aria-label="Close invoice details" onClick={() => setSelectedInvoice(null)}>×</button>
          </div>
          <div className="modal-body"><InvoiceDocument invoice={selectedInvoice} /></div>
          <div className="modal-foot">
            <button className="btn" type="button" onClick={() => setSelectedInvoice(null)}>Close</button>
            <button className="btn" type="button" onClick={() => downloadInvoicePdf(selectedInvoice)}>Download PDF</button>
            <button className="btn btn-primary" type="button" onClick={() => setPrintDocument({ type: "invoice", invoice: selectedInvoice })}>Print</button>
          </div>
        </div>
      </div>}
      {printDocument && <div id="print-area" aria-hidden="true">{printDocument.type === "invoice"
        ? <InvoiceDocument invoice={printDocument.invoice} />
        : <ShipmentDocument booking={printDocument.booking} events={DB.trackingEvents[printDocument.booking.id] || []} invoice={DB.invoices.find((invoice) => invoice.customer === customerName && invoice.linkedShipment === printDocument.booking.tracking)} />}</div>}
      {calculatorOpen && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setCalculatorOpen(false); }}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="customer-calculator-title">
          <div className="modal-head">
            <h3 id="customer-calculator-title">Calculator</h3>
            <button className="x-btn" type="button" aria-label="Close calculator" onClick={() => setCalculatorOpen(false)}>×</button>
          </div>
          <div className="modal-body">
            <output aria-label="Calculator display" style={{ display: "block", background: "var(--sidebar-bg)", color: "#fff", fontSize: 24, textAlign: "right", padding: 14, borderRadius: 8, marginBottom: 10, overflowX: "auto", minHeight: 56 }}>{calculatorExpression || "0"}</output>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
              {["C", "(", ")", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "="].map((key) => <button className={`btn${key === "=" ? " btn-primary" : ""}`} style={{ justifyContent: "center", padding: "12px 0" }} type="button" key={key} aria-label={key === "*" ? "Multiply" : key === "/" ? "Divide" : key === "=" ? "Calculate" : key === "C" ? "Clear" : key} onClick={() => pressCalculatorKey(key)}>{key === "*" ? "×" : key === "/" ? "÷" : key}</button>)}
            </div>
            <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <div className="card-title">Chargeable weight calculator<small>Calculate actual versus volumetric weight.</small></div>
              <div className="grid g-3" style={{ marginTop: 12 }}>
                <div className="field"><label htmlFor="calc-actual-weight">Actual weight (kg)</label><input id="calc-actual-weight" type="number" min="0" step="any" value={actualWeight} onChange={(event) => setActualWeight(event.target.value)} /></div>
                <div className="field"><label htmlFor="calc-length">Length (cm)</label><input id="calc-length" type="number" min="0" step="any" value={packageLength} onChange={(event) => setPackageLength(event.target.value)} /></div>
                <div className="field"><label htmlFor="calc-width">Width (cm)</label><input id="calc-width" type="number" min="0" step="any" value={packageWidth} onChange={(event) => setPackageWidth(event.target.value)} /></div>
                <div className="field"><label htmlFor="calc-height">Height (cm)</label><input id="calc-height" type="number" min="0" step="any" value={packageHeight} onChange={(event) => setPackageHeight(event.target.value)} /></div>
                <div className="field"><label htmlFor="calc-divisor">Volumetric divisor</label><select id="calc-divisor" value={volumetricDivisor} onChange={(event) => setVolumetricDivisor(event.target.value)}><option value="5000">5000</option><option value="6000">6000</option></select></div>
              </div>
              <button className="btn btn-primary" type="button" onClick={calculateChargeableWeight}>Calculate weight</button>
              {chargeableWeight && <div role="status" style={{ marginTop: 10, fontWeight: 700 }}>{chargeableWeight}</div>}
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}