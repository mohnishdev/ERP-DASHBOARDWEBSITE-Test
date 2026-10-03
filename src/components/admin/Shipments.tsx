"use client";

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { dashboardDB, fmtNaira, type Booking, type Invoice, type Manifest, type ProofOfDelivery, type ShipmentReturn } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/client";
import { isSimulationMode } from "@/lib/supabase/mode";
import { persistSimulationState } from "@/lib/simulation-store";

const shipmentTabs = [
  ["bookings", "Bookings"],
  ["dispatch", "Dispatch"],
  ["tracking", "Tracking"],
  ["manifests", "Manifests"],
  ["pod", "Proof of delivery"],
  ["returns", "Returns"],
] as const;

const shipmentStatuses = ["Pending", "Assigned", "In Transit", "Delivered", "Exception", "Cancelled"];
const shipmentStatusColors: Record<string, string> = {
  Pending: "#ca8a04",
  Assigned: "#2563c7",
  "In Transit": "#7c3aed",
  Delivered: "#1f9d5c",
  Exception: "#e2362b",
  Cancelled: "#63676f",
};

const bookingCustomers = ["EricBoss Furnitures", "Arbico PLC", "Doyetek Industries", "Sahara Textiles"];
const bookingCities = ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Benin City", "Enugu", "Kaduna", "Onitsha", "Aba"];
let simulationTrackingSequence = 239;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function pad(value: number, length: number) {
  return String(value).padStart(length, "0");
}

function simulationTrackingNumber(date: string) {
  const pickupDate = new Date(`${date}T00:00:00`);
  const highestSequence = dashboardDB.bookings.reduce((highest, booking) => {
    const sequence = Number(booking.tracking.split("/").pop()) || 0;
    return Math.max(highest, sequence);
  }, simulationTrackingSequence - 1);
  simulationTrackingSequence = highestSequence + 2;
  return `JAAD/${pad(pickupDate.getDate(), 2)}${pad(pickupDate.getMonth() + 1, 2)}/${pickupDate.getFullYear()}/${pad(highestSequence + 1, 5)}`;
}

function typeBadge(type: string) {
  return <span className="badge b-gray">{type}</span>;
}

function statusSelect(status: string, onChange: (status: string) => void) {
  const color = shipmentStatusColors[status] || "#888";
  return <select className="switch-select" value={status} onChange={(event) => onChange(event.target.value)} style={{ backgroundColor: `${color}22`, color }} aria-label={`Status: ${status}`}>
    {shipmentStatuses.map((option) => <option value={option} key={option}>{option}</option>)}
  </select>;
}

function ShipmentRow({ booking, onGenerateInvoice, onStatusChange }: { booking: Booking; onGenerateInvoice: (booking: Booking) => void; onStatusChange: (booking: Booking, status: string) => void }) {
  return <tr>
    <td><span className="mono link-cell">{booking.tracking}</span></td>
    <td>{booking.customer}</td>
    <td>{booking.origin} → {booking.destination}</td>
    <td>{typeBadge(booking.type)}</td>
    <td>{formatDate(booking.pickup)}</td>
    <td>{statusSelect(booking.status, (status) => onStatusChange(booking, status))}</td>
    <td><button className="btn btn-sm btn-primary" onClick={() => onGenerateInvoice(booking)}>Generate invoice</button></td>
  </tr>;
}

const dispatchStages = ["Pending", "Assigned", "In Transit", "Delivered"] as const;

function nextDispatchStage(stage: typeof dispatchStages[number]) {
  return { Pending: "Assigned", Assigned: "In Transit", "In Transit": "Delivered", Delivered: undefined }[stage];
}

