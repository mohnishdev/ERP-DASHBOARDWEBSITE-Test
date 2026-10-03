"use client";

import { useEffect, useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { dashboardDB } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/client";
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

  const loadInventory = async () => {
    if (isSimulationMode()) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("inventory_items").select("id, sku, name, qty, reorder_level, location, status").order("sku");
      if (error) throw error;
      setInventory((data || []).map((item) => ({ sku: item.sku, name: item.name, qty: item.qty, reorder: item.reorder_level, loc: item.location || "", status: item.status })));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not load inventory");
    }
  };

  useEffect(() => { queueMicrotask(() => { void loadInventory(); }); }, []);

  const closeModal = () => {
    setModal(null);
    setSelectedSku("");
  };

  const updateStockStatus = async (sku: string, status: string) => {
    const item = inventory.find((entry) => entry.sku === sku);
    if (!item) return;
    if (!isSimulationMode()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("inventory_items").update({ status }).eq("sku", sku);
        if (error) throw error;
        await loadInventory();
        setToast(`${sku} set to ${status}`);
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Could not update stock status");
      }
      return;
    }
    item.status = status;
    persistSimulationState(dashboardDB);
    setInventory([...inventory]);
    setToast(`${sku} set to ${status}`);
    window.setTimeout(() => setToast(""), 2600);
  };

  const saveInventoryForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal) return;

    const form = new FormData(event.currentTarget);
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          if (modal === "item") {
            const sku = String(form.get("sku") || "").trim().toUpperCase();
            const qty = Number(form.get("qty"));
            const reorder = Number(form.get("reorder"));
            const { error } = await supabase.from("inventory_items").insert({ sku, name: String(form.get("name") || "").trim(), qty, reorder_level: reorder, location: String(form.get("loc") || "").trim(), status: qty <= reorder ? "Low stock" : "In stock" });
            if (error) throw error;
          } else {
            const item = inventory.find((entry) => entry.sku === selectedSku);
            if (!item) return;
            const adjustment = Number(form.get("adjustment"));
            const adjustedQty = item.qty + adjustment;
            if (!Number.isInteger(adjustment) || adjustment === 0 || adjustedQty < 0) {
              setToast("Enter a non-zero whole-number adjustment that does not reduce stock below zero.");
              return;
            }
            const { error } = await supabase.from("inventory_items").update({ qty: adjustedQty, status: adjustedQty <= item.reorder ? "Low stock" : "In stock" }).eq("sku", selectedSku);
            if (error) throw error;
          }
          await loadInventory();
          closeModal();
          setToast("Inventory saved");
        } catch (error) {
          setToast(error instanceof Error ? error.message : "Could not save inventory");
        }
      })();
      return;
    }
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
