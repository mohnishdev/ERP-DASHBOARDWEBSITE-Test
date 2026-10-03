"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppState, useNavigate } from "@/context/AppContext";
type CountMap = Record<string, number>;
import {
  computeFinance,
  dashboardDB,
  driverCounts,
  fleetColors,
  fleetCounts,
  fmtNaira,
  invoiceStatusCounts,
  leadPriorityCounts,
  shipmentColors,
  shipmentCounts,
  ticketStatusCounts,
} from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/client";
import { isSimulationMode } from "@/lib/supabase/mode";

function StatusBadge({ status }: { status: string }) {
  const color = status === "Delivered" ? "var(--green)" : status === "In Transit" ? "var(--amber)" : status === "Exception" ? "var(--red-text)" : "var(--text-dim)";
  return <span className="badge" style={{ background: `${status === "Delivered" ? "var(--green-dim)" : status === "In Transit" ? "var(--amber-dim)" : status === "Exception" ? "var(--red-dim)" : "var(--gray-dim)"}`, color }}><span className="dot" />{status}</span>;
}

function Donut({ segments, size = 172 }: { segments: { value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const radius = size * 0.386;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>{segments.map((segment, index) => {
    const dash = segment.value / total * circumference;
    const circle = <circle key={index} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={segment.color} strokeWidth={size * 0.136} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
    // eslint-disable-next-line react-hooks/immutability -- running offset accumulator, local to this render
    offset += dash;
    return circle;
  })}</svg>;
}

function BreakdownPanel({ title, counts, colors }: { title: string; counts: CountMap; colors: string[] }) {
  const entries = Object.entries(counts);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  return <div className="card">
    <div className="card-title" style={{ marginBottom: 16 }}>{title}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
      <div style={{ position: "relative", flexShrink: 0 }}><Donut segments={entries.map(([, value], index) => ({ value, color: colors[index % colors.length] }))} /><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}><b style={{ fontSize: 30 }}>{total}</b><span style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase" }}>total</span></div></div>
      <div style={{ flex: 1, minWidth: 160 }}>{total ? entries.map(([label, value], index) => <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, fontSize: 12 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: colors[index % colors.length], display: "inline-block", flexShrink: 0 }} /><span style={{ flex: 1 }}>{label}</span><b>{value} ({Math.round(value / total * 100)}%)</b></div>) : <div style={{ color: "var(--text-faint)", fontSize: 12 }}>No data yet.</div>}</div>
    </div>
    <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 8, fontSize: 11.5, color: "var(--text-dim)" }}>Total: <b>{total}</b></div>
  </div>;
}

