"use client";

import { useEffect, useState } from "react";
import { AdminTable } from "./AdminTable";
import { dashboardDB, fmtNaira, type Customer, type Lead } from "@/lib/dashboard";
import { useNavigate } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { isSimulationMode } from "@/lib/supabase/mode";
import { persistSimulationState } from "@/lib/simulation-store";

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
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>(dashboardDB.customers);
  const [customerDataState, setCustomerDataState] = useState<"loading" | "connected" | "demo">("loading");
  const [customerDataError, setCustomerDataError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const refreshCustomers = () => setCustomers([...dashboardDB.customers]);

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      try {
        const { data, error } = await createClient()
          .from("customers")
          .select("id, name, type, contact, email, phone, credit_limit, balance, status, client_since")
          .order("name", { ascending: true });
        if (error) throw error;
        if (!active) return;

        const liveCustomers: Customer[] = (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          contact: row.contact || row.phone || row.email || "",
          email: row.email || "",
          credit: Number(row.credit_limit) || 0,
          balance: Number(row.balance) || 0,
          since: row.client_since || "",
          status: row.status,
        }));
        dashboardDB.customers.splice(0, dashboardDB.customers.length, ...liveCustomers);
        setCustomers(liveCustomers);
        setCustomerDataError("");
        setCustomerDataState("connected");
      } catch (error) {
        if (!active) return;
        setCustomerDataError(error instanceof Error ? error.message : "Supabase customer data could not be loaded.");
        setCustomerDataState("demo");
      }
    }

    void loadCustomers();
    return () => {
      active = false;
    };
  }, []);

  const updateStatus = async (customer: Customer, status: string) => {
    if (customerDataState === "connected" && customer.id) {
      const { error } = await createClient().from("customers").update({ status }).eq("id", customer.id);
      if (error) {
        showToast(`Could not update ${customer.name}: ${error.message}`);
        return;
      }
    } else if (!isSimulationMode()) {
      showToast("Customer data is offline; status was not changed.");
      return;
    }
    customer.status = status;
    if (isSimulationMode()) persistSimulationState(dashboardDB);
    refreshCustomers();
    showToast(`${customer.name} set to ${status}`);
  };

  const assignStaff = () => {
    if (customerDataState === "connected") {
      const select = document.getElementById("cd-assign-staff") as HTMLSelectElement | null;
      if (!select?.value || !selectedCustomer?.id) { showToast("Choose a customer and active staff member first"); return; }
      void (async () => {
        try {
          const { error } = await createClient().rpc("assign_customer_staff", { target_customer_id: selectedCustomer.id, target_staff_name: select.value });
          if (error) throw error;
          const updated = { ...selectedCustomer, assignedTo: select.value };
          const next = customers.map((customer) => customer.id === updated.id ? updated : customer);
          dashboardDB.customers.splice(0, dashboardDB.customers.length, ...next);
          setCustomers(next);
          setSelectedCustomer(updated);
          showToast(`${updated.name} assigned to ${select.value}`);
        } catch (error) { showToast(error instanceof Error ? error.message : "Could not assign staff member"); }
      })();
      return;
    }
    const select = document.getElementById("cd-assign-staff") as HTMLSelectElement | null;
    if (!select?.value || !selectedCustomer) {
      showToast("Choose a staff member first");
      return;
    }
    // eslint-disable-next-line react-hooks/immutability -- selectedCustomer is a shared reference into dashboardDB.customers
    selectedCustomer.assignedTo = select.value;
    persistSimulationState(dashboardDB);
    refreshCustomers();
    showToast(`${selectedCustomer.name} assigned to ${select.value}`);
  };

  const linkLead = () => {
    if (customerDataState === "connected") {
      const select = document.getElementById("cd-assign-lead") as HTMLSelectElement | null;
      if (!select?.value || !selectedCustomer?.id) { showToast("Choose a lead to link"); return; }
      void (async () => {
        try {
          const { error } = await createClient().rpc("link_lead_to_customer", { target_lead_id: select.value, target_customer_id: selectedCustomer.id });
          if (error) throw error;
          const lead = dashboardDB.leads.find((item) => item.id === select.value);
          if (lead) {
            lead.linkedCustomer = selectedCustomer.name;
            lead.linkedCustomerId = selectedCustomer.id;
            lead.status = "Won";
          }
          showToast(`${lead?.company || "Lead"} linked to ${selectedCustomer.name}`);
        } catch (error) { showToast(error instanceof Error ? error.message : "Could not link lead"); }
      })();
      return;
    }
    const select = document.getElementById("cd-assign-lead") as HTMLSelectElement | null;
    if (!select?.value || !selectedCustomer) {
      showToast("No lead selected");
      return;
    }
    const lead = dashboardDB.leads.find((item) => item.id === select.value) as Lead & { linkedCustomer?: string } | undefined;
    if (!lead) return;
    lead.linkedCustomer = selectedCustomer.name;
    lead.linkedCustomerId = selectedCustomer.id ?? selectedCustomer.name;
    lead.status = "Won";
    persistSimulationState(dashboardDB);
    showToast(`${lead.company} assigned to ${selectedCustomer.name}`);
    setSelectedCustomer({ ...selectedCustomer });
    setCustomers([...dashboardDB.customers]);
  };

  const importLeads = () => {
    if (customerDataState === "connected") {
      if (!selectedLeadIds.length) { showToast("Select at least one lead"); return; }
      void (async () => {
        try {
          const supabase = createClient();
          for (const id of selectedLeadIds) {
            const { error } = await supabase.rpc("convert_lead_to_customer", { target_lead_id: id });
            if (error) throw error;
          }
          const { data, error } = await supabase.from("customers").select("id, name, type, contact, email, phone, credit_limit, balance, status, client_since, assigned_to").order("name");
          if (error) throw error;
          const refreshed: Customer[] = (data || []).map((row) => ({ id: row.id, name: row.name, type: row.type, contact: row.contact || row.phone || row.email || "", email: row.email || "", credit: Number(row.credit_limit) || 0, balance: Number(row.balance) || 0, since: row.client_since || "", status: row.status, assignedTo: row.assigned_to || undefined }));
          dashboardDB.customers.splice(0, dashboardDB.customers.length, ...refreshed);
          setCustomers(refreshed);
          setSelectedLeadIds([]);
          setImportOpen(false);
          showToast(`${selectedLeadIds.length} customer(s) imported`);
        } catch (error) { showToast(error instanceof Error ? error.message : "Could not import leads"); }
      })();
      return;
    }
    if (!selectedLeadIds.length) {
      showToast("Select at least one lead");
      return;
    }
    const importedCount = selectedLeadIds.length;
    selectedLeadIds.forEach((id) => {
      const lead = dashboardDB.leads.find((item) => item.id === id);
      if (!lead) return;
      const customer: Customer = {
        id: `sim-customer-${Date.now()}-${id}`,
        name: lead.company,
        type: "B2B",
        contact: `${lead.contactName}, ${lead.phone}`,
        email: lead.email,
        credit: Math.max(lead.value, 500000),
        balance: 0,
        since: String(new Date().getFullYear()),
        status: "Active",
      };
      dashboardDB.customers.unshift(customer);
      lead.linkedCustomerId = customer.id;
      lead.linkedCustomer = customer.name;
      lead.status = "Won";
    });
    persistSimulationState(dashboardDB);
    refreshCustomers();
    setSelectedLeadIds([]);
    setImportOpen(false);
    showToast(`${importedCount} customer(s) imported`);
  };

  const createCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const type = String(form.get("type") || "B2B");
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const credit = Number(form.get("credit_limit")) || 0;
    if (!name) {
      showToast("Customer name is required.");
      return;
    }

    setSavingCustomer(true);
    try {
      if (isSimulationMode()) {
        const customer: Customer = {
          id: `sim-customer-${Date.now()}`,
          name,
          type,
          contact: phone || email,
          email,
          credit,
          balance: 0,
          since: String(new Date().getFullYear()),
          status: "Active",
        };
        dashboardDB.customers.unshift(customer);
        persistSimulationState(dashboardDB);
        refreshCustomers();
        setNewCustomerOpen(false);
        showToast(`Simulation: ${customer.name} created`);
        return;
      }

      const { data, error } = await createClient()
        .from("customers")
        .insert({
          name,
          type,
          email: email || null,
          phone: phone || null,
          contact: phone || email || null,
          credit_limit: credit,
          balance: 0,
          status: "Active",
          client_since: String(new Date().getFullYear()),
        })
        .select("id, name, type, contact, email, phone, credit_limit, balance, status, client_since")
        .single();
      if (error) throw error;

      const customer: Customer = {
        id: data.id,
        name: data.name,
        type: data.type,
        contact: data.contact || data.phone || data.email || "",
        email: data.email || "",
        credit: Number(data.credit_limit) || 0,
        balance: Number(data.balance) || 0,
        since: data.client_since || "",
        status: data.status,
      };
      dashboardDB.customers.unshift(customer);
      refreshCustomers();
      setNewCustomerOpen(false);
      showToast(`${customer.name} created`);
    } catch (error) {
      showToast(error instanceof Error ? `Customer not saved: ${error.message}` : "Customer could not be saved.");
    } finally {
      setSavingCustomer(false);
    }
  };

  const linkedLeads = selectedCustomer ? dashboardDB.leads.filter((lead) => lead.linkedCustomerId === (selectedCustomer.id ?? selectedCustomer.name) || lead.linkedCustomer === selectedCustomer.name) : [];
  const availableLeads = selectedCustomer ? dashboardDB.leads.filter((lead) => !lead.linkedCustomerId && !lead.linkedCustomer && lead.company !== selectedCustomer.name) : [];
  const importableLeads = dashboardDB.leads.filter((lead) => lead.status === "Won" && !dashboardDB.customers.some((customer) => customer.name === lead.company));

  return <>
    <div className="view-head"><div><h1>Customer Management</h1><p>Accounts, contracts, documents and credit exposure.</p></div><div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><button className="btn" onClick={() => exportCustomers(customers)}>↓ Export CSV</button><button className="btn" onClick={() => setImportOpen(true)}>Import from leads</button><button className="btn btn-primary" onClick={() => setNewCustomerOpen(true)} disabled={customerDataState === "loading"}>＋ New account</button></div></div>
    {customerDataState === "loading" && <div className="empty" role="status">Loading customer data...</div>}
    {customerDataState === "demo" && <div className="note" role="status">{isSimulationMode() ? "Simulation mode: customer changes stay in local demo data." : `Showing demo customer data. Live data could not be loaded: ${customerDataError}`}</div>}
    {customerDataState !== "loading" && <AdminTable<Customer> columns={[{ key: "name", label: "Account", render: (customer) => <span className="link-cell" onClick={() => setSelectedCustomer(customer)}>{customer.name}</span> }, { key: "type", label: "Type", render: (customer) => <span className="badge b-gray">{customer.type}</span> }, { key: "contact", label: "Contact" }, { key: "credit", label: "Credit limit", render: (customer) => fmtNaira(customer.credit) }, { key: "balance", label: "Balance", render: (customer) => customer.balance ? fmtNaira(customer.balance) : "—" }, { key: "since", label: "Client since" }, { key: "status", label: "Status", render: (customer) => <select className={`switch-select st-${customer.status.toLowerCase().replace(/[^a-z0-9]/g, "")}`} value={customer.status} onChange={(event) => void updateStatus(customer, event.target.value)} aria-label={`Status: ${customer.status}`}>{customerStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={customers} />}
    {newCustomerOpen && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget && !savingCustomer) setNewCustomerOpen(false); }}><form className="modal" onSubmit={createCustomer}><div className="modal-head"><h3>New customer account</h3><button className="x-btn" type="button" onClick={() => setNewCustomerOpen(false)} disabled={savingCustomer}>×</button></div><div className="modal-body"><div className="field"><label>Account name</label><input name="name" required /></div><div className="field"><label>Account type</label><select name="type" defaultValue="B2B"><option value="B2B">B2B</option><option value="B2C">B2C</option><option value="Individual">Individual</option></select></div><div className="field-row"><div className="field"><label>Email</label><input name="email" type="email" /></div><div className="field"><label>Phone</label><input name="phone" type="tel" /></div></div><div className="field"><label>Credit limit, NGN</label><input name="credit_limit" type="number" min="0" defaultValue="0" /></div></div><div className="modal-foot"><button className="btn" type="button" onClick={() => setNewCustomerOpen(false)} disabled={savingCustomer}>Cancel</button><button className="btn btn-primary" type="submit" disabled={savingCustomer}>{savingCustomer ? "Saving..." : "Create account"}</button></div></form></div>}
    {selectedCustomer && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setSelectedCustomer(null); }}><div className="modal wide"><div className="modal-head"><h3>{selectedCustomer.name}</h3><button className="x-btn" onClick={() => setSelectedCustomer(null)}>×</button></div><div className="modal-body"><div className="doc-grid"><div><div className="lbl">Type</div>{selectedCustomer.type}<br /><div className="lbl" style={{ marginTop: 8 }}>Contact</div>{selectedCustomer.contact}</div><div style={{ textAlign: "right" }}><div className="lbl">Client since</div>{selectedCustomer.since}<br /><div className="lbl" style={{ marginTop: 8 }}>Status</div><select className={`switch-select st-${selectedCustomer.status.toLowerCase().replace(/[^a-z0-9]/g, "")}`} value={selectedCustomer.status} onChange={(event) => updateStatus(selectedCustomer, event.target.value)}>{customerStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select></div></div><div className="doc-grid"><div><div className="lbl">Credit limit</div>{fmtNaira(selectedCustomer.credit)}</div><div style={{ textAlign: "right" }}><div className="lbl">Outstanding balance</div>{selectedCustomer.balance ? fmtNaira(selectedCustomer.balance) : "—"}</div></div><div className="form-section-title">Account owner</div><div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>{selectedCustomer.assignedTo ? <span style={{ fontSize: 12.4 }}>Currently: <b>{selectedCustomer.assignedTo}</b></span> : <span style={{ fontSize: 12.4, color: "var(--text-faint)" }}>Not yet assigned</span>}</div><div style={{ display: "flex", gap: 8 }}><select id="cd-assign-staff" style={{ flex: 1 }}><option value="">Choose a staff member</option>{staff.map((name) => <option value={name} key={name}>{name}</option>)}</select><button className="btn btn-sm" onClick={assignStaff}>Assign</button></div><div className="form-section-title">Related leads</div>{linkedLeads.length ? linkedLeads.map((lead) => <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: "1px solid var(--border)", fontSize: 12.4 }} key={lead.id}><button className="link-cell" type="button" onClick={() => { setSelectedCustomer(null); navigate("crm"); }}>{lead.contactName}</button>{statusBadge(lead.status)}</div>) : <div className="empty">No leads linked yet</div>}<div style={{ display: "flex", gap: 8, marginTop: 12 }}><select id="cd-assign-lead" style={{ flex: 1 }}><option value="">{availableLeads.length ? "Choose a lead" : "No other leads available"}</option>{availableLeads.map((lead) => <option value={lead.id} key={lead.id}>{lead.company}, {lead.contactName}</option>)}</select><button className="btn btn-sm" onClick={linkLead}>Link lead</button></div></div><div className="modal-foot"><button className="btn" onClick={() => setSelectedCustomer(null)}>Close</button></div></div></div>}
    {importOpen && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setImportOpen(false); }}><div className="modal"><div className="modal-head"><h3>Import from leads</h3><button className="x-btn" onClick={() => setImportOpen(false)}>×</button></div><div className="modal-body"><p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 0 }}>Leads marked Won become customer accounts.</p>{importableLeads.length ? importableLeads.map((lead) => <label className="checkbox-row" key={lead.id}><input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={(event) => setSelectedLeadIds(event.target.checked ? [...selectedLeadIds, lead.id] : selectedLeadIds.filter((id) => id !== lead.id))} /> <span>{lead.company}</span> · {lead.contactName}</label>) : <div className="empty">No Won leads waiting to be imported</div>}</div><div className="modal-foot"><button className="btn" onClick={() => setImportOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={importLeads}>Import selected</button></div></div></div>}
    {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
  </>;
}
