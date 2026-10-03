"use client";

import { useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { dashboardDB, fmtNaira, type FleetMaintenanceRecord, type FleetInsurancePolicy } from "@/lib/dashboard";
import { isSimulationMode } from "@/lib/supabase/mode";
import { persistSimulationState } from "@/lib/simulation-store";

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
  const [formKind, setFormKind] = useState<"vehicle" | "maintenance" | "insurance" | null>(null);
  const [toast, setToast] = useState("");

  const updateFleetStatus = (plate: string, status: string) => {
    if (!isSimulationMode()) {
      setToast("Fleet status writes are not connected to the live backend yet.");
      return;
    }
    const found = fleet.find((vehicle) => vehicle.plate === plate);
    if (!found) return;
    found.status = status;
    persistSimulationState(dashboardDB);
    setFleet([...fleet]);
    setToast(`${plate} set to ${status}`);
    window.setTimeout(() => setToast(""), 2600);
  };

  const saveFleetForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSimulationMode() || !formKind) {
      setToast("Fleet writes are available in simulation mode only.");
      return;
    }
    const form = new FormData(event.currentTarget);
    if (formKind === "vehicle") {
      const plate = String(form.get("plate") || "").trim().toUpperCase();
      if (!plate || dashboardDB.fleet.some((vehicle) => vehicle.plate === plate)) {
        setToast(plate ? "A vehicle with that plate already exists." : "Vehicle plate is required.");
        return;
      }
      dashboardDB.fleet.unshift({
        plate,
        type: String(form.get("type") || "Truck"),
        status: String(form.get("status") || "Available"),
        driver: String(form.get("driver") || "Unassigned"),
        service: String(form.get("service") || new Date().toISOString().slice(0, 10)),
        fuelL: Number(form.get("fuelL")) || 0,
        insurer: String(form.get("insurer") || "—"),
      });
      setFleet([...dashboardDB.fleet]);
      setToast(`Simulation: vehicle ${plate} added`);
    } else if (formKind === "maintenance") {
      const record: FleetMaintenanceRecord = {
        id: `maintenance-${Date.now()}`,
        plate: String(form.get("plate") || ""),
        description: String(form.get("description") || ""),
        cost: Number(form.get("cost")) || 0,
        date: String(form.get("date") || new Date().toISOString().slice(0, 10)),
        status: String(form.get("status") || "Scheduled") as FleetMaintenanceRecord["status"],
      };
      dashboardDB.fleetMaintenance.unshift(record);
      setToast(`Simulation: maintenance logged for ${record.plate}`);
    } else {
      const policy: FleetInsurancePolicy = {
        id: `insurance-${Date.now()}`,
        plate: String(form.get("plate") || ""),
        insurer: String(form.get("insurer") || ""),
        policyNumber: String(form.get("policyNumber") || ""),
        coverage: String(form.get("coverage") || "Comprehensive"),
        premium: Number(form.get("premium")) || 0,
        startDate: String(form.get("startDate") || ""),
        expiryDate: String(form.get("expiryDate") || ""),
      };
      dashboardDB.fleetInsurance.unshift(policy);
      setToast(`Simulation: insurance added for ${policy.plate}`);
    }
    persistSimulationState(dashboardDB);
    setFormKind(null);
    window.setTimeout(() => setToast(""), 2600);
  };

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
          data={fleet}
        />
      );
    }

    if (activeTab === "maintenance") {
      return (
        <AdminTable
          columns={[
            { key: "plate", label: "Plate" },
            { key: "description", label: "Work" },
            { key: "cost", label: "Cost", render: (record) => fmtNaira(record.cost) },
            { key: "date", label: "Service date", render: (record) => formatDateShort(record.date) },
            { key: "status", label: "Status", render: (record) => statusBadge(record.status) },
          ]}
          data={dashboardDB.fleetMaintenance}
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
          data={fleet}
        />
      );
    }

    return (
      <AdminTable
        columns={[
          { key: "plate", label: "Plate" },
          { key: "insurer", label: "Insurer" },
          { key: "policyNumber", label: "Policy no." },
          { key: "coverage", label: "Coverage" },
          { key: "premium", label: "Premium", render: (policy) => fmtNaira(policy.premium) },
          { key: "expiryDate", label: "Expiry", render: (policy) => formatDateShort(policy.expiryDate) },
        ]}
        data={dashboardDB.fleetInsurance}
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
        {activeTab === "vehicles" && <button className="btn btn-primary" onClick={() => setFormKind("vehicle")}>＋ Add vehicle</button>}
        {activeTab === "maintenance" && <button className="btn btn-primary" onClick={() => setFormKind("maintenance")}>＋ Log maintenance</button>}
        {activeTab === "insurance" && <button className="btn btn-primary" onClick={() => setFormKind("insurance")}>＋ Add policy</button>}
      </div>

      <div className="tabs">
        {fleetTabs.map(([key, label]) => (
          <div key={key} className={`tab${activeTab === key ? " active" : ""}`} onClick={() => setActiveTab(key)}>{label}</div>
        ))}
      </div>

      {renderTabContent()}

      {formKind && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setFormKind(null); }}><form className="modal" onSubmit={saveFleetForm}>
        <div className="modal-head"><h3>{formKind === "vehicle" ? "Add vehicle" : formKind === "maintenance" ? "Log maintenance" : "Add insurance policy"}</h3><button className="x-btn" type="button" onClick={() => setFormKind(null)}>×</button></div>
        <div className="modal-body">
          {formKind === "vehicle" && <>
            <div className="field"><label>Plate</label><input name="plate" required /></div>
            <div className="field-row"><div className="field"><label>Vehicle type</label><input name="type" required /></div><div className="field"><label>Status</label><select name="status" defaultValue="Available">{fleetStatusOptions.map((status) => <option key={status}>{status}</option>)}</select></div></div>
            <div className="field-row"><div className="field"><label>Assigned driver</label><select name="driver" defaultValue="Unassigned"><option>Unassigned</option>{dashboardDB.drivers.map((driver) => <option key={driver.name}>{driver.name}</option>)}</select></div><div className="field"><label>Next service</label><input name="service" type="date" /></div></div>
            <div className="field-row"><div className="field"><label>Fuel litres</label><input name="fuelL" type="number" min="0" defaultValue="0" /></div><div className="field"><label>Insurer</label><input name="insurer" /></div></div>
          </>}
          {formKind === "maintenance" && <>
            <div className="field"><label>Vehicle</label><select name="plate" required>{dashboardDB.fleet.map((vehicle) => <option key={vehicle.plate}>{vehicle.plate}</option>)}</select></div>
            <div className="field"><label>Work description</label><input name="description" required /></div>
            <div className="field-row"><div className="field"><label>Cost, NGN</label><input name="cost" type="number" min="0" defaultValue="0" /></div><div className="field"><label>Service date</label><input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div></div>
            <div className="field"><label>Status</label><select name="status" defaultValue="Scheduled"><option>Scheduled</option><option>In progress</option><option>Complete</option></select></div>
          </>}
          {formKind === "insurance" && <>
            <div className="field"><label>Vehicle</label><select name="plate" required>{dashboardDB.fleet.map((vehicle) => <option key={vehicle.plate}>{vehicle.plate}</option>)}</select></div>
            <div className="field-row"><div className="field"><label>Insurer</label><input name="insurer" required /></div><div className="field"><label>Policy number</label><input name="policyNumber" required /></div></div>
            <div className="field-row"><div className="field"><label>Coverage</label><input name="coverage" defaultValue="Comprehensive" /></div><div className="field"><label>Premium, NGN</label><input name="premium" type="number" min="0" defaultValue="0" /></div></div>
            <div className="field-row"><div className="field"><label>Start date</label><input name="startDate" type="date" required /></div><div className="field"><label>Expiry date</label><input name="expiryDate" type="date" required /></div></div>
          </>}
        </div>
        <div className="modal-foot"><button className="btn" type="button" onClick={() => setFormKind(null)}>Cancel</button><button className="btn btn-primary" type="submit">Save</button></div>
      </form></div>}

      {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
    </>
  );
}
