"use client";

import { useState } from "react";
import { AdminTable } from "./AdminTable";
import { dashboardDB, fmtNaira, type Customer, type Lead } from "@/lib/dashboard";

const customerStatuses = ["Active", "On hold", "Inactive"];
const staff = ["Oluwaseun John", "Abidoye Joseph Damilare", "Kelechi Uche", "Fatima Sani"];

function statusBadge(status: string) {
  return <span className={`badge st-${status.toLowerCase().replace(/[^a-z0-9]/g, "")}`}>{status}</span>;
}

function exportCustomers(customers: Customer[]) {
  const headers = ["name", "type", "contact", "credit", "balance", "since", "status"];
  const lines = [headers.join(","), ...customers.map((customer) => headers.map((key) => {
    const value = String(customer[key as keyof Customer] ?? "").replace(/"/g, '""');
    return /[",\n]/.test(value) ? `"${value}"` : value;
  }).join(","))];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "customers.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>(dashboardDB.customers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const refreshCustomers = () => setCustomers([...dashboardDB.customers]);

  const updateStatus = (customer: Customer, status: string) => {
    customer.status = status;
    refreshCustomers();
    showToast(`${customer.name} set to ${status}`);
  };

  const assignStaff = () => {
    const select = document.getElementById("cd-assign-staff") as HTMLSelectElement | null;
    if (!select?.value || !selectedCustomer) {
      showToast("Choose a staff member first");
      return;
    }
    selectedCustomer.assignedTo = select.value;
    refreshCustomers();
    showToast(`${selectedCustomer.name} assigned to ${select.value}`);
  };

  const linkLead = () => {
    const select = document.getElementById("cd-assign-lead") as HTMLSelectElement | null;
    if (!select?.value || !selectedCustomer) {
      showToast("No lead selected");
      return;
    }
    const lead = dashboardDB.leads.find((item) => item.id === select.value) as Lead & { linkedCustomer?: string } | undefined;
    if (!lead) return;
    lead.linkedCustomer = selectedCustomer.name;
    showToast(`${lead.company} assigned to ${selectedCustomer.name}`);
    setSelectedCustomer({ ...selectedCustomer });
  };

  const importLeads = () => {
    if (!selectedLeadIds.length) {
      showToast("Select at least one lead");
      return;
    }
    selectedLeadIds.forEach((id) => {
      const lead = dashboardDB.leads.find((item) => item.id === id);
      if (!lead) return;
      dashboardDB.customers.unshift({ name: lead.company, type: "B2B", contact: `${lead.contactName}, ${lead.phone}`, credit: Math.max(lead.value, 500000), balance: 0, since: String(new Date().getFullYear()), status: "Active" });
    });
    refreshCustomers();
    setSelectedLeadIds([]);
    setImportOpen(false);
    showToast(`${selectedLeadIds.length} customer(s) imported`);
  };

  const linkedLeads = selectedCustomer ? dashboardDB.leads.filter((lead) => (lead as Lead & { linkedCustomer?: string }).company === selectedCustomer.name || (lead as Lead & { linkedCustomer?: string }).linkedCustomer === selectedCustomer.name) : [];
  const availableLeads = selectedCustomer ? dashboardDB.leads.filter((lead) => !(lead as Lead & { linkedCustomer?: string }).linkedCustomer && lead.company !== selectedCustomer.name) : [];
  const importableLeads = dashboardDB.leads.filter((lead) => lead.status === "Won" && !dashboardDB.customers.some((customer) => customer.name === lead.company));

  return <>
    <div className="view-head"><div><h1>Customer Management</h1><p>Accounts, contracts, documents and credit exposure.</p></div><div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><button className="btn" onClick={() => exportCustomers(customers)}>↓ Export CSV</button><button className="btn" onClick={() => setImportOpen(true)}>Import from leads</button><button className="btn btn-primary" onClick={() => showToast("New account form is a stub in this prototype")}>＋ New account</button></div></div>
    <AdminTable<Customer> columns={[{ key: "name", label: "Account", render: (customer) => <span className="link-cell" onClick={() => setSelectedCustomer(customer)}>{customer.name}</span> }, { key: "type", label: "Type", render: (customer) => <span className="badge b-gray">{customer.type}</span> }, { key: "contact", label: "Contact" }, { key: "credit", label: "Credit limit", render: (customer) => fmtNaira(customer.credit) }, { key: "balance", label: "Balance", render: (customer) => customer.balance ? fmtNaira(customer.balance) : "—" }, { key: "since", label: "Client since" }, { key: "status", label: "Status", render: (customer) => <select className={`switch-select st-${customer.status.toLowerCase().replace(/[^a-z0-9]/g, "")}`} value={customer.status} onChange={(event) => updateStatus(customer, event.target.value)} aria-label={`Status: ${customer.status}`}>{customerStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={customers} />
    {selectedCustomer && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setSelectedCustomer(null); }}><div className="modal wide"><div className="modal-head"><h3>{selectedCustomer.name}</h3><button className="x-btn" onClick={() => setSelectedCustomer(null)}>×</button></div><div className="modal-body"><div className="doc-grid"><div><div className="lbl">Type</div>{selectedCustomer.type}<br /><div className="lbl" style={{ marginTop: 8 }}>Contact</div>{selectedCustomer.contact}</div><div style={{ textAlign: "right" }}><div className="lbl">Client since</div>{selectedCustomer.since}<br /><div className="lbl" style={{ marginTop: 8 }}>Status</div><select className={`switch-select st-${selectedCustomer.status.toLowerCase().replace(/[^a-z0-9]/g, "")}`} value={selectedCustomer.status} onChange={(event) => updateStatus(selectedCustomer, event.target.value)}>{customerStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select></div></div><div className="doc-grid"><div><div className="lbl">Credit limit</div>{fmtNaira(selectedCustomer.credit)}</div><div style={{ textAlign: "right" }}><div className="lbl">Outstanding balance</div>{selectedCustomer.balance ? fmtNaira(selectedCustomer.balance) : "—"}</div></div><div className="form-section-title">Account owner</div><div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>{selectedCustomer.assignedTo ? <span style={{ fontSize: 12.4 }}>Currently: <b>{selectedCustomer.assignedTo}</b></span> : <span style={{ fontSize: 12.4, color: "var(--text-faint)" }}>Not yet assigned</span>}</div><div style={{ display: "flex", gap: 8 }}><select id="cd-assign-staff" style={{ flex: 1 }}><option value="">Choose a staff member</option>{staff.map((name) => <option value={name} key={name}>{name}</option>)}</select><button className="btn btn-sm" onClick={assignStaff}>Assign</button></div><div className="form-section-title">Related leads</div>{linkedLeads.length ? linkedLeads.map((lead) => <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: "1px solid var(--border)", fontSize: 12.4 }} key={lead.id}><span className="link-cell">{lead.contactName}</span>{statusBadge(lead.status)}</div>) : <div className="empty">No leads linked yet</div>}<div style={{ display: "flex", gap: 8, marginTop: 12 }}><select id="cd-assign-lead" style={{ flex: 1 }}><option value="">{availableLeads.length ? "Choose a lead" : "No other leads available"}</option>{availableLeads.map((lead) => <option value={lead.id} key={lead.id}>{lead.company}, {lead.contactName}</option>)}</select><button className="btn btn-sm" onClick={linkLead}>Link lead</button></div></div><div className="modal-foot"><button className="btn" onClick={() => setSelectedCustomer(null)}>Close</button></div></div></div>}
    {importOpen && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setImportOpen(false); }}><div className="modal"><div className="modal-head"><h3>Import from leads</h3><button className="x-btn" onClick={() => setImportOpen(false)}>×</button></div><div className="modal-body"><p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 0 }}>Leads marked Won become customer accounts.</p>{importableLeads.length ? importableLeads.map((lead) => <label className="checkbox-row" key={lead.id}><input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={(event) => setSelectedLeadIds(event.target.checked ? [...selectedLeadIds, lead.id] : selectedLeadIds.filter((id) => id !== lead.id))} /> <span>{lead.company}</span> · {lead.contactName}</label>) : <div className="empty">No Won leads waiting to be imported</div>}</div><div className="modal-foot"><button className="btn" onClick={() => setImportOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={importLeads}>Import selected</button></div></div></div>}
    {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
  </>;
}