export function Dashboard() {
  const [tab, setTab] = useState<"overview" | "breakdown">("overview");
  const [, setDataRevision] = useState(0);
  const [dataNotice, setDataNotice] = useState("");
  const [dismissedAlerts, setDismissedAlerts] = useState(dashboardDB.dismissedAlerts);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentUser } = useAppState();

  useEffect(() => {
    if (isSimulationMode()) return;
    queueMicrotask(() => {
      void (async () => {
        try {
          const modules = currentUser?.modules;
          const allowed = (module: string) => modules === "all" || Boolean(modules?.includes(module));
          const supabase = createClient();
          const bookingResult = allowed("shipments") ? await supabase.from("bookings").select("id, tracking_no, customer_name, origin, destination, type, status, pickup_date, weight, declared_value, notes").order("pickup_date", { ascending: false }) : { data: [], error: null };
          const fleetResult = allowed("fleet") ? await supabase.from("fleet_vehicles").select("plate, type, status, next_service_date, fuel_liters, insurer").order("plate") : { data: [], error: null };
          const driverResult = allowed("drivers") ? await supabase.from("drivers").select("name, license_no, license_expiry, trips_completed, rating, status").order("name") : { data: [], error: null };
          const invoiceResult = allowed("finance") ? await supabase.from("invoices").select("invoice_no, customer_name, amount, status, invoice_date, posted").order("invoice_date", { ascending: false }) : { data: [], error: null };
          const expenseResult = allowed("finance") ? await supabase.from("expenses").select("category, vendor, amount, expense_date, status").order("expense_date", { ascending: false }) : { data: [], error: null };
          const payrollResult = allowed("finance") ? await supabase.from("payroll_entries").select("employee_name, role_title, gross, deductions") : { data: [], error: null };
          const leadResult = allowed("crm") ? await supabase.from("leads").select("id, company, contact_name, job_title, email, phone, source, industry, priority, status, follow_up_date, transport_mode, cargo_type, origin, destination, frequency, volume_weight, current_provider, requirements, value, linked_customer_id").order("created_at", { ascending: false }) : { data: [], error: null };
          const ticketResult = allowed("support") ? await supabase.from("tickets").select("ticket_no, customer_name, subject, priority, status, channel, opened_at, closed_at").order("opened_at", { ascending: false }) : { data: [], error: null };
          const announcementResult = await supabase.from("announcements").select("id, title, body").order("created_at", { ascending: false });
          const error = bookingResult.error || fleetResult.error || driverResult.error || invoiceResult.error || expenseResult.error || payrollResult.error || leadResult.error || ticketResult.error || announcementResult.error;
          if (error) throw error;
          if (allowed("shipments")) dashboardDB.bookings.splice(0, dashboardDB.bookings.length, ...(bookingResult.data || []).map((row) => ({ id: row.id, tracking: row.tracking_no, customer: row.customer_name, origin: row.origin, destination: row.destination, type: row.type, status: row.status, pickup: row.pickup_date, weight: row.weight || "", value: Number(row.declared_value) || 0, notes: row.notes || "" })));
          else dashboardDB.bookings.splice(0, dashboardDB.bookings.length);
          if (allowed("fleet")) dashboardDB.fleet.splice(0, dashboardDB.fleet.length, ...(fleetResult.data || []).map((row) => ({ plate: row.plate, type: row.type, status: row.status, driver: "Unassigned", service: row.next_service_date || "", fuelL: Number(row.fuel_liters) || 0, insurer: row.insurer || "" })));
          else dashboardDB.fleet.splice(0, dashboardDB.fleet.length);
          if (allowed("drivers")) dashboardDB.drivers.splice(0, dashboardDB.drivers.length, ...(driverResult.data || []).map((row) => ({ name: row.name, license: row.license_no || "", expiry: row.license_expiry || "", trips: row.trips_completed || 0, rating: Number(row.rating) || 0, status: row.status })));
          else dashboardDB.drivers.splice(0, dashboardDB.drivers.length);
          if (allowed("finance")) {
            dashboardDB.invoices.splice(0, dashboardDB.invoices.length, ...(invoiceResult.data || []).map((row) => ({ no: row.invoice_no, customer: row.customer_name, amount: Number(row.amount) || 0, status: row.status, date: row.invoice_date, linkedShipment: null, items: [], posted: row.posted })));
            dashboardDB.expenses.splice(0, dashboardDB.expenses.length, ...(expenseResult.data || []).map((row) => ({ cat: row.category, vendor: row.vendor, amount: Number(row.amount) || 0, date: row.expense_date, status: row.status || "Paid", items: [] })));
            dashboardDB.payroll.splice(0, dashboardDB.payroll.length, ...(payrollResult.data || []).map((row) => ({ name: row.employee_name, role: row.role_title, gross: Number(row.gross) || 0, deductions: Number(row.deductions) || 0 })));
          } else {
            dashboardDB.invoices.splice(0, dashboardDB.invoices.length);
            dashboardDB.expenses.splice(0, dashboardDB.expenses.length);
            dashboardDB.payroll.splice(0, dashboardDB.payroll.length);
          }
          if (allowed("crm")) dashboardDB.leads.splice(0, dashboardDB.leads.length, ...(leadResult.data || []).map((row) => ({ id: row.id, company: row.company, contactName: row.contact_name, jobTitle: row.job_title || "", email: row.email || "", phone: row.phone || "", source: row.source || "Other", industry: row.industry || "", priority: row.priority, status: row.status, assignedTo: "", followUp: row.follow_up_date || "", transportMode: row.transport_mode || "", cargoType: row.cargo_type || "", origin: row.origin || "", destination: row.destination || "", frequency: row.frequency || "", volume: row.volume_weight || "", currentProvider: row.current_provider || "", requirements: row.requirements || "", value: Number(row.value) || 0, notesLog: [], linkedCustomerId: row.linked_customer_id || undefined })));
          else dashboardDB.leads.splice(0, dashboardDB.leads.length);
          if (allowed("support")) dashboardDB.tickets.splice(0, dashboardDB.tickets.length, ...(ticketResult.data || []).map((row) => ({ id: row.ticket_no, customer: row.customer_name || "", subject: row.subject, priority: row.priority, status: row.status, channel: row.channel || "Email", opened: row.opened_at, closed: row.closed_at || "" })));
          else dashboardDB.tickets.splice(0, dashboardDB.tickets.length);
          dashboardDB.announcements.splice(0, dashboardDB.announcements.length, ...(announcementResult.data || []));
          setDataRevision((revision) => revision + 1);
        } catch (error) { setDataNotice(error instanceof Error ? error.message : "Could not load dashboard data"); }
      })();
    });
  }, [currentUser?.modules]);
  const { bookings, fleet } = dashboardDB;
  const latestAnnouncement = dashboardDB.announcements[0];
  const shipmentStatusCounts = shipmentCounts();
  const fleetStatusCounts = fleetCounts();
  const driverStatusCounts = driverCounts();
  const leadCounts = leadPriorityCounts();
  const invoiceCounts = invoiceStatusCounts();
  const ticketCounts = ticketStatusCounts();
  const fin = computeFinance();
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const licenceLimit = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const operationalAlerts = [
    ...fleet.filter((vehicle) => vehicle.service && vehicle.service < todayKey).map((vehicle) => ({ id: `service-${vehicle.plate}`, color: "var(--red)", text: `Vehicle ${vehicle.plate} maintenance was due ${vehicle.service}` })),
    ...dashboardDB.drivers.filter((driver) => driver.expiry && driver.expiry <= licenceLimit).map((driver) => ({ id: `license-${driver.name}`, color: "var(--amber)", text: `Driver ${driver.name} licence expires ${driver.expiry}` })),
  ];
  const openShipments = () => {
    dispatch({ type: "SET_CURRENT_TAB", view: "shipments", tab: "bookings" });
    navigate("shipments");
  };
  const dismissAlert = (id: string) => {
    if (dismissedAlerts.includes(id)) return;
    dashboardDB.dismissedAlerts.push(id);
    setDismissedAlerts([...dashboardDB.dismissedAlerts]);
  };

  return <>
    <div className="view-head"><div><h1>Dashboard</h1><p>Live overview of shipments, fleet, and revenue</p></div></div>
    {dataNotice && <div className="note" role="status">Live dashboard data could not be loaded: {dataNotice}</div>}
    <div className="tabs"><div className={`tab${tab === "overview" ? " active" : ""}`} onClick={() => setTab("overview")}>Overview</div><div className={`tab${tab === "breakdown" ? " active" : ""}`} onClick={() => setTab("breakdown")}>Breakdown</div></div>
    {tab === "breakdown" ? <div className="grid g-3"><BreakdownPanel title="Shipments by status" counts={shipmentStatusCounts} colors={Object.values(shipmentColors)} /><BreakdownPanel title="Fleet by status" counts={fleetStatusCounts} colors={Object.values(fleetColors)} /><BreakdownPanel title="Leads by priority" counts={leadCounts} colors={["#e2362b", "#ca8a04", "#63676f"]} /><BreakdownPanel title="Drivers by status" counts={driverStatusCounts} colors={["#1f9d5c", "#2563c7", "#63676f"]} /><BreakdownPanel title="Invoices by status" counts={invoiceCounts} colors={["#1f9d5c", "#ca8a04", "#e2362b"]} /><BreakdownPanel title="Tickets by status" counts={ticketCounts} colors={["#ca8a04", "#1f9d5c"]} /></div> : <>
      {latestAnnouncement && !dismissedAlerts.includes(latestAnnouncement.id) && <div className="alert-banner"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg></span><span className="a-text"><b>{latestAnnouncement.title}</b> — {latestAnnouncement.body}</span><button onClick={() => dismissAlert(latestAnnouncement.id)}>Dismiss</button></div>}
      <div className="stat-card"><div className="stat-head"><h3>Shipments</h3><span>{Object.values(shipmentStatusCounts).reduce((sum, value) => sum + value, 0)} total on file</span></div><div className="stat-row">{[["Pending", "Pending"], ["Assigned", "Assigned"], ["In Transit", "In transit"], ["Delivered", "Delivered"], ["Cancelled", "Cancelled"]].map(([key, label]) => <div className="stat-col" key={key}><div className="n">{shipmentStatusCounts[key] || 0}</div><div className="l">{label}</div></div>)}</div></div>
      <div style={{ height: 12 }} />
      <div className="stat-card"><div className="stat-head"><h3>Fleet</h3><span>{fleet.length} vehicles on file{fleet.length - Object.values(fleetStatusCounts).reduce((sum, value) => sum + value, 0) ? ` (${fleet.length - Object.values(fleetStatusCounts).reduce((sum, value) => sum + value, 0)} idle)` : ""}</span></div><div className="stat-row">{[["Available", "Available"], ["In Transit", "In transit"], ["Maintenance", "Maintenance"], ["Out of service", "Out of service"]].map(([key, label]) => <div className="stat-col" key={key}><div className="n">{fleetStatusCounts[key] || 0}</div><div className="l">{label}</div></div>)}</div></div>
      <div className="grid g-5" style={{ margin: "14px 0" }}>{[["Revenue this month", fmtNaira(fin.revenue), "from paid invoices"], ["Expenses this month", fmtNaira(fin.expenses), `${fin.expenseCount} logged`], ["Profit this month", fmtNaira(fin.profit), "revenue minus expenses"], ["Maintenance spend", fmtNaira(fin.maintenanceSpend), "this month"], ["Pending invoices", String(fin.pendingInvoiceCount), `${fmtNaira(fin.pendingInvoiceTotal)} outstanding`]].map(([label, value, cap]) => <div className="kpi-card" key={label}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-cap">{cap}</div></div>)}</div>
      <div className="grid g-7-5"><div className="card"><div className="card-head"><div className="card-title">Recent shipments</div><button className="subtle-link" type="button" onClick={openShipments}>View all</button></div>{bookings.length ? bookings.slice().sort((a, b) => new Date(b.pickup).getTime() - new Date(a.pickup).getTime()).slice(0, 6).map((booking) => <div key={booking.tracking} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)" }}><button className="mono link-cell" type="button" style={{ fontSize: 11.6 }} onClick={openShipments}>{booking.tracking}</button><span style={{ fontSize: 12, color: "var(--text-dim)", flex: 1, textAlign: "right" }}>{booking.destination}</span><StatusBadge status={booking.status} /></div>) : <div className="empty">No shipments yet.</div>}</div><div className="card"><div className="card-head"><div className="card-title">Alerts</div></div>{operationalAlerts.length ? operationalAlerts.map((alert) => <div key={alert.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.6, padding: "6px 0", borderTop: "1px solid var(--border)" }}><span style={{ color: alert.color, marginTop: 5 }}>●</span><span>{alert.text}</span></div>) : <div className="empty">No maintenance or licence alerts.</div>}</div></div>
    </>}
  </>;
}
