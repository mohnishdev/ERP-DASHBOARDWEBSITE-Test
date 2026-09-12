"use client";

import { useEffect, useState } from "react";
import { dashboardDB, type Booking } from "@/lib/dashboard";

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
let nextShipmentSequence = 239;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function pad(value: number, length: number) {
  return String(value).padStart(length, "0");
}

function bookingTrackingNumber(date: string) {
  const pickupDate = new Date(`${date}T00:00:00`);
  const tracking = `JAAD/${pad(pickupDate.getDate(), 2)}${pad(pickupDate.getMonth() + 1, 2)}/${pickupDate.getFullYear()}/${pad(nextShipmentSequence, 5)}`;
  nextShipmentSequence += 1;
  return tracking;
}

function bookingId() {
  return `s_${Math.random().toString(36).slice(2, 9)}`;
}

function typeBadge(type: string) {
  return <span className="badge b-gray">{type}</span>;
}

function statusSelect(status: string) {
  const color = shipmentStatusColors[status] || "#888";
  return <select className="switch-select" defaultValue={status} style={{ backgroundColor: `${color}22`, color }} aria-label={`Status: ${status}`}>
    {shipmentStatuses.map((option) => <option value={option} key={option}>{option}</option>)}
  </select>;
}

function ShipmentRow({ booking }: { booking: Booking }) {
  return <tr>
    <td><span className="mono link-cell">{booking.tracking}</span></td>
    <td>{booking.customer}</td>
    <td>{booking.origin} → {booking.destination}</td>
    <td>{typeBadge(booking.type)}</td>
    <td>{formatDate(booking.pickup)}</td>
    <td>{statusSelect(booking.status)}</td>
  </tr>;
}

const dispatchStages = ["Pending", "Assigned", "In Transit", "Delivered"] as const;

function nextDispatchStage(stage: typeof dispatchStages[number]) {
  return { Pending: "Assigned", Assigned: "In Transit", "In Transit": "Delivered", Delivered: undefined }[stage];
}

export function DispatchView() {
  return <>
    <div className="note">Haulage shipments in Assigned can be grouped into a manifest from here.</div>
    <div className="kanban">
      {dispatchStages.map((stage) => {
        const items = dashboardDB.bookings.filter((booking) => booking.status === stage);
        const nextStage = nextDispatchStage(stage);
        return <div className="kcol" key={stage}>
          <div className="kcol-head"><h4>{stage}</h4><span className="badge b-gray">{items.length}</span></div>
          {items.length ? items.map((booking) => <div className="kcard" key={booking.id}>
            <div className="kcard-top"><span className="kcard-name mono" style={{ fontSize: 11.6 }}>{booking.tracking}</span>{typeBadge(booking.type)}</div>
            <div className="kcard-meta">{booking.customer}<br />{booking.origin} → {booking.destination}</div>
            {nextStage && <button className="btn btn-sm" style={{ width: "100%", marginTop: 6 }}>Advance to {nextStage}</button>}
          </div>) : <div className="empty">Nothing here</div>}
        </div>;
      })}
    </div>
  </>;
}

export function TrackingView() {
  return <>
    <div className="field" style={{ maxWidth: 360 }}>
      <label>Tracking number</label>
      <input id="track-input" placeholder="e.g. JAAD/3007/2026/00233" />
    </div>
    <div id="track-result" />
  </>;
}

const mockManifests = [
  { no: "MNF/JAAD/2907/2026/004", date: "2026-07-29", driver: "Musa Bello", vehicle: "ABJ-220-KT", route: "Lagos to Port Harcourt", shipments: ["JAAD/2907/2026/00232"] },
  { no: "MNF/JAAD/3007/2026/005", date: "2026-07-30", driver: "Chidi Okafor", vehicle: "KJA-441-XL", route: "Lagos to Kano", shipments: ["JAAD/3007/2026/00233"] },
];

