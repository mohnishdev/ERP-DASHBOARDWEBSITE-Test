"use client";

import { useMemo, useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { dashboardDB, fmtNaira } from "@/lib/dashboard";

const fleetTabs = [
  ["vehicles", "Vehicles"],
  ["maintenance", "Maintenance"],
  ["fuel", "Fuel"],
  ["insurance", "Insurance"],
] as const;

const fleetStatusOptions = ["Available", "In Transit", "Maintenance", "Out of service", "Idle"] as const;
const fleetStatusColors: Record<string, string> = {
  Available: "#1f9d5c",
  "In Transit": "#2563c7",
  Maintenance: "#ca8a04",
  "Out of service": "#e2362b",
  Idle: "#63676f",
};

function statusBadge(status: string) {
  const color = fleetStatusColors[status] || "#888";
  return <span className="badge" style={{ background: `${color}22`, color }}><span className="dot" />{status}</span>;
}

function formatDateShort(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusSelect(value: string, plate: string, onChange: (plate: string, status: string) => void) {
  const color = fleetStatusColors[value] || "#888";
  return (
    <select
      className="switch-select"
      value={value}
      style={{ backgroundColor: `${color}22`, color }}
      aria-label={`Status: ${value}`}
      onChange={(event) => onChange(plate, event.target.value)}
    >
      {fleetStatusOptions.map((option) => (
        <option value={option} key={option}>{option}</option>
      ))}
    </select>
  );
}

export function Fleet() {
  const [activeTab, setActiveTab] = useState<(typeof fleetTabs)[number][0]>("vehicles");
  const [fleet, setFleet] = useState(dashboardDB.fleet);
  const [toast, setToast] = useState("");

  const updateFleetStatus = (plate: string, status: string) => {
    const found = fleet.find((vehicle) => vehicle.plate === plate);
    if (!found) return;
    found.status = status;
    setFleet([...fleet]);
    setToast(`${plate} set to ${status}`);
    window.setTimeout(() => setToast(""), 2600);
  };

  const fleetData = useMemo(() => fleet, [fleet]);

  const renderTabContent = () => {
    if (activeTab === "vehicles") {
      return (
        <AdminTable
          columns={[
            { key: "plate", label: "Plate" },
            { key: "type", label: "Type" },
            { key: "status", label: "Status", render: (vehicle) => statusSelect(vehicle.status, vehicle.plate, updateFleetStatus) },
            { key: "driver", label: "Driver" },
            { key: "service", label: "Next service", render: (vehicle) => formatDateShort(vehicle.service) },
          ]}
          data={fleetData}
        />
      );
    }

    if (activeTab === "maintenance") {
      return (
        <AdminTable
          columns={[
            { key: "plate", label: "Plate" },
            { key: "service", label: "Due date", render: (vehicle) => formatDateShort(vehicle.service) },
            { key: "status", label: "Status", render: (vehicle) => statusBadge(vehicle.status) },
          ]}
          data={fleetData}
        />
      );
    }

    if (activeTab === "fuel") {
      return (
        <AdminTable
          columns={[
            { key: "plate", label: "Plate" },
            { key: "fuelL", label: "Litres this month", render: (vehicle) => `${vehicle.fuelL}L` },
            { key: "fuelL", label: "Est. cost", render: (vehicle) => fmtNaira(vehicle.fuelL * 950) },
          ]}
          data={fleetData}
        />
      );
    }

    return (
      <AdminTable
        columns={[
          { key: "plate", label: "Plate" },
          { key: "insurer", label: "Insurer" },
          { key: "service", label: "Expiry", render: (vehicle) => formatDateShort(vehicle.service) },
        ]}
        data={fleetData}
      />
    );
  };

  return (
    <>
      <div className="view-head">
        <div>
          <h1>Fleet</h1>
          <p>Vehicles, maintenance, fuel and insurance.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setToast("Add vehicle form is a stub in this prototype")}>＋ Add vehicle</button>
      </div>

      <div className="tabs">
        {fleetTabs.map(([key, label]) => (
          <div key={key} className={`tab${activeTab === key ? " active" : ""}`} onClick={() => setActiveTab(key)}>{label}</div>
        ))}
      </div>

      {renderTabContent()}

      {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
    </>
  );
}
