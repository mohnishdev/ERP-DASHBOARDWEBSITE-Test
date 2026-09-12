"use client";

import { useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { dashboardDB } from "@/lib/dashboard";

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
  const [toast, setToast] = useState("");

  const updateStockStatus = (sku: string, status: string) => {
    const item = inventory.find((entry) => entry.sku === sku);
    if (!item) return;
    item.status = status;
    setInventory([...inventory]);
    setToast(`${sku} set to ${status}`);
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
        ]}
        data={inventory}
      />

      {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
    </>
  );
}
