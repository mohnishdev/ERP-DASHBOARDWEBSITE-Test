"use client";

import { useState } from "react";

type Booking = { tracking: string; destination: string; status: string; pickup: string };
type CountMap = Record<string, number>;

const bookings: Booking[] = [
  { tracking: "JAAD/2807/2026/00231", destination: "Ikoyi, Lagos", status: "Delivered", pickup: "2026-07-28" },
  { tracking: "JAAD/2907/2026/00232", destination: "Port Harcourt", status: "Delivered", pickup: "2026-07-29" },
  { tracking: "JAAD/3007/2026/00233", destination: "Kano", status: "In Transit", pickup: "2026-07-30" },
  { tracking: "JAAD/0108/2026/00234", destination: "Ibadan", status: "Assigned", pickup: "2026-08-01" },
  { tracking: "JAAD/0108/2026/00236", destination: "Kano", status: "Assigned", pickup: "2026-08-01" },
  { tracking: "JAAD/0208/2026/00237", destination: "Lagos", status: "Pending", pickup: "2026-08-02" },
  { tracking: "JAAD/0208/2026/00238", destination: "Enugu", status: "Exception", pickup: "2026-08-02" },
  { tracking: "JAAD/2607/2026/00229", destination: "Aba", status: "Cancelled", pickup: "2026-07-26" },
];

const fleet = ["Available", "Maintenance", "In Transit", "Out of service", "Idle"];
const drivers = ["Available", "On trip", "Available", "Off duty"];
const leads = ["Warm", "Hot", "Hot", "Cold", "Warm", "Hot"];
const invoices = ["Paid", "Paid", "Overdue", "Pending"];
const expenses = [840000, 310000, 64000];
const tickets = ["Open", "Open", "Resolved"];

const shipmentColors: Record<string, string> = { Pending: "#ca8a04", Assigned: "#2563c7", "In Transit": "#7c3aed", Delivered: "#1f9d5c", Cancelled: "#63676f" };
const fleetColors: Record<string, string> = { Available: "#1f9d5c", "In Transit": "#2563c7", Maintenance: "#ca8a04", "Out of service": "#e2362b" };

function countValues(values: string[], keys?: string[]): CountMap {
  const counts = Object.fromEntries((keys || []).map((key) => [key, 0]));
  values.forEach((value) => {
    if (keys && !(value in counts)) return;
    counts[value] = (counts[value] || 0) + 1;
  });
  return counts;
}

function fmtNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function finance() {
  const revenue = Math.round((2100000 + 4600000) / 1.075);
  const totalExpenses = expenses.reduce((sum, value) => sum + value, 0);
  const profit = revenue - totalExpenses;
  return { revenue, expenses: totalExpenses, profit, maintenanceSpend: 310000, pendingInvoiceCount: 2, pendingInvoiceTotal: 5800000 };
}

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
  const shipmentCounts = countValues(bookings.map((booking) => booking.status), ["Pending", "Assigned", "In Transit", "Delivered", "Cancelled"]);
  const fleetCounts = countValues(fleet, ["Available", "In Transit", "Maintenance", "Out of service"]);
  const driverCounts = countValues(drivers, ["Available", "On trip", "Off duty"]);
  const leadCounts = countValues(leads, ["Hot", "Warm", "Cold"]);
  const invoiceCounts = countValues(invoices, ["Paid", "Pending", "Overdue"]);
  const ticketCounts = countValues(tickets, ["Open", "Resolved"]);
  const fin = finance();

  return <>
    <div className="view-head"><div><h1>Dashboard</h1><p>Live overview of shipments, fleet, and revenue</p></div></div>
    <div className="tabs"><div className={`tab${tab === "overview" ? " active" : ""}`} onClick={() => setTab("overview")}>Overview</div><div className={`tab${tab === "breakdown" ? " active" : ""}`} onClick={() => setTab("breakdown")}>Breakdown</div></div>
    {tab === "breakdown" ? <div className="grid g-3"><BreakdownPanel title="Shipments by status" counts={shipmentCounts} colors={Object.values(shipmentColors)} /><BreakdownPanel title="Fleet by status" counts={fleetCounts} colors={Object.values(fleetColors)} /><BreakdownPanel title="Leads by priority" counts={leadCounts} colors={["#e2362b", "#ca8a04", "#63676f"]} /><BreakdownPanel title="Drivers by status" counts={driverCounts} colors={["#1f9d5c", "#2563c7", "#63676f"]} /><BreakdownPanel title="Invoices by status" counts={invoiceCounts} colors={["#1f9d5c", "#ca8a04", "#e2362b"]} /><BreakdownPanel title="Tickets by status" counts={ticketCounts} colors={["#ca8a04", "#1f9d5c"]} /></div> : <>
      <div className="stat-card"><div className="stat-head"><h3>Shipments</h3><span>{bookings.length} total on file</span></div><div className="stat-row">{[["Pending", "Pending"], ["Assigned", "Assigned"], ["In Transit", "In transit"], ["Delivered", "Delivered"], ["Cancelled", "Cancelled"]].map(([key, label]) => <div className="stat-col" key={key}><div className="n">{shipmentCounts[key] || 0}</div><div className="l">{label}</div></div>)}</div></div>
      <div style={{ height: 12 }} />
      <div className="stat-card"><div className="stat-head"><h3>Fleet</h3><span>{fleet.length} vehicles on file{fleetCounts.Idle ? ` (${fleetCounts.Idle} idle)` : ""}</span></div><div className="stat-row">{[["Available", "Available"], ["In Transit", "In transit"], ["Maintenance", "Maintenance"], ["Out of service", "Out of service"]].map(([key, label]) => <div className="stat-col" key={key}><div className="n">{fleetCounts[key] || 0}</div><div className="l">{label}</div></div>)}</div></div>
      <div className="grid g-5" style={{ margin: "14px 0" }}>{[["Revenue this month", fmtNaira(fin.revenue), "from paid invoices"], ["Expenses this month", fmtNaira(fin.expenses), "3 logged"], ["Profit this month", fmtNaira(fin.profit), "revenue minus expenses"], ["Maintenance spend", fmtNaira(fin.maintenanceSpend), "this month"], ["Pending invoices", String(fin.pendingInvoiceCount), `${fmtNaira(fin.pendingInvoiceTotal)} outstanding`]].map(([label, value, cap]) => <div className="kpi-card" key={label}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-cap">{cap}</div></div>)}</div>
      <div className="grid g-7-5"><div className="card"><div className="card-head"><div className="card-title">Recent shipments</div><span className="subtle-link">View all</span></div>{bookings.slice().sort((a, b) => new Date(b.pickup).getTime() - new Date(a.pickup).getTime()).slice(0, 6).map((booking) => <div key={booking.tracking} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)" }}><span className="mono link-cell" style={{ fontSize: 11.6 }}>{booking.tracking}</span><span style={{ fontSize: 12, color: "var(--text-dim)", flex: 1, textAlign: "right" }}>{booking.destination}</span><StatusBadge status={booking.status} /></div>)}</div><div className="card"><div className="card-head"><div className="card-title">Alerts</div></div><div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.6, padding: "6px 0" }}><span style={{ color: "var(--red)", marginTop: 5 }}>●</span><span>Vehicle KJA-441-XL maintenance was due 04 Aug 2026</span></div><div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.6, padding: "6px 0", borderTop: "1px solid var(--border)" }}><span style={{ color: "var(--amber)", marginTop: 5 }}>●</span><span>Driver Tunde Fashola’s licence expires 19 Aug 2026</span></div></div></div>
    </>}
  </>;
}
