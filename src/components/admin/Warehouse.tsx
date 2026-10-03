"use client";

import { useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { dashboardDB } from "@/lib/dashboard";
import { isSimulationMode } from "@/lib/supabase/mode";
import { persistSimulationState } from "@/lib/simulation-store";

const stockStatusOptions = ["In stock", "Low stock"] as const;

function stockStatusSelect(value: string, sku: string, onChange: (sku: string, status: string) => void) {
  const colorMap: Record<string, string> = {
    "In stock": "#1f9d5c",
    "Low stock": "#e2362b",
  };

  const color = colorMap[value] || "#888";

  return (
    <select
      className="switch-select"
      value={value}
      style={{ backgroundColor: `${color}22`, color }}
      aria-label={`Status: ${value}`}
      onChange={(event) => onChange(sku, event.target.value)}
    >
      {stockStatusOptions.map((option) => (
        <option value={option} key={option}>{option}</option>
      ))}
    </select>
  );
}

export function Warehouse() {
  const [inventory, setInventory] = useState(dashboardDB.inventory);
  const [modal, setModal] = useState<"item" | "adjust" | null>(null);
  const [selectedSku, setSelectedSku] = useState("");
  const [toast, setToast] = useState("");

  const closeModal = () => {
    setModal(null);
    setSelectedSku("");
  };

  const updateStockStatus = (sku: string, status: string) => {
    if (!isSimulationMode()) {
      setToast("Inventory writes are not connected to the live backend yet.");
      return;
    }
    const item = inventory.find((entry) => entry.sku === sku);
    if (!item) return;
    item.status = status;
    persistSimulationState(dashboardDB);
    setInventory([...inventory]);
    setToast(`${sku} set to ${status}`);
    window.setTimeout(() => setToast(""), 2600);
  };

  const saveInventoryForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSimulationMode() || !modal) {
      setToast("Inventory writes are available in simulation mode only.");
      return;
    }

    const form = new FormData(event.currentTarget);
    if (modal === "item") {
      const sku = String(form.get("sku") || "").trim().toUpperCase();
      const name = String(form.get("name") || "").trim();
      const qty = Number(form.get("qty"));
      const reorder = Number(form.get("reorder"));
      if (dashboardDB.inventory.some((item) => item.sku.toLowerCase() === sku.toLowerCase())) {
        setToast("An item with that SKU already exists.");
        return;
      }
      dashboardDB.inventory.unshift({
        sku,
        name,
        qty,
        reorder,
        loc: String(form.get("loc") || "").trim(),
        status: qty <= reorder ? "Low stock" : "In stock",
      });
      setToast(`Simulation: ${sku} added to inventory`);
    } else {
      const item = dashboardDB.inventory.find((entry) => entry.sku === selectedSku);
      if (!item) return;
      const adjustment = Number(form.get("adjustment"));
      const adjustedQty = item.qty + adjustment;
      if (!Number.isInteger(adjustment) || adjustment === 0 || adjustedQty < 0) {
        setToast("Enter a non-zero whole-number adjustment that does not reduce stock below zero.");
        return;
      }
      item.qty = adjustedQty;
      item.status = item.qty <= item.reorder ? "Low stock" : "In stock";
      setToast(`${item.sku} quantity updated to ${item.qty}`);
    }

    persistSimulationState(dashboardDB);
    setInventory([...dashboardDB.inventory]);
    closeModal();
    window.setTimeout(() => setToast(""), 2600);
  };

  return (
    <>
      <div className="view-head">
        <div>
          <h1>Warehouse</h1>
          <p>Inventory and stock levels. Purchase orders now live in Finance.</p>
        </div>
      </div>

      <AdminTable
        columns={[
          { key: "sku", label: "SKU" },
          { key: "name", label: "Item" },
          { key: "qty", label: "Quantity" },
          { key: "reorder", label: "Reorder level" },
          { key: "loc", label: "Location" },
          { key: "status", label: "Status", render: (item) => stockStatusSelect(item.status, item.sku, updateStockStatus) },
          { key: "sku", label: "Actions", render: (item) => <button className="btn btn-sm" onClick={() => { setSelectedSku(item.sku); setModal("adjust"); }}>Adjust stock</button> },
        ]}
        data={inventory}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><button className="btn btn-primary" onClick={() => setModal("item")}>＋ Add inventory item</button></div>

      {modal && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}><form className="modal" onSubmit={saveInventoryForm}>
        <div className="modal-head"><h3>{modal === "item" ? "Add inventory item" : `Adjust stock · ${selectedSku}`}</h3><button className="x-btn" type="button" onClick={closeModal}>×</button></div>
        <div className="modal-body">
          {modal === "item" ? <>
            <div className="field-row"><div className="field"><label>SKU</label><input name="sku" required /></div><div className="field"><label>Item name</label><input name="name" required /></div></div>
            <div className="field-row"><div className="field"><label>Opening quantity</label><input name="qty" type="number" min="0" step="1" required defaultValue="0" /></div><div className="field"><label>Reorder level</label><input name="reorder" type="number" min="0" step="1" required defaultValue="0" /></div></div>
            <div className="field"><label>Location</label><input name="loc" required /></div>
          </> : <>
            <div className="field"><label>Quantity adjustment</label><input name="adjustment" type="number" step="1" required placeholder="Use a negative number to remove stock" /></div>
            <div className="note">Current quantity: {dashboardDB.inventory.find((item) => item.sku === selectedSku)?.qty ?? 0}. Low-stock status updates automatically from the reorder level.</div>
          </>}
        </div>
        <div className="modal-foot"><button className="btn" type="button" onClick={closeModal}>Cancel</button><button className="btn btn-primary" type="submit">Save</button></div>
      </form></div>}

      {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
    </>
  );
}