export function DispatchView({ onAdvance, onMove }: { onAdvance: (booking: Booking) => void; onMove: (booking: Booking, stage: typeof dispatchStages[number]) => void }) {
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const dropBooking = (stage: typeof dispatchStages[number]) => {
    if (!draggedBookingId) return;
    const booking = dashboardDB.bookings.find((item) => item.id === draggedBookingId);
    if (booking && booking.status !== stage) onMove(booking, stage);
    setDraggedBookingId(null);
    setDragOverStage(null);
  };

  return <>
    <div className="note">Haulage shipments in Assigned can be grouped into a manifest from here.</div>
    <div className="kanban">
      {dispatchStages.map((stage) => {
        const items = dashboardDB.bookings.filter((booking) => booking.status === stage);
        const nextStage = nextDispatchStage(stage);
        return <div className={`kcol${dragOverStage === stage ? " drag-over" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragOverStage(stage); }} onDragLeave={() => setDragOverStage(null)} onDrop={(event) => { event.preventDefault(); dropBooking(stage); }} key={stage}>
          <div className="kcol-head"><h4>{stage}</h4><span className="badge b-gray">{items.length}</span></div>
          {items.length ? items.map((booking) => <div className="kcard" draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; setDraggedBookingId(booking.id); }} onDragEnd={() => { setDraggedBookingId(null); setDragOverStage(null); }} key={booking.id}>
            <div className="kcard-top"><span className="kcard-name mono" style={{ fontSize: 11.6 }}>{booking.tracking}</span>{typeBadge(booking.type)}</div>
            <div className="kcard-meta">{booking.customer}<br />{booking.origin} → {booking.destination}</div>
            {nextStage && <button className="btn btn-sm" style={{ width: "100%", marginTop: 6 }} onClick={(event) => { event.stopPropagation(); onAdvance(booking); }}>Advance to {nextStage}</button>}
          </div>) : <div className="empty">Nothing here</div>}
        </div>;
      })}
    </div>
  </>;
}

function downloadTrackingPdf(booking: Booking) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(`Shipment ${booking.tracking}`, 48, 56);
  doc.setFontSize(10.5);
  doc.text(`From: ${booking.origin}`, 48, 82);
  doc.text(`To: ${booking.destination}`, 48, 100);
  doc.text(`Customer: ${booking.customer}`, 48, 118);
  doc.text(`Mode: ${booking.type}`, 48, 136);
  doc.text(`Pickup date: ${formatDate(booking.pickup)}`, 48, 154);
  doc.text(`Status: ${booking.status}`, 48, 172);
  doc.text(`Weight: ${booking.weight}`, 48, 190);
  doc.text(`Declared value: ${fmtNaira(booking.value)}`, 48, 208);
  doc.save(`${booking.tracking.replace(/\//g, "-")}.pdf`);
}

function TrackingDocument({ booking }: { booking: Booking }) {
  const events = dashboardDB.trackingEvents[booking.id] || [];
  const invoice = dashboardDB.invoices.find((item) => item.linkedShipment === booking.tracking);
  return <div className="doc">
    <div className="doc-head"><div><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" style={{ height: 30 }} /></div><div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div></div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 16 }}><div><h2>Shipment {booking.tracking}</h2></div><div style={{ textAlign: "right", fontSize: 10 }}><div className="lbl">Invoice</div><strong style={{ color: invoice ? "var(--red)" : "var(--red)" }}>{invoice?.no || "Not issued"}</strong><div className="lbl" style={{ marginTop: 8 }}>Payment status</div><span className={`badge ${invoice ? "b-amber" : "b-gray"}`}>{invoice?.status || "Not issued"}</span></div></div>
    <div className="doc-route"><div className="pt"><div className="lbl">Picked up from</div><div className="v">{booking.origin}</div></div><div className="arrow">→</div><div className="pt" style={{ textAlign: "right" }}><div className="lbl">Headed to</div><div className="v">{booking.destination}</div></div></div>
    <div className="doc-grid"><div><div className="lbl">Customer</div>{booking.customer}</div><div style={{ textAlign: "right" }}><div className="lbl">Pickup date</div>{formatDate(booking.pickup)}<br /><div className="lbl" style={{ marginTop: 8 }}>Status</div><span className="badge b-green">{booking.status}</span></div></div>
    <div className="doc-grid"><div><div className="lbl">Mode</div>{booking.type}</div><div style={{ textAlign: "right" }}><div className="lbl">Weight</div>{booking.weight}</div></div>
    <div className="doc-grid"><div><div className="lbl">Declared value</div>{fmtNaira(booking.value)}</div><div style={{ textAlign: "right" }}><div className="lbl">Receiver</div>{booking.customer}<br />{booking.destination}</div></div>
    {booking.notes && <div className="note">{booking.notes}</div>}
    <div className="form-section-title">Tracking history</div>
    {events.length ? events.map(([time, event]) => <div style={{ display: "flex", gap: 12, padding: "6px 0", borderTop: "1px solid var(--border)", fontSize: 12 }} key={`${time}-${event}`}><span className="mono" style={{ color: "var(--text-faint)", minWidth: 120 }}>{time}</span><span>{event}</span></div>) : <div className="empty">No events yet</div>}
  </div>;
}

export function TrackingView() {
  const [tracking, setTracking] = useState("");
  const booking = tracking.trim() ? dashboardDB.bookings.find((item) => item.tracking.toLowerCase() === tracking.trim().toLowerCase()) : undefined;
  return <>
    <div className="field" style={{ maxWidth: 360 }}>
      <label>Tracking number</label>
      <input id="track-input" placeholder="e.g. JAAD/3007/2026/00233" value={tracking} onChange={(event) => setTracking(event.target.value)} />
    </div>
    <div id="track-result">
      {tracking.trim() && !booking && <div className="empty">No shipment matches that tracking number yet, keep typing</div>}
      {booking && <><div className="doc-page-wrap" style={{ marginTop: 16 }}><TrackingDocument booking={booking} /></div><div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 12 }}><button className="btn" onClick={() => downloadTrackingPdf(booking)}>↓ Download PDF</button><button className="btn btn-primary" onClick={() => window.print()}>⎙ Print</button></div></>}
    </div>
  </>;
}

function downloadManifestPdf(manifest: Manifest) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(`Manifest ${manifest.no}`, 48, 56);
  doc.setFontSize(10.5);
  doc.text(`Driver: ${manifest.driver}`, 48, 82);
  doc.text(`Vehicle: ${manifest.vehicle}`, 48, 100);
  doc.text(`Route: ${manifest.route}`, 48, 118);
  doc.text(`Date: ${formatDate(manifest.date)}`, 48, 136);
  let y = 174;
  manifest.shipments.forEach((tracking) => {
    const booking = dashboardDB.bookings.find((item) => item.tracking === tracking);
    doc.text(`${tracking}  ${booking?.customer || "—"}  ${booking?.destination || "—"}`, 48, y);
    y += 18;
  });
  doc.text(`Total shipments: ${manifest.shipments.length}`, 48, y + 18);
  doc.save(`${manifest.no.replace(/\//g, "-")}.pdf`);
}

function ManifestPreview({ manifest, onClose }: { manifest: Manifest; onClose: () => void }) {
  const rows = manifest.shipments.map((tracking) => {
    const booking = dashboardDB.bookings.find((item) => item.tracking === tracking);
    return { tracking, customer: booking?.customer || "—", mode: booking ? `${booking.type}, ${booking.weight}` : "—", value: booking ? fmtNaira(booking.value) : "—", destination: booking?.destination || "—" };
  });
  const totalValue = rows.reduce((sum, row) => sum + (dashboardDB.bookings.find((booking) => booking.tracking === row.tracking)?.value || 0), 0);
  return <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal doc-modal">
      <div className="modal-head"><h3>{manifest.no}</h3><button className="x-btn" onClick={onClose}>×</button></div>
      <div className="modal-body"><div className="doc">
        <div className="doc-head"><div><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" style={{ height: 30 }} /></div><div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div></div>
        <h2>Manifest {manifest.no}</h2>
        <div className="wgrid">
          <div className="wbox"><div className="lbl">Carrier</div>JAAD Logistics Ltd<br />Lagos, Nigeria<br />Tel: +234-806-147-2153</div>
          <div className="wbox"><div className="lbl">Manifest no.</div>{manifest.no}<br /><div className="lbl" style={{ marginTop: 6 }}>Issued by</div>JAAD Logistics Ltd</div>
          <div className="wbox"><div className="lbl">Driver</div>{manifest.driver}<br /><div className="lbl" style={{ marginTop: 6 }}>Vehicle</div>{manifest.vehicle}</div>
          <div className="wbox"><div className="lbl">Date of dispatch</div>{formatDate(manifest.date)}<br /><div className="lbl" style={{ marginTop: 6 }}>Route</div>{manifest.route}</div>
        </div>
        <table className="wtable"><thead><tr><th>Tracking no.</th><th>Customer</th><th>Mode / weight</th><th>Declared value</th><th>Destination</th></tr></thead><tbody>
          {rows.map((row) => <tr key={row.tracking}><td>{row.tracking}</td><td>{row.customer}</td><td>{row.mode}</td><td>{row.value}</td><td>{row.destination}</td></tr>)}
          <tr><td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Total shipments: {manifest.shipments.length}</td><td colSpan={2} style={{ fontWeight: 700 }}>{fmtNaira(totalValue)}</td></tr>
        </tbody></table>
        <div className="wbox" style={{ marginBottom: 16 }}><div className="lbl">Driver&apos;s certification</div>The driver certifies that the shipments listed above were received in good order and condition for transport, in accordance with JAAD Logistics terms of carriage.</div>
        <div className="doc-sign"><div className="line">Name &amp; signature of driver</div><div className="line">Date &amp; place of departure</div></div>
      </div></div>
      <div className="modal-foot"><button className="btn" onClick={onClose}>Close</button><button className="btn" onClick={() => downloadManifestPdf(manifest)}>↓ Download PDF</button><button className="btn btn-primary" onClick={() => window.print()}>⎙ Print</button></div>
    </div>
  </div>;
}

export function ManifestsView({ manifests, onOpenManifest }: { manifests: Manifest[]; onOpenManifest: (manifest: Manifest) => void }) {
  return <div className="table-wrap">
    <table>
      <thead><tr><th>Manifest no.</th><th>Date</th><th>Driver</th><th>Vehicle</th><th>Route</th><th>Shipments</th></tr></thead>
      <tbody>{manifests.map((manifest) => <tr key={manifest.no}>
        <td><span className="mono link-cell" onClick={() => onOpenManifest(manifest)}>{manifest.no}</span></td>
        <td>{formatDate(manifest.date)}</td>
        <td>{manifest.driver}</td>
        <td>{manifest.vehicle}</td>
        <td>{manifest.route}</td>
        <td>{manifest.shipments.length}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function PODView({ onSave }: { onSave: (booking: Booking, receivedBy: string, notes: string) => void }) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const delivered = dashboardDB.bookings.filter((booking) => booking.status === "Delivered");

  return <>
    <div className="table-wrap">
      {delivered.length ? <table>
        <thead><tr><th>Tracking no.</th><th>Customer</th><th>Delivered</th><th>Recipient</th><th>Action</th></tr></thead>
        <tbody>{delivered.map((booking) => {
          const pod = dashboardDB.proofOfDelivery[booking.id];
          return <tr key={booking.id}>
            <td><span className="mono">{booking.tracking}</span></td>
            <td>{booking.customer}</td>
            <td>{pod?.deliveredAt ? formatDate(pod.deliveredAt.slice(0, 10)) : formatDate(booking.pickup)}</td>
            <td>{pod?.receivedBy || "Not recorded"}</td>
            <td><button className="btn btn-sm" onClick={() => setSelectedBooking(booking)}>{pod ? "Edit POD" : "Record POD"}</button></td>
          </tr>;
        })}</tbody>
      </table> : <div className="empty">No delivered shipments need proof of delivery</div>}
    </div>
    {selectedBooking && <PODForm booking={selectedBooking} initial={dashboardDB.proofOfDelivery[selectedBooking.id]} onSave={(receivedBy, notes) => { onSave(selectedBooking, receivedBy, notes); setSelectedBooking(null); }} onClose={() => setSelectedBooking(null)} />}
  </>;
}

function PODForm({ booking, initial, onSave, onClose }: { booking: Booking; initial?: ProofOfDelivery; onSave: (receivedBy: string, notes: string) => void; onClose: () => void }) {
  const [receivedBy, setReceivedBy] = useState(initial?.receivedBy ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  return <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal"><div className="modal-head"><h3>Proof of delivery · {booking.tracking}</h3><button className="x-btn" onClick={onClose}>×</button></div><div className="modal-body"><div className="field"><label>Received by</label><input value={receivedBy} onChange={(event) => setReceivedBy(event.target.value)} autoFocus /></div><div className="field"><label>Notes</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></div></div><div className="modal-foot"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!receivedBy.trim()} onClick={() => onSave(receivedBy.trim(), notes.trim())}>Save POD</button></div></div></div>;
}

function returnStatusSelect(status: ShipmentReturn["status"], onChange: (status: ShipmentReturn["status"]) => void) {
  return <select className={`switch-select st-${status.toLowerCase()}`} value={status} onChange={(event) => onChange(event.target.value as ShipmentReturn["status"])} aria-label={`Return status: ${status}`}>
    {(["Open", "Resolved"] as const).map((option) => <option value={option} key={option}>{option}</option>)}
  </select>;
}

export function ReturnsView({ onStatusChange, onCreate }: { onStatusChange: (returnItem: ShipmentReturn, status: ShipmentReturn["status"]) => void; onCreate: (booking: Booking, reason: string) => void }) {
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [reason, setReason] = useState("");
  const eligibleBookings = dashboardDB.bookings.filter((booking) => !dashboardDB.returns.some((returnItem) => returnItem.tracking === booking.tracking));

  return <>
    <div className="panel" style={{ padding: 16, marginBottom: 14 }}><div className="form-section-title">Log a return</div><div className="field-row"><div className="field"><label>Shipment</label><select value={selectedBookingId} onChange={(event) => setSelectedBookingId(event.target.value)}><option value="">Choose a shipment</option>{eligibleBookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.tracking} · {booking.customer}</option>)}</select></div><div className="field"><label>Reason</label><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for return" /></div></div><button className="btn btn-primary" disabled={!selectedBookingId || !reason.trim()} onClick={() => { const booking = eligibleBookings.find((item) => item.id === selectedBookingId); if (booking) onCreate(booking, reason.trim()); setSelectedBookingId(""); setReason(""); }}>Log return</button></div>
    <div className="table-wrap">
      {dashboardDB.returns.length ? <table>
        <thead><tr><th>Tracking no.</th><th>Customer</th><th>Reason</th><th>Status</th><th>Logged</th></tr></thead>
        <tbody>{dashboardDB.returns.map((returnItem) => <tr key={returnItem.id}>
          <td><span className="mono">{returnItem.tracking}</span></td>
          <td>{returnItem.customer}</td>
          <td>{returnItem.reason}</td>
          <td>{returnStatusSelect(returnItem.status, (status) => onStatusChange(returnItem, status))}</td>
          <td>{formatDate(returnItem.created)}</td>
        </tr>)}</tbody>
      </table> : <div className="empty">No returns recorded</div>}
    </div>
  </>;
}

function BookingsView({ onGenerateInvoice, onStatusChange }: { onGenerateInvoice: (booking: Booking) => void; onStatusChange: (booking: Booking, status: string) => void }) {
  return <>
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-title" style={{ marginBottom: 10 }}>Look up a shipment</div>
      <div style={{ display: "flex", gap: 9, maxWidth: 460 }}>
        <input id="ops-search-input" placeholder="Tracking number, e.g. JAAD/3007/2026/00233" />
        <button className="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          Search
        </button>
      </div>
      <div id="ops-search-result" />
    </div>

    <div className="table-wrap">
      <table>
        <thead><tr><th>Tracking no.</th><th>Customer</th><th>Route</th><th>Type</th><th>Pickup</th><th>Status</th><th>Invoice</th></tr></thead>
        <tbody>{dashboardDB.bookings.map((booking) => <ShipmentRow booking={booking} onGenerateInvoice={onGenerateInvoice} onStatusChange={onStatusChange} key={booking.id} />)}</tbody>
      </table>
    </div>
  </>;
}

function InvoicePreview({ invoice, onClose, onDownload, onPrint, onPost }: { invoice: Invoice; onClose: () => void; onDownload: () => void; onPrint: () => void; onPost: () => void }) {
  const vat = Math.round(invoice.amount - invoice.amount / 1.075);
  const subtotal = invoice.amount - vat;
  const booking = dashboardDB.bookings.find((item) => item.tracking === invoice.linkedShipment);
  return <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal doc-modal">
      <div className="modal-head"><h3>Invoice {invoice.no} <span className="badge b-amber" style={{ marginLeft: 6 }}>Draft</span></h3><button className="x-btn" onClick={onClose}>×</button></div>
      <div className="modal-body">
        <div className="doc" style={{ position: "relative" }}>
          <div className="doc-head"><div><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" style={{ height: 42 }} /></div><div style={{ textAlign: "right" }}><div style={{ color: "var(--red)", fontSize: 10, fontWeight: 700, letterSpacing: ".18em" }}>INVOICE</div><div style={{ color: "var(--red)", fontFamily: "var(--font-d)", fontSize: 20, fontWeight: 700 }}>{invoice.no}</div><div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 5 }}>Date: {formatDate(invoice.date)}<br />Status: {invoice.status}</div></div></div>
          <div className="doc-grid"><div><div className="lbl">Billed to</div><strong>{invoice.customer}</strong></div><div style={{ textAlign: "right" }}><div className="lbl">Tracking</div><strong className="mono">{invoice.linkedShipment || "—"}</strong></div></div>
          {booking && <div className="doc-route"><div className="pt"><div className="lbl">From</div><div className="v">{booking.origin}</div></div><div className="arrow">→</div><div className="pt" style={{ textAlign: "right" }}><div className="lbl">To</div><div className="v">{booking.destination}</div></div></div>}
          <div className="grid g-2" style={{ marginBottom: 14 }}><div className="card"><div className="lbl" style={{ color: "var(--red)" }}>Sender information</div><strong>JAAD Logistics Ltd</strong><div style={{ color: "var(--text-faint)", fontSize: 10, marginTop: 5 }}>Additional details not supplied</div></div><div className="card"><div className="lbl" style={{ color: "var(--red)" }}>Receiver information</div><strong>{invoice.customer}</strong><div style={{ color: "var(--text-faint)", fontSize: 10, marginTop: 5 }}>Additional details not supplied</div></div></div>
          <table><thead><tr><th>Description</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead><tbody>
            {invoice.items.map((item) => <tr key={item.desc}><td>{item.desc}</td><td style={{ textAlign: "right" }}>{fmtNaira(item.amount)}</td></tr>)}
            <tr><td style={{ textAlign: "right" }}>Subtotal</td><td style={{ textAlign: "right" }}>{fmtNaira(subtotal)}</td></tr>
            <tr><td style={{ textAlign: "right" }}>VAT, 7.5%</td><td style={{ textAlign: "right" }}>{fmtNaira(vat)}</td></tr>
            <tr className="doc-total-row"><td>Total</td><td style={{ textAlign: "right" }}>{fmtNaira(invoice.amount)}</td></tr>
          </tbody></table>
          <div className="doc-sign"><div className="line">Prepared by, JAAD Logistics<br /><small>Date: {formatDate(invoice.date)}</small></div><div className="line">Received by, Customer<br /><small>Name / Date</small></div></div>
        </div>
      </div>
      <div className="modal-foot"><button className="btn" onClick={onClose}>Close</button><button className="btn" onClick={onDownload}>↓ Download PDF</button><button className="btn btn-primary" onClick={onPrint}>⎙ Print</button><button className="btn btn-primary" onClick={onPost}>Post to customer</button></div>
    </div>
  </div>;
}

type BookingForm = {
  customer: string;
  origin: string;
  destination: string;
  type: string;
  pickup: string;
  weight: string;
  value: string;
};

type ManifestForm = {
  driver: string;
  vehicle: string;
  route: string;
  shipments: string[];
};

const initialBookingForm: BookingForm = {
  customer: bookingCustomers[0],
  origin: bookingCities[0],
  destination: bookingCities[0],
  type: "Road",
  pickup: "2026-08-02",
  weight: "",
  value: "",
};

const initialManifestForm: ManifestForm = {
  driver: dashboardDB.drivers[0].name,
  vehicle: dashboardDB.fleet[0].plate,
  route: "",
  shipments: [],
};

function exportBookings() {
  const headers = ["tracking", "customer", "origin", "destination", "type", "status", "pickup", "weight", "value"];
  const lines = [headers.join(",")];
  dashboardDB.bookings.forEach((booking) => {
    lines.push(headers.map((header) => {
      const value = String(booking[header as keyof Booking] ?? "").replace(/"/g, '""');
      return /[",\n]/.test(value) ? `"${value}"` : value;
    }).join(","));
  });
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "bookings.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function manifestNumber(sequence: number, date: string) {
  const pickupDate = new Date(`${date}T00:00:00`);
  return `MNF/JAAD/${pad(pickupDate.getDate(), 2)}${pad(pickupDate.getMonth() + 1, 2)}/${pickupDate.getFullYear()}/${pad(sequence, 3)}`;
}

export function Shipments() {
    const [savingBooking, setSavingBooking] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof shipmentTabs)[number][0]>("bookings");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingForm>(initialBookingForm);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [manifestForm, setManifestForm] = useState<ManifestForm>(initialManifestForm);
  const [manifests, setManifests] = useState<Manifest[]>(dashboardDB.manifests);
  const [nextManifestSequence, setNextManifestSequence] = useState(() => dashboardDB.manifests.reduce((highest, manifest) => Math.max(highest, Number(manifest.no.split("/").pop()) || 0), 5) + 1);
  const [invoicePreview, setInvoicePreview] = useState<Invoice | null>(null);
  const [manifestPreview, setManifestPreview] = useState<Manifest | null>(null);
  const [, setDispatchRevision] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [shipmentDataState, setShipmentDataState] = useState<"loading" | "connected" | "demo">("loading");
  const [shipmentDataError, setShipmentDataError] = useState("");
  const views = {
    bookings: <BookingsView onGenerateInvoice={openInvoiceForBooking} onStatusChange={updateBookingStatus} />,
    dispatch: <DispatchView onAdvance={advanceDispatch} onMove={moveDispatch} />,
    tracking: <TrackingView />,
    manifests: <ManifestsView manifests={manifests} onOpenManifest={setManifestPreview} />,
    pod: <PODView onSave={saveProofOfDelivery} />,
    returns: <ReturnsView onStatusChange={updateReturnStatus} onCreate={createReturnRecord} />,
  };

  useEffect(() => {
    let active = true;

    async function loadShipmentData() {
      try {
        const supabase = createClient();
        const [bookingResult, eventResult, manifestResult, manifestShipmentResult, returnResult, podResult, driverResult, vehicleResult] = await Promise.all([
          supabase
            .from("bookings")
            .select("id, tracking_no, customer_name, origin, destination, type, status, pickup_date, weight, declared_value, notes, sender_name, sender_phone, sender_address, sender_email, receiver_name, receiver_phone, receiver_address, vehicle_number, driver_name, driver_phone, checked_by, dispatched_by, declared_value_customs, insurance_amount, freight_terms")
            .order("pickup_date", { ascending: false }),
          supabase
            .from("tracking_events")
            .select("booking_id, event_time, description")
            .order("event_time", { ascending: true }),
          supabase.from("manifests").select("id, manifest_no, manifest_date, driver_name, vehicle_plate, route").order("manifest_date", { ascending: false }),
          supabase.from("manifest_shipments").select("manifest_id, booking_id"),
          supabase.from("returns").select("id, booking_id, tracking_no, customer_name, reason, status, created_at").order("created_at", { ascending: false }),
          supabase.from("proof_of_delivery").select("booking_id, received_by, recorded_by, delivered_at, notes"),
          supabase.from("drivers").select("id, name, license_no, license_expiry, status, trips_completed, rating"),
          supabase.from("fleet_vehicles").select("plate, type, status, next_service_date, fuel_liters, insurer, driver_id"),
        ]);

        const queryError = bookingResult.error || eventResult.error || manifestResult.error || manifestShipmentResult.error || returnResult.error || podResult.error || driverResult.error || vehicleResult.error;
        if (queryError) throw queryError;
        if (!active) return;

        const bookings = bookingResult.data || [];
        const liveBookings: Booking[] = bookings.map((booking) => ({
          id: booking.id,
          tracking: booking.tracking_no,
          customer: booking.customer_name,
          origin: booking.origin,
          destination: booking.destination,
          type: booking.type,
          status: booking.status,
          pickup: booking.pickup_date,
          weight: booking.weight ?? "",
          value: Number(booking.declared_value) || 0,
          notes: booking.notes ?? "",
          senderName: booking.sender_name ?? undefined,
          senderPhone: booking.sender_phone ?? undefined,
          senderAddress: booking.sender_address ?? undefined,
          receiverName: booking.receiver_name ?? undefined,
          receiverPhone: booking.receiver_phone ?? undefined,
          receiverAddress: booking.receiver_address ?? undefined,
        }));

        dashboardDB.bookings.splice(0, dashboardDB.bookings.length, ...liveBookings);
        const trackingEvents = dashboardDB.trackingEvents as Record<string, string[][]>;
        Object.keys(trackingEvents).forEach((bookingId) => delete trackingEvents[bookingId]);
        (eventResult.data ?? []).forEach((event) => {
          const eventTime = new Date(event.event_time);
          const formattedTime = Number.isNaN(eventTime.getTime())
            ? event.event_time
            : eventTime.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
          (trackingEvents[event.booking_id] ??= []).push([formattedTime, event.description]);
        });

        const bookingTracking = new Map(bookings.map((booking) => [booking.id, booking.tracking_no]));
        const shipmentLinks = manifestShipmentResult.data || [];
        const liveManifests = (manifestResult.data || []).map((manifest) => ({ id: manifest.id, no: manifest.manifest_no, date: manifest.manifest_date, driver: manifest.driver_name || "Unassigned", vehicle: manifest.vehicle_plate || "Unassigned", route: manifest.route || "", shipments: shipmentLinks.filter((link) => link.manifest_id === manifest.id).map((link) => bookingTracking.get(link.booking_id) || "").filter(Boolean) }));
        dashboardDB.manifests.splice(0, dashboardDB.manifests.length, ...liveManifests);
        setManifests(liveManifests);
        setNextManifestSequence(liveManifests.reduce((highest, manifest) => Math.max(highest, Number(manifest.no.split("/").pop()) || 0), 0) + 1);
        dashboardDB.returns.splice(0, dashboardDB.returns.length, ...(returnResult.data || []).map((returnItem) => ({ id: returnItem.id, tracking: returnItem.tracking_no, customer: returnItem.customer_name || "", reason: returnItem.reason || "", status: returnItem.status as ShipmentReturn["status"], created: returnItem.created_at.slice(0, 10) })));
        dashboardDB.proofOfDelivery = Object.fromEntries((podResult.data || []).map((pod) => [pod.booking_id, { bookingId: pod.booking_id, receivedBy: pod.received_by || "", recordedBy: pod.recorded_by || "", deliveredAt: pod.delivered_at || "", notes: pod.notes || "" }]));
        dashboardDB.drivers.splice(0, dashboardDB.drivers.length, ...(driverResult.data || []).map((driver) => ({ name: driver.name, license: driver.license_no || "", expiry: driver.license_expiry || "", trips: driver.trips_completed || 0, rating: Number(driver.rating) || 0, status: driver.status })));
        const driverNames = new Map((driverResult.data || []).map((driver) => [driver.id, driver.name]));
        dashboardDB.fleet.splice(0, dashboardDB.fleet.length, ...(vehicleResult.data || []).map((vehicle) => ({ plate: vehicle.plate, type: vehicle.type, status: vehicle.status, driver: driverNames.get(vehicle.driver_id) || "Unassigned", service: vehicle.next_service_date || "", fuelL: Number(vehicle.fuel_liters) || 0, insurer: vehicle.insurer || "—" })));

        setShipmentDataError("");
        setShipmentDataState("connected");
        setDispatchRevision((revision) => revision + 1);
      } catch (error) {
        if (!active) return;
        setShipmentDataError(error instanceof Error ? error.message : "Supabase shipment data could not be loaded.");
        setShipmentDataState("demo");
      }
    }

    void loadShipmentData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const closeBookingModal = () => {
    setBookingModalOpen(false);
    setBookingForm(initialBookingForm);
  };

  const closeManifestModal = () => {
    setManifestModalOpen(false);
    setManifestForm(initialManifestForm);
  };

  const updateBookingForm = (field: keyof BookingForm, value: string) => {
    setBookingForm((current) => ({ ...current, [field]: value }));
  };

  const submitBooking = async () => {
    setSavingBooking(true);
    try {
      if (isSimulationMode()) {
        const pickup = bookingForm.pickup || new Date().toISOString().slice(0, 10);
        const booking: Booking = {
          id: `sim-shipment-${Date.now()}`,
          tracking: simulationTrackingNumber(pickup),
          customer: bookingForm.customer,
          origin: bookingForm.origin,
          destination: bookingForm.destination,
          type: bookingForm.type,
          status: "Pending",
          pickup,
          weight: bookingForm.weight || "",
          value: Number(bookingForm.value) || 0,
          notes: "",
        };
        dashboardDB.bookings.unshift(booking);
        const trackingEvents = dashboardDB.trackingEvents as Record<string, string[][]>;
        trackingEvents[booking.id] = [[new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }), "Booking created in simulation"]];
        persistSimulationState(dashboardDB);
        setDispatchRevision((revision) => revision + 1);
        setActiveTab("bookings");
        closeBookingModal();
        setToastMessage(`Simulation: booking created ${booking.tracking}`);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          customer_name: bookingForm.customer,
          origin: bookingForm.origin,
          destination: bookingForm.destination,
          type: bookingForm.type,
          status: "Pending",
          pickup_date: bookingForm.pickup || new Date().toISOString().slice(0, 10),
          weight: bookingForm.weight || null,
          declared_value: Number(bookingForm.value) || 0,
          notes: null,
        })
        .select("id, tracking_no, customer_name, origin, destination, type, status, pickup_date, weight, declared_value, notes")
        .single();

      if (error) throw error;
      const booking: Booking = {
        id: data.id,
        tracking: data.tracking_no,
        customer: data.customer_name,
        origin: data.origin,
        destination: data.destination,
        type: data.type,
        status: data.status,
        pickup: data.pickup_date,
        weight: data.weight ?? "",
        value: Number(data.declared_value) || 0,
        notes: data.notes ?? "",
      };
      dashboardDB.bookings.unshift(booking);
      setDispatchRevision((revision) => revision + 1);
      setActiveTab("bookings");
      closeBookingModal();
      setToastMessage(`Booking created: ${booking.tracking}`);
    } catch (error) {
      setToastMessage(error instanceof Error ? `Booking not saved: ${error.message}` : "Booking could not be saved.");
    } finally {
      setSavingBooking(false);
    }
  };

  async function openInvoiceForBooking(booking: Booking) {
    const existing = dashboardDB.invoices.find((invoice) => invoice.linkedShipment === booking.tracking);
    if (existing) {
      setInvoicePreview(existing);
      return;
    }
    const sequence = dashboardDB.invoices.reduce((highest, invoice) => Math.max(highest, Number(invoice.no.replace("INV-", "")) || 0), 409) + 1;
    if (!isSimulationMode()) {
      try {
        const supabase = createClient();
        const { data: customerRecord, error: customerError } = await supabase.from("customers").select("id").eq("name", booking.customer).maybeSingle();
        if (customerError) throw customerError;
        const no = `INV-${pad(sequence, 5)}`;
        const lineDescription = `${booking.type} freight, ${booking.origin} to ${booking.destination} (${booking.tracking})`;
        const { data: invoiceRow, error } = await supabase.from("invoices").insert({ invoice_no: no, customer_id: customerRecord?.id || null, customer_name: booking.customer, amount: booking.value, status: "Pending", invoice_date: new Date().toISOString().slice(0, 10), linked_booking_id: booking.id }).select("id").single();
        if (error) throw error;
        const { error: itemError } = await supabase.from("invoice_items").insert({ invoice_id: invoiceRow.id, description: lineDescription, amount: booking.value });
        if (itemError) {
          await supabase.from("invoices").delete().eq("id", invoiceRow.id);
          throw itemError;
        }
        const invoice: Invoice = { no, customer: booking.customer, amount: booking.value, status: "Pending", date: new Date().toISOString().slice(0, 10), linkedShipment: booking.tracking, items: [{ desc: lineDescription, amount: booking.value }] };
        dashboardDB.invoices.unshift(invoice);
        setInvoicePreview(invoice);
      } catch (error) {
        setToastMessage(error instanceof Error ? `Invoice not saved: ${error.message}` : "Invoice could not be saved.");
      }
      return;
    }
    const invoice: Invoice = {
      no: `INV-${pad(sequence, 5)}`,
      customer: booking.customer,
      amount: booking.value,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
      linkedShipment: booking.tracking,
      items: [{ desc: `${booking.type} freight, ${booking.origin} to ${booking.destination} (${booking.tracking})`, amount: booking.value }],
    };
    dashboardDB.invoices.unshift(invoice);
    setInvoicePreview(invoice);
    setToastMessage(`Invoice ${invoice.no} generated for ${booking.tracking}`);
  }

  function advanceDispatch(booking: Booking) {
    const nextStage = nextDispatchStage(booking.status as typeof dispatchStages[number]);
    if (nextStage) void updateBookingStatus(booking, nextStage);
  }
  async function updateBookingStatus(booking: Booking, status: string) {
    try {
      if (isSimulationMode()) {
        booking.status = status;
        const trackingEvents = dashboardDB.trackingEvents as Record<string, string[][]>;
        (trackingEvents[booking.id] ??= []).push([
          new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }),
          `Status changed to ${status} in simulation`,
        ]);
        persistSimulationState(dashboardDB);
        setDispatchRevision((revision) => revision + 1);
        setToastMessage(`Simulation: ${booking.tracking} moved to ${status}`);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", booking.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No shipment was updated. Check your access and try again.");

      booking.status = status;
      const { error: eventError } = await supabase.from("tracking_events").insert({
        booking_id: booking.id,
        description: `Status changed to ${status}`,
      });
      if (!eventError) {
        const trackingEvents = dashboardDB.trackingEvents as Record<string, string[][]>;
        (trackingEvents[booking.id] ??= []).push([
          new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }),
          `Status changed to ${status}`,
        ]);
      }
      setDispatchRevision((revision) => revision + 1);
      setToastMessage(eventError
        ? `${booking.tracking} moved to ${status}; the tracking event could not be recorded.`
        : `${booking.tracking} moved to ${status}`);
    } catch (error) {
      setToastMessage(error instanceof Error ? `Shipment update failed: ${error.message}` : "Shipment update failed.");
    }
  }

  function moveDispatch(booking: Booking, stage: typeof dispatchStages[number]) {
    void updateBookingStatus(booking, stage);
  }

  const downloadInvoice = (invoice: Invoice) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(16);
    doc.text(`Invoice ${invoice.no}`, 48, 56);
    doc.setFontSize(10.5);
    doc.text(`Billed to: ${invoice.customer}`, 48, 82);
    doc.text(`Tracking: ${invoice.linkedShipment || "—"}`, 48, 100);
    let y = 140;
    invoice.items.forEach((item) => {
      doc.text(item.desc, 48, y, { maxWidth: 390 });
      doc.text(fmtNaira(item.amount), 547, y, { align: "right" });
      y += 18;
    });
    doc.text(`Total: ${fmtNaira(invoice.amount)}`, 48, y + 18);
    doc.save(`${invoice.no}.pdf`);
  };

  const updateManifestForm = (field: keyof ManifestForm, value: string | string[]) => {
    setManifestForm((current) => ({ ...current, [field]: value }));
  };

  const submitManifest = async () => {
    if (!manifestForm.shipments.length) {
      setToastMessage("Select at least one shipment");
      return;
    }
    if (isSimulationMode()) {
      const date = new Date().toISOString().slice(0, 10);
      const no = manifestNumber(nextManifestSequence, date);
      const manifest: Manifest = {
        no,
        date,
        driver: manifestForm.driver,
        vehicle: manifestForm.vehicle,
        route: manifestForm.route || "Unspecified route",
        shipments: [...manifestForm.shipments],
      };
      dashboardDB.manifests.unshift(manifest);
      manifest.shipments.forEach((tracking) => {
        const booking = dashboardDB.bookings.find((item) => item.tracking === tracking);
        if (booking && booking.status === "Assigned") void updateBookingStatus(booking, "In Transit");
      });
      setManifests([...dashboardDB.manifests]);
      persistSimulationState(dashboardDB);
      setNextManifestSequence((current) => current + 1);
      closeManifestModal();
      setActiveTab("manifests");
      setToastMessage(`Simulation: manifest generated ${no}`);
      return;
    }
    try {
      const supabase = createClient();
      const bookingIds = manifestForm.shipments.map((tracking) => dashboardDB.bookings.find((booking) => booking.tracking === tracking)?.id).filter((id): id is string => Boolean(id));
      const { data, error } = await supabase.rpc("create_manifest_from_bookings", { target_booking_ids: bookingIds, target_driver_name: manifestForm.driver, target_vehicle_plate: manifestForm.vehicle, target_route: manifestForm.route });
      if (error) throw error;
      const manifest: Manifest = { id: data.id, no: data.manifest_no, date: data.manifest_date, driver: data.driver_name || manifestForm.driver, vehicle: data.vehicle_plate || manifestForm.vehicle, route: data.route || manifestForm.route, shipments: [...manifestForm.shipments] };
      dashboardDB.manifests.unshift(manifest);
      manifest.shipments.forEach((tracking) => {
        const booking = dashboardDB.bookings.find((item) => item.tracking === tracking);
        if (!booking) return;
        booking.status = "In Transit";
        (dashboardDB.trackingEvents as Record<string, string[][]>)[booking.id] = [...((dashboardDB.trackingEvents as Record<string, string[][]>)[booking.id] || []), [new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }), `Added to manifest ${manifest.no}`]];
      });
      setManifests([...dashboardDB.manifests]);
      setDispatchRevision((revision) => revision + 1);
      closeManifestModal();
      setActiveTab("manifests");
      setToastMessage(`Manifest generated ${manifest.no}`);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Manifest creation failed.");
    }
  };

  function saveProofOfDelivery(booking: Booking, receivedBy: string, notes: string) {
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase.rpc("record_proof_of_delivery", { target_booking_id: booking.id, receiver_name: receivedBy, delivery_notes: notes });
          if (error) throw error;
          dashboardDB.proofOfDelivery[booking.id] = { bookingId: booking.id, receivedBy: data.received_by || receivedBy, recordedBy: data.recorded_by || "JAAD staff", deliveredAt: data.delivered_at || new Date().toISOString(), notes: data.notes || notes };
          booking.status = "Delivered";
          (dashboardDB.trackingEvents as Record<string, string[][]>)[booking.id] = [...((dashboardDB.trackingEvents as Record<string, string[][]>)[booking.id] || []), [new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }), `Delivered, received by ${receivedBy}`]];
          setDispatchRevision((revision) => revision + 1);
          setToastMessage(`Proof of delivery saved for ${booking.tracking}`);
        } catch (error) { setToastMessage(error instanceof Error ? error.message : "Proof of delivery could not be saved"); }
      })();
      return;
    }
    const now = new Date().toISOString();
    dashboardDB.proofOfDelivery[booking.id] = {
      bookingId: booking.id,
      receivedBy,
      recordedBy: "Simulation staff",
      deliveredAt: now,
      notes,
    };
    persistSimulationState(dashboardDB);
    setDispatchRevision((revision) => revision + 1);
    setToastMessage(`Simulation: proof of delivery saved for ${booking.tracking}`);
  }

  function createReturnRecord(booking: Booking, reason: string) {
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase.from("returns").insert({ booking_id: booking.id, tracking_no: booking.tracking, customer_name: booking.customer, reason, status: "Open" }).select("id, created_at").single();
          if (error) throw error;
          dashboardDB.returns.unshift({ id: data.id, tracking: booking.tracking, customer: booking.customer, reason, status: "Open", created: data.created_at.slice(0, 10) });
          setDispatchRevision((revision) => revision + 1);
          setToastMessage(`Return logged for ${booking.tracking}`);
        } catch (error) { setToastMessage(error instanceof Error ? error.message : "Return could not be logged"); }
      })();
      return;
    }
    dashboardDB.returns.unshift({
      id: `sim-return-${Date.now()}`,
      tracking: booking.tracking,
      customer: booking.customer,
      reason,
      status: "Open",
      created: new Date().toISOString().slice(0, 10),
    });
    persistSimulationState(dashboardDB);
    setDispatchRevision((revision) => revision + 1);
    setToastMessage(`Simulation: return logged for ${booking.tracking}`);
  }

  function updateReturnStatus(returnItem: ShipmentReturn, status: ShipmentReturn["status"]) {
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const { error } = await supabase.from("returns").update({ status }).eq("id", returnItem.id);
          if (error) throw error;
          returnItem.status = status;
          setDispatchRevision((revision) => revision + 1);
          setToastMessage(`Return ${returnItem.tracking} set to ${status}`);
        } catch (error) { setToastMessage(error instanceof Error ? error.message : "Return status could not be updated"); }
      })();
      return;
    }
    returnItem.status = status;
    persistSimulationState(dashboardDB);
    setDispatchRevision((revision) => revision + 1);
    setToastMessage(`Simulation: return ${returnItem.tracking} set to ${status}`);
  }

  return <>
    <div className="view-head">
      <div>
        <h1>Shipment Operations</h1>
        <p>Bookings, dispatch, live tracking and manifests.</p>
      </div>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        {shipmentDataState !== "loading" && <>
        {activeTab === "bookings" && <>
          <button className="btn" onClick={exportBookings}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 19h16" /></svg> Export CSV</button>
          <button className="btn btn-primary" onClick={() => setBookingModalOpen(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg> New booking</button>
        </>}
        {activeTab === "manifests" && <button className="btn btn-primary" onClick={() => setManifestModalOpen(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg> Create manifest</button>}
        </>}
      </div>
    </div>

    <div className="tabs">
      {shipmentTabs.map(([key, label]) => <div className={`tab${activeTab === key ? " active" : ""}`} key={key} onClick={() => setActiveTab(key)}>{label}</div>)}
    </div>

    {shipmentDataState === "loading" ? (
      <div className="empty" role="status">Loading shipment data...</div>
    ) : (
      <>
        {shipmentDataState === "demo" && <div className="note" role="status">{isSimulationMode() ? "Simulation mode: shipment changes stay in local demo data." : `Showing demo shipment data. Live data could not be loaded: ${shipmentDataError}`}</div>}
        {views[activeTab]}
      </>
    )}

    {bookingModalOpen && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeBookingModal(); }}>
      <div className="modal">
        <div className="modal-head"><h3>New booking</h3><button className="x-btn" onClick={closeBookingModal}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>
        <div className="modal-body">
          <div className="field"><label>Customer</label><select value={bookingForm.customer} onChange={(event) => updateBookingForm("customer", event.target.value)}>{bookingCustomers.map((customer) => <option key={customer}>{customer}</option>)}</select></div>
          <div className="field-row"><div className="field"><label>Origin</label><select value={bookingForm.origin} onChange={(event) => updateBookingForm("origin", event.target.value)}>{bookingCities.map((city) => <option key={city}>{city}</option>)}</select></div><div className="field"><label>Destination</label><select value={bookingForm.destination} onChange={(event) => updateBookingForm("destination", event.target.value)}>{bookingCities.map((city) => <option key={city}>{city}</option>)}</select></div></div>
          <div className="field-row"><div className="field"><label>Type</label><select value={bookingForm.type} onChange={(event) => updateBookingForm("type", event.target.value)}><option>Road</option><option>Haulage</option><option>Air</option><option>Sea</option></select></div><div className="field"><label>Pickup date</label><input type="date" value={bookingForm.pickup} onChange={(event) => updateBookingForm("pickup", event.target.value)} /></div></div>
          <div className="field-row"><div className="field"><label>Weight</label><input placeholder="e.g. 2.4t" value={bookingForm.weight} onChange={(event) => updateBookingForm("weight", event.target.value)} /></div><div className="field"><label>Declared value, NGN</label><input type="number" placeholder="e.g. 500000" value={bookingForm.value} onChange={(event) => updateBookingForm("value", event.target.value)} /></div></div>
          <div className="note">Tracking number is generated automatically from the pickup date.</div>
        </div>
        <div className="modal-foot"><button className="btn" onClick={closeBookingModal} disabled={savingBooking}>Cancel</button><button className="btn btn-primary" onClick={submitBooking} disabled={savingBooking}>{savingBooking ? "Saving..." : "Create booking"}</button></div>
      </div>
    </div>}
    {manifestModalOpen && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeManifestModal(); }}>
      <div className="modal">
        <div className="modal-head"><h3>Create manifest</h3><button className="x-btn" onClick={closeManifestModal}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>
        <div className="modal-body">
          <div className="field-row"><div className="field"><label>Driver</label><select value={manifestForm.driver} onChange={(event) => updateManifestForm("driver", event.target.value)}>{dashboardDB.drivers.map((driver) => <option key={driver.name}>{driver.name}</option>)}</select></div><div className="field"><label>Vehicle</label><select value={manifestForm.vehicle} onChange={(event) => updateManifestForm("vehicle", event.target.value)}>{dashboardDB.fleet.map((vehicle) => <option key={vehicle.plate}>{vehicle.plate}</option>)}</select></div></div>
          <div className="field"><label>Route</label><input placeholder="e.g. Lagos to Kano" value={manifestForm.route} onChange={(event) => updateManifestForm("route", event.target.value)} /></div>
          <div className="field"><label>Shipments to include</label>{dashboardDB.bookings.filter((booking) => booking.status === "Assigned" && booking.type === "Haulage").length ? dashboardDB.bookings.filter((booking) => booking.status === "Assigned" && booking.type === "Haulage").map((booking) => <label className="checkbox-row" key={booking.tracking}><input type="checkbox" checked={manifestForm.shipments.includes(booking.tracking)} onChange={(event) => updateManifestForm("shipments", event.target.checked ? [...manifestForm.shipments, booking.tracking] : manifestForm.shipments.filter((tracking) => tracking !== booking.tracking))} /> <span className="mono">{booking.tracking}</span> · {booking.destination}</label>) : <div className="empty">No Haulage shipments in Assigned right now</div>}</div>
        </div>
        <div className="modal-foot"><button className="btn" onClick={closeManifestModal}>Cancel</button><button className="btn btn-primary" onClick={submitManifest}>Generate manifest</button></div>
      </div>
    </div>}
    {invoicePreview && <InvoicePreview invoice={invoicePreview} onClose={() => setInvoicePreview(null)} onDownload={() => downloadInvoice(invoicePreview)} onPrint={() => window.print()} onPost={() => setToastMessage(`Invoice ${invoicePreview.no} posted to ${invoicePreview.customer}`)} />}
    {manifestPreview && <ManifestPreview manifest={manifestPreview} onClose={() => setManifestPreview(null)} />}
    {toastMessage && <div className="toast-wrap"><div className="toast">{toastMessage}</div></div>}
  </>;
}
