"use client";

import { useEffect, useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { dashboardDB, fmtNaira, type FleetMaintenanceRecord, type FleetInsurancePolicy } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/client";
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
  const [maintenanceRecords, setMaintenanceRecords] = useState(dashboardDB.fleetMaintenance);
  const [insurancePolicies, setInsurancePolicies] = useState(dashboardDB.fleetInsurance);
  const [formKind, setFormKind] = useState<"vehicle" | "maintenance" | "insurance" | null>(null);
  const [toast, setToast] = useState("");

  const loadFleetData = async () => {
    if (isSimulationMode()) return;
    try {
      const supabase = createClient();
      const [{ data: vehicles, error: vehicleError }, { data: drivers, error: driverError }, { data: maintenance, error: maintenanceError }, { data: insurance, error: insuranceError }] = await Promise.all([
        supabase.from("fleet_vehicles").select("id, plate, type, status, driver_id, next_service_date, fuel_liters, insurer").order("plate"),
        supabase.from("drivers").select("id, name"),
        supabase.from("fleet_maintenance").select("id, vehicle_id, description, cost, service_date, status"),
        supabase.from("fleet_insurance").select("id, vehicle_id, insurer, policy_number, coverage_type, premium, start_date, expiry_date"),
      ]);
      const queryError = vehicleError || driverError || maintenanceError || insuranceError;
      if (queryError) throw queryError;
      const driversById = new Map((drivers || []).map((driver) => [driver.id, driver.name]));
      const vehiclesById = new Map((vehicles || []).map((vehicle) => [vehicle.id, vehicle.plate]));
      setFleet((vehicles || []).map((vehicle) => ({ plate: vehicle.plate, type: vehicle.type, status: vehicle.status, driver: driversById.get(vehicle.driver_id) || "Unassigned", service: vehicle.next_service_date || "", fuelL: Number(vehicle.fuel_liters) || 0, insurer: vehicle.insurer || "—" })));
      setMaintenanceRecords((maintenance || []).map((record) => ({ id: record.id, plate: vehiclesById.get(record.vehicle_id) || "Unknown", description: record.description, cost: Number(record.cost) || 0, date: record.service_date, status: record.status as FleetMaintenanceRecord["status"] })));
      setInsurancePolicies((insurance || []).map((policy) => ({ id: policy.id, plate: vehiclesById.get(policy.vehicle_id) || "Unknown", insurer: policy.insurer, policyNumber: policy.policy_number, coverage: policy.coverage_type || "", premium: Number(policy.premium) || 0, startDate: policy.start_date || "", expiryDate: policy.expiry_date || "" })));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not load fleet data");
    }
  };

  useEffect(() => { queueMicrotask(() => { void loadFleetData(); }); }, []);

  const updateFleetStatus = async (plate: string, status: string) => {
    const found = fleet.find((vehicle) => vehicle.plate === plate);
    if (!found) return;
    if (!isSimulationMode()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("fleet_vehicles").update({ status }).eq("plate", plate);
        if (error) throw error;
        await loadFleetData();
        setToast(`${plate} set to ${status}`);
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Could not update vehicle status");
      }
      return;
    }
    found.status = status;
    persistSimulationState(dashboardDB);
    setFleet([...fleet]);
    setToast(`${plate} set to ${status}`);
    window.setTimeout(() => setToast(""), 2600);
  };

  const saveFleetForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formKind) return;
    const form = new FormData(event.currentTarget);
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const plate = String(form.get("plate") || "").trim().toUpperCase();
          const driverName = String(form.get("driver") || "");
          const { data: vehicle, error: vehicleError } = await supabase.from("fleet_vehicles").select("id").eq("plate", plate).maybeSingle();
          if (formKind !== "vehicle" && (vehicleError || !vehicle)) throw vehicleError || new Error("Choose a valid vehicle");

          if (formKind === "vehicle") {
            let driverId: string | null = null;
            if (driverName && driverName !== "Unassigned") {
              const { data: driver, error } = await supabase.from("drivers").select("id").eq("name", driverName).maybeSingle();
              if (error) throw error;
              driverId = driver?.id || null;
            }
            const { error } = await supabase.from("fleet_vehicles").insert({ plate, type: String(form.get("type") || "Truck"), status: String(form.get("status") || "Available"), driver_id: driverId, next_service_date: String(form.get("service") || "") || null, fuel_liters: Number(form.get("fuelL")) || 0, insurer: String(form.get("insurer") || "") || null });
            if (error) throw error;
          } else if (formKind === "maintenance") {
            const { error } = await supabase.from("fleet_maintenance").insert({ vehicle_id: vehicle?.id, description: String(form.get("description") || "").trim(), cost: Number(form.get("cost")) || 0, service_date: String(form.get("date") || new Date().toISOString().slice(0, 10)), status: String(form.get("status") || "Scheduled") });
            if (error) throw error;
          } else {
            const { error } = await supabase.from("fleet_insurance").insert({ vehicle_id: vehicle?.id, insurer: String(form.get("insurer") || "").trim(), policy_number: String(form.get("policyNumber") || "").trim(), coverage_type: String(form.get("coverage") || "Comprehensive"), premium: Number(form.get("premium")) || 0, start_date: String(form.get("startDate") || "") || null, expiry_date: String(form.get("expiryDate") || "") || null });
            if (error) throw error;
          }
          await loadFleetData();
          setFormKind(null);
          setToast("Fleet record saved");
        } catch (error) {
          setToast(error instanceof Error ? error.message : "Could not save fleet record");
        }
      })();
      return;
    }
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
          data={maintenanceRecords}
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
        data={insurancePolicies}
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
