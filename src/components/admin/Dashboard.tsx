"use client";

import { useState } from "react";
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
  const [dismissedAlerts, setDismissedAlerts] = useState(dashboardDB.dismissedAlerts);
  const { bookings, fleet } = dashboardDB;
  const latestAnnouncement = dashboardDB.announcements[0];
  const shipmentStatusCounts = shipmentCounts();
  const fleetStatusCounts = fleetCounts();
  const driverStatusCounts = driverCounts();
  const leadCounts = leadPriorityCounts();
  const invoiceCounts = invoiceStatusCounts();
  const ticketCounts = ticketStatusCounts();
  const fin = computeFinance();
  const dismissAlert = (id: string) => {
    if (dismissedAlerts.includes(id)) return;
    dashboardDB.dismissedAlerts.push(id);
    setDismissedAlerts([...dashboardDB.dismissedAlerts]);
  };

  return <>
    <div className="view-head"><div><h1>Dashboard</h1><p>Live overview of shipments, fleet, and revenue</p></div></div>
    <div className="tabs"><div className={`tab${tab === "overview" ? " active" : ""}`} onClick={() => setTab("overview")}>Overview</div><div className={`tab${tab === "breakdown" ? " active" : ""}`} onClick={() => setTab("breakdown")}>Breakdown</div></div>
    {tab === "breakdown" ? <div className="grid g-3"><BreakdownPanel title="Shipments by status" counts={shipmentStatusCounts} colors={Object.values(shipmentColors)} /><BreakdownPanel title="Fleet by status" counts={fleetStatusCounts} colors={Object.values(fleetColors)} /><BreakdownPanel title="Leads by priority" counts={leadCounts} colors={["#e2362b", "#ca8a04", "#63676f"]} /><BreakdownPanel title="Drivers by status" counts={driverStatusCounts} colors={["#1f9d5c", "#2563c7", "#63676f"]} /><BreakdownPanel title="Invoices by status" counts={invoiceCounts} colors={["#1f9d5c", "#ca8a04", "#e2362b"]} /><BreakdownPanel title="Tickets by status" counts={ticketCounts} colors={["#ca8a04", "#1f9d5c"]} /></div> : <>
      {latestAnnouncement && !dismissedAlerts.includes(latestAnnouncement.id) && <div className="alert-banner"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg></span><span className="a-text"><b>{latestAnnouncement.title}</b> — {latestAnnouncement.body}</span><button onClick={() => dismissAlert(latestAnnouncement.id)}>Dismiss</button></div>}
      <div className="stat-card"><div className="stat-head"><h3>Shipments</h3><span>{Object.values(shipmentStatusCounts).reduce((sum, value) => sum + value, 0)} total on file</span></div><div className="stat-row">{[["Pending", "Pending"], ["Assigned", "Assigned"], ["In Transit", "In transit"], ["Delivered", "Delivered"], ["Cancelled", "Cancelled"]].map(([key, label]) => <div className="stat-col" key={key}><div className="n">{shipmentStatusCounts[key] || 0}</div><div className="l">{label}</div></div>)}</div></div>
      <div style={{ height: 12 }} />
      <div className="stat-card"><div className="stat-head"><h3>Fleet</h3><span>{fleet.length} vehicles on file{fleet.length - Object.values(fleetStatusCounts).reduce((sum, value) => sum + value, 0) ? ` (${fleet.length - Object.values(fleetStatusCounts).reduce((sum, value) => sum + value, 0)} idle)` : ""}</span></div><div className="stat-row">{[["Available", "Available"], ["In Transit", "In transit"], ["Maintenance", "Maintenance"], ["Out of service", "Out of service"]].map(([key, label]) => <div className="stat-col" key={key}><div className="n">{fleetStatusCounts[key] || 0}</div><div className="l">{label}</div></div>)}</div></div>
      <div className="grid g-5" style={{ margin: "14px 0" }}>{[["Revenue this month", fmtNaira(fin.revenue), "from paid invoices"], ["Expenses this month", fmtNaira(fin.expenses), "3 logged"], ["Profit this month", fmtNaira(fin.profit), "revenue minus expenses"], ["Maintenance spend", fmtNaira(fin.maintenanceSpend), "this month"], ["Pending invoices", String(fin.pendingInvoiceCount), `${fmtNaira(fin.pendingInvoiceTotal)} outstanding`]].map(([label, value, cap]) => <div className="kpi-card" key={label}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-cap">{cap}</div></div>)}</div>
      <div className="grid g-7-5"><div className="card"><div className="card-head"><div className="card-title">Recent shipments</div><span className="subtle-link">View all</span></div>{bookings.slice().sort((a, b) => new Date(b.pickup).getTime() - new Date(a.pickup).getTime()).slice(0, 6).map((booking) => <div key={booking.tracking} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)" }}><span className="mono link-cell" style={{ fontSize: 11.6 }}>{booking.tracking}</span><span style={{ fontSize: 12, color: "var(--text-dim)", flex: 1, textAlign: "right" }}>{booking.destination}</span><StatusBadge status={booking.status} /></div>)}</div><div className="card"><div className="card-head"><div className="card-title">Alerts</div></div><div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.6, padding: "6px 0" }}><span style={{ color: "var(--red)", marginTop: 5 }}>●</span><span>Vehicle KJA-441-XL maintenance was due 04 Aug 2026</span></div><div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.6, padding: "6px 0", borderTop: "1px solid var(--border)" }}><span style={{ color: "var(--amber)", marginTop: 5 }}>●</span><span>Driver Tunde Fashola’s licence expires 19 Aug 2026</span></div></div></div>
    </>}
  </>;
}