export function ManifestsView() {
  return <div className="table-wrap">
    <table>
      <thead><tr><th>Manifest no.</th><th>Date</th><th>Driver</th><th>Vehicle</th><th>Route</th><th>Shipments</th></tr></thead>
      <tbody>{mockManifests.map((manifest) => <tr key={manifest.no}>
        <td><span className="mono link-cell">{manifest.no}</span></td>
        <td>{formatDate(manifest.date)}</td>
        <td>{manifest.driver}</td>
        <td>{manifest.vehicle}</td>
        <td>{manifest.route}</td>
        <td>{manifest.shipments.length}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function PODView() {
  const delivered = dashboardDB.bookings.filter((booking) => booking.status === "Delivered");

  return <div className="table-wrap">
    {delivered.length ? <table>
      <thead><tr><th>Tracking no.</th><th>Customer</th><th>Delivered</th><th>Action</th></tr></thead>
      <tbody>{delivered.map((booking) => <tr key={booking.id}>
        <td><span className="mono">{booking.tracking}</span></td>
        <td>{booking.customer}</td>
        <td>{formatDate(booking.pickup)}</td>
        <td><button className="btn btn-sm">View POD</button></td>
      </tr>)}</tbody>
    </table> : <div className="empty">Nothing to show yet</div>}
  </div>;
}

const mockReturns = [
  { tracking: "JAAD/1507/2026/00201", customer: "Ubuntu Foods Ltd", reason: "Wrong item received", status: "Resolved" },
  { tracking: "JAAD/2007/2026/00214", customer: "Nova Retail Group", reason: "Damaged in transit", status: "Open" },
];

function returnStatusSelect(status: string) {
  return <select className={`switch-select st-${status.toLowerCase()}`} defaultValue={status} aria-label={`Return status: ${status}`}>
    {['Open', 'Resolved'].map((option) => <option value={option} key={option}>{option}</option>)}
  </select>;
}

export function ReturnsView() {
  return <div className="table-wrap">
    <table>
      <thead><tr><th>Tracking no.</th><th>Customer</th><th>Reason</th><th>Status</th></tr></thead>
      <tbody>{mockReturns.map((returnItem) => <tr key={returnItem.tracking}>
        <td><span className="mono link-cell">{returnItem.tracking}</span></td>
        <td>{returnItem.customer}</td>
        <td>{returnItem.reason}</td>
        <td>{returnStatusSelect(returnItem.status)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function BookingsView() {
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
        <thead><tr><th>Tracking no.</th><th>Customer</th><th>Route</th><th>Type</th><th>Pickup</th><th>Status</th></tr></thead>
        <tbody>{dashboardDB.bookings.map((booking) => <ShipmentRow booking={booking} key={booking.id} />)}</tbody>
      </table>
    </div>
  </>;
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

const initialBookingForm: BookingForm = {
  customer: bookingCustomers[0],
  origin: bookingCities[0],
  destination: bookingCities[0],
  type: "Road",
  pickup: "2026-08-02",
  weight: "",
  value: "",
};

export function Shipments() {
  const [activeTab, setActiveTab] = useState<(typeof shipmentTabs)[number][0]>("bookings");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingForm>(initialBookingForm);
  const [toastMessage, setToastMessage] = useState("");
  const views = {
    bookings: <BookingsView />,
    dispatch: <DispatchView />,
    tracking: <TrackingView />,
    manifests: <ManifestsView />,
    pod: <PODView />,
    returns: <ReturnsView />,
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const closeBookingModal = () => {
    setBookingModalOpen(false);
    setBookingForm(initialBookingForm);
  };

  const updateBookingForm = (field: keyof BookingForm, value: string) => {
    setBookingForm((current) => ({ ...current, [field]: value }));
  };

  const submitBooking = () => {
    const tracking = bookingTrackingNumber(bookingForm.pickup || "2026-08-02");
    dashboardDB.bookings.unshift({
      id: bookingId(),
      tracking,
      customer: bookingForm.customer,
      origin: bookingForm.origin,
      destination: bookingForm.destination,
      type: bookingForm.type,
      status: "Pending",
      pickup: bookingForm.pickup || "2026-08-02",
      weight: bookingForm.weight || "n/a",
      value: Number(bookingForm.value) || 0,
      notes: "",
    });
    setActiveTab("bookings");
    closeBookingModal();
    setToastMessage(`Booking created: ${tracking}`);
  };

  return <>
    <div className="view-head">
      <div>
        <h1>Shipment Operations</h1>
        <p>Bookings, dispatch, live tracking and manifests.</p>
      </div>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        <button className="btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 19h16" /></svg> Export CSV</button>
        <button className="btn btn-primary" onClick={() => setBookingModalOpen(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg> New booking</button>
      </div>
    </div>

    <div className="tabs">
      {shipmentTabs.map(([key, label]) => <div className={`tab${activeTab === key ? " active" : ""}`} key={key} onClick={() => setActiveTab(key)}>{label}</div>)}
    </div>

    {views[activeTab]}

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
        <div className="modal-foot"><button className="btn" onClick={closeBookingModal}>Cancel</button><button className="btn btn-primary" onClick={submitBooking}>Create booking</button></div>
      </div>
    </div>}
    {toastMessage && <div className="toast-wrap"><div className="toast">{toastMessage}</div></div>}
  </>;
}
