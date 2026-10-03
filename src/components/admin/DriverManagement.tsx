"use client";

import { useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { dashboardDB } from "@/lib/dashboard";
import { isSimulationMode } from "@/lib/supabase/mode";
import { persistSimulationState } from "@/lib/simulation-store";

const driverTabs = [
  ["profiles", "Profiles"],
  ["performance", "Performance"],
] as const;

const driverStatusOptions = ["Available", "On trip", "Off duty"] as const;

function formatDateShort(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusSelect(value: string, name: string, onChange: (name: string, status: string) => void) {
  const colorMap: Record<string, string> = {
    Available: "#1f9d5c",
    "On trip": "#2563c7",
    "Off duty": "#63676f",
  };

  const color = colorMap[value] || "#888";

  return (
    <select
      className="switch-select"
      value={value}
      style={{ backgroundColor: `${color}22`, color }}
      aria-label={`Status: ${value}`}
      onChange={(event) => onChange(name, event.target.value)}
    >
      {driverStatusOptions.map((option) => (
        <option value={option} key={option}>{option}</option>
      ))}
    </select>
  );
}

function starRow(name: string, rating: number, onRate: (name: string, value: number) => void) {
  const rounded = Math.round(rating);
  const stars = Array.from({ length: 5 }, (_, index) => {
    const starValue = index + 1;
    return (
      <span
        key={starValue}
        onClick={(event) => {
          event.stopPropagation();
          onRate(name, starValue);
        }}
        style={{ cursor: "pointer", color: starValue <= rounded ? "#f2b705" : "var(--border)", fontSize: 15 }}
      >
        ★
      </span>
    );
  });

  return (
    <span>
      <span style={{ fontSize: 11, color: "var(--text-faint)", marginRight: 6 }}>{rating.toFixed(1)}</span>
      {stars}
    </span>
  );
}

export function DriverManagement() {
  const [activeTab, setActiveTab] = useState<(typeof driverTabs)[number][0]>("profiles");
  const [drivers, setDrivers] = useState(dashboardDB.drivers);
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [toast, setToast] = useState("");

  const updateDriverStatus = (name: string, status: string) => {
    if (!isSimulationMode()) {
      setToast("Driver status writes are not connected to the live backend yet.");
      return;
    }
    const driver = drivers.find((item) => item.name === name);
    if (!driver) return;
    driver.status = status;
    persistSimulationState(dashboardDB);
    setDrivers([...drivers]);
    setToast(`${name} set to ${status}`);
    window.setTimeout(() => setToast(""), 2600);
  };

  const setDriverRating = (name: string, rating: number) => {
    if (!isSimulationMode()) {
      setToast("Driver ratings are not connected to the live backend yet.");
      return;
    }
    const driver = drivers.find((item) => item.name === name);
    if (!driver) return;
    driver.rating = rating;
    persistSimulationState(dashboardDB);
    setDrivers([...drivers]);
    setToast(`${name} rated ${rating} stars`);
    window.setTimeout(() => setToast(""), 2600);
  };

  const createDriver = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSimulationMode()) {
      setToast("Driver creation is available in simulation mode only.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name || dashboardDB.drivers.some((driver) => driver.name.toLowerCase() === name.toLowerCase())) {
      setToast(name ? "A driver with that name already exists." : "Driver name is required.");
      return;
    }
    dashboardDB.drivers.push({
      name,
      license: String(form.get("license") || ""),
      expiry: String(form.get("expiry") || ""),
      trips: 0,
      rating: 0,
      status: String(form.get("status") || "Available"),
    });
    persistSimulationState(dashboardDB);
    setDrivers([...dashboardDB.drivers]);
    setAddDriverOpen(false);
    setToast(`Simulation: driver ${name} added`);
    window.setTimeout(() => setToast(""), 2600);
  };

  return (
    <>
      <div className="view-head">
        <div>
          <h1>Driver Management</h1>
          <p>Profiles, licences and performance.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddDriverOpen(true)}>＋ Add driver</button>
      </div>

      <div className="tabs">
        {driverTabs.map(([key, label]) => (
          <div key={key} className={`tab${activeTab === key ? " active" : ""}`} onClick={() => setActiveTab(key)}>{label}</div>
        ))}
      </div>

      {activeTab === "profiles" ? (
        <AdminTable
          columns={[
            { key: "name", label: "Name" },
            { key: "license", label: "Licence no." },
            { key: "expiry", label: "Expiry", render: (driver) => formatDateShort(driver.expiry) },
            { key: "status", label: "Status", render: (driver) => statusSelect(driver.status, driver.name, updateDriverStatus) },
          ]}
          data={drivers}
        />
      ) : (
        <>
          <div className="note">Ratings are set by the ops team based on trip feedback and punctuality. Click a star to update a driver’s rating.</div>
          <AdminTable
            columns={[
              { key: "name", label: "Name" },
              { key: "trips", label: "Trips completed" },
              { key: "rating", label: "Rating", render: (driver) => starRow(driver.name, driver.rating, setDriverRating) },
            ]}
            data={drivers}
          />
        </>
      )}

      {addDriverOpen && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setAddDriverOpen(false); }}><form className="modal" onSubmit={createDriver}><div className="modal-head"><h3>Add driver</h3><button className="x-btn" type="button" onClick={() => setAddDriverOpen(false)}>×</button></div><div className="modal-body"><div className="field"><label>Full name</label><input name="name" required /></div><div className="field"><label>Licence number</label><input name="license" required /></div><div className="field-row"><div className="field"><label>Licence expiry</label><input name="expiry" type="date" required /></div><div className="field"><label>Status</label><select name="status" defaultValue="Available">{driverStatusOptions.map((status) => <option key={status}>{status}</option>)}</select></div></div></div><div className="modal-foot"><button className="btn" type="button" onClick={() => setAddDriverOpen(false)}>Cancel</button><button className="btn btn-primary" type="submit">Add driver</button></div></form></div>}

      {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
    </>
  );
}
