"use client";

import { useEffect, useState } from "react";
import { AdminTable } from "./AdminTable";
import { dashboardDB, fmtNaira, type Customer, type Lead } from "@/lib/dashboard";
import { useAppDispatch, useAppState, useNavigate } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { isSimulationMode } from "@/lib/supabase/mode";
import { persistSimulationState } from "@/lib/simulation-store";

const crmTabs = [
  ["pipeline", "Pipeline"],
  ["leads", "Leads"],
  ["campaigns", "Campaigns"],
] as const;

const leadStatuses = ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];
const leadPriorities = ["Hot", "Warm", "Cold"];
const leadSources = ["Website", "Referral", "Cold Call", "Social Media", "Trade Show", "Other"];
const transportModes = ["Trucks / Haulage", "RORO", "Sea Freight", "Air Freight", "Cargo"];
const frequencies = ["One-time", "Weekly", "Monthly", "Quarterly", "Other"];
const team = ["Abidoye Joseph Damilare", "Oluwaseun John", "Kelechi Uche", "Fatima Sani"];
const lanes = [
  { label: "New", color: "#2563c7", matches: (status: string) => status === "New" },
  { label: "Contacted", color: "#ca8a04", matches: (status: string) => ["Contacted", "Qualified", "Proposal Sent"].includes(status) },
  { label: "Won", color: "#1f9d5c", matches: (status: string) => status === "Won" },
  { label: "Lost", color: "#e2362b", matches: (status: string) => status === "Lost" },
];

type LeadForm = Omit<Lead, "id" | "notesLog"> & { note: string };

const initialLeadForm: LeadForm = {
  company: "", contactName: "", jobTitle: "", email: "", phone: "", source: "Website", industry: "", priority: "Hot", status: "New", assignedTo: "None", followUp: "", transportMode: "Trucks / Haulage", cargoType: "", origin: "", destination: "", frequency: "One-time", volume: "", currentProvider: "", requirements: "", value: 0, note: "",
};

function formatFollowUp(date: string) {
  return date ? new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function priorityBadge(priority: string) {
  return <span className={`badge st-${priority.toLowerCase()}`}>{priority}</span>;
}

function statusBadge(status: string) {
  return <span className={`badge st-${status.toLowerCase().replace(/[^a-z0-9]/g, "")}`}>{status}</span>;
}

function selectOptions(options: string[], value: string) {
  void value;
  return options.map((option) => <option value={option} key={option}>{option}</option>);
}

export function CRMLeads() {
  const dispatch = useAppDispatch();
  const { currentUser } = useAppState();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<(typeof crmTabs)[number][0]>("pipeline");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadDataState, setLeadDataState] = useState<"loading" | "connected" | "demo">("loading");
  const [leadDataError, setLeadDataError] = useState("");
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverLane, setDragOverLane] = useState<string | null>(null);
  const [modal, setModal] = useState<"detail" | "form" | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadForm>(initialLeadForm);
  const [toast, setToast] = useState("");

  useEffect(() => {
    dispatch({ type: "SET_CURRENT_VIEW", view: "crm" });
  }, [dispatch]);

  useEffect(() => {
    let active = true;

    async function loadLeads() {
      try {
        const supabase = createClient();
        const [{ data: rows, error: leadsError }, { data: notes, error: notesError }] = await Promise.all([
          supabase
            .from("leads")
            .select("id, company, contact_name, job_title, email, phone, source, industry, priority, status, assigned_to, follow_up_date, transport_mode, cargo_type, origin, destination, frequency, volume_weight, current_provider, requirements, value")
            .order("created_at", { ascending: false }),
          supabase
            .from("lead_notes")
            .select("lead_id, author_name, note, created_at")
            .order("created_at", { ascending: true }),
        ]);
        if (leadsError) throw leadsError;
        if (notesError) throw notesError;
        if (!active) return;

        const notesByLead = new Map<string, Lead["notesLog"]>();
        (notes ?? []).forEach((note) => {
          const entries = notesByLead.get(note.lead_id) ?? [];
          entries.push({
            t: new Date(note.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }),
            by: note.author_name,
            text: note.note,
          });
          notesByLead.set(note.lead_id, entries);
        });

        const liveLeads: Lead[] = (rows ?? []).map((row) => ({
          id: row.id,
          company: row.company,
          contactName: row.contact_name,
          jobTitle: row.job_title ?? "",
          email: row.email ?? "",
          phone: row.phone ?? "",
          source: row.source ?? "Other",
          industry: row.industry ?? "",
          priority: row.priority,
          status: row.status,
          assignedTo: row.assigned_to ?? "None",
          followUp: row.follow_up_date ?? "",
          transportMode: row.transport_mode ?? "Cargo",
          cargoType: row.cargo_type ?? "",
          origin: row.origin ?? "",
          destination: row.destination ?? "",
          frequency: row.frequency ?? "One-time",
          volume: row.volume_weight ?? "",
          currentProvider: row.current_provider ?? "",
          requirements: row.requirements ?? "",
          value: Number(row.value) || 0,
          notesLog: notesByLead.get(row.id) ?? [],
        }));

        dashboardDB.leads.splice(0, dashboardDB.leads.length, ...liveLeads);
        setLeads(liveLeads);
        setLeadDataError("");
        setLeadDataState("connected");
      } catch (error) {
        if (!active) return;
        setLeads(dashboardDB.leads);
        setLeadDataError(error instanceof Error ? error.message : "Supabase CRM data could not be loaded.");
        setLeadDataState("demo");
      }
    }

    void loadLeads();
    return () => {
      active = false;
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const closeModal = () => {
    setModal(null);
    setSelectedLead(null);
    setForm(initialLeadForm);
  };

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setModal("detail");
  };

  const openLeadForm = (lead?: Lead) => {
    if (lead) {
      const { notesLog: _notesLog, ...leadFields } = lead;
      void _notesLog;
      setForm({ ...leadFields, note: "" });
      setSelectedLead(lead);
    } else {
      setForm(initialLeadForm);
      setSelectedLead(null);
    }
    setModal("form");
  };

  const updateForm = (field: keyof LeadForm, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveLead = async () => {
    if (!form.company || !form.contactName || !form.phone) {
      showToast("Company name, contact name and phone are required");
      return;
    }
    if (leadDataState === "demo" && !isSimulationMode()) {
      showToast("CRM data is offline; lead changes were not saved.");
      return;
    }
    if (leadDataState === "connected" && form.assignedTo !== (selectedLead?.assignedTo ?? "None")) {
      showToast("Staff assignment will be enabled with staff-profile sync.");
      return;
    }
    const data: Omit<Lead, "id" | "notesLog"> = {
      company: form.company, contactName: form.contactName, jobTitle: form.jobTitle, email: form.email, phone: form.phone, source: form.source, industry: form.industry, priority: form.priority, status: form.status, assignedTo: form.assignedTo, followUp: form.followUp, transportMode: form.transportMode, cargoType: form.cargoType, origin: form.origin, destination: form.destination, frequency: form.frequency, volume: form.volume, currentProvider: form.currentProvider, requirements: form.requirements, value: Number(form.value) || 0,
    };
    let savedLead: Lead;
    if (leadDataState === "connected") {
      const supabase = createClient();
      const record = {
        company: data.company,
        contact_name: data.contactName,
        job_title: data.jobTitle || null,
        email: data.email || null,
        phone: data.phone,
        source: data.source,
        industry: data.industry || null,
        priority: data.priority,
        status: data.status,
        follow_up_date: data.followUp || null,
        transport_mode: data.transportMode,
        cargo_type: data.cargoType || null,
        origin: data.origin || null,
        destination: data.destination || null,
        frequency: data.frequency,
        volume_weight: data.volume || null,
        current_provider: data.currentProvider || null,
        requirements: data.requirements || null,
        value: data.value,
      };
      const result = selectedLead
        ? await supabase.from("leads").update(record).eq("id", selectedLead.id).select("id").maybeSingle()
        : await supabase.from("leads").insert(record).select("id").single();
      if (result.error) {
        showToast(`Lead not saved: ${result.error.message}`);
        return;
      }
      if (!result.data) {
        showToast("Lead not saved. Check your CRM access and try again.");
        return;
      }
      savedLead = { ...(selectedLead ?? { notesLog: [] }), id: result.data.id, ...data, notesLog: selectedLead?.notesLog ?? [] };
      if (form.note) {
        const { data: noteRow, error: noteError } = await supabase.from("lead_notes").insert({
          lead_id: savedLead.id,
          author_name: currentUser?.name || currentUser?.email || "Staff",
          note: form.note,
        }).select("created_at").single();
        if (noteError) showToast(`Lead saved, but note not recorded: ${noteError.message}`);
        else savedLead.notesLog.push({
          t: new Date(noteRow.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }),
          by: currentUser?.name || currentUser?.email || "Staff",
          text: form.note,
        });
      }
    } else if (selectedLead) {
      savedLead = { ...selectedLead, ...data };
      if (form.note) savedLead.notesLog.push({ t: new Date().toISOString().slice(0, 16).replace("T", " "), by: currentUser?.name || "Staff", text: form.note });
    } else {
      savedLead = { id: `ld_${Math.random().toString(36).slice(2, 9)}`, ...data, notesLog: form.note ? [{ t: new Date().toISOString().slice(0, 16).replace("T", " "), by: currentUser?.name || "Staff", text: form.note }] : [] };
    }
    const existingIndex = dashboardDB.leads.findIndex((lead) => lead.id === savedLead.id);
    if (existingIndex >= 0) dashboardDB.leads[existingIndex] = savedLead;
    else dashboardDB.leads.unshift(savedLead);
    if (isSimulationMode()) persistSimulationState(dashboardDB);
    setLeads([...dashboardDB.leads]);
    closeModal();
    setActiveTab("leads");
    showToast(`Lead saved: ${data.company}`);
  };

  const updateLead = async (lead: Lead, field: "status" | "priority", value: string) => {
    if (leadDataState === "connected") {
      const { error } = await createClient().from("leads").update({ [field]: value }).eq("id", lead.id);
      if (error) {
        showToast(`Could not update ${lead.company}: ${error.message}`);
        return;
      }
    } else if (!isSimulationMode()) {
      showToast("CRM data is offline; lead was not changed.");
      return;
    }
    lead[field] = value;
    if (isSimulationMode()) persistSimulationState(dashboardDB);
    setLeads([...dashboardDB.leads]);
    showToast(`${lead.company} ${field} set to ${value}`);
  };

  const dropLead = (laneLabel: string) => {
    if (!draggedLeadId) return;
    const lead = dashboardDB.leads.find((item) => item.id === draggedLeadId);
    if (!lead) return;
    if (lead.status !== laneLabel) {
      void updateLead(lead, "status", laneLabel);
    }
    setDraggedLeadId(null);
    setDragOverLane(null);
  };

  const addLeadNote = async (lead: Lead, value: string) => {
    const note = value.trim();
    if (!note) return;
    const by = currentUser?.name || currentUser?.email || "Staff";
    if (leadDataState === "connected") {
      const { data, error } = await createClient().from("lead_notes").insert({
        lead_id: lead.id,
        author_name: by,
        note,
      }).select("created_at").single();
      if (error) {
        showToast(`Note not saved: ${error.message}`);
        return;
      }
      lead.notesLog.push({ t: new Date(data.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }), by, text: note });
    } else {
      if (!isSimulationMode()) {
        showToast("CRM data is offline; note was not saved.");
        return;
      }
      lead.notesLog.push({ t: new Date().toISOString().slice(0, 16).replace("T", " "), by, text: note });
    }
    setLeads([...dashboardDB.leads]);
    if (isSimulationMode()) persistSimulationState(dashboardDB);
    setSelectedLead({ ...lead, notesLog: [...lead.notesLog] });
  };

  const convertLead = (lead: Lead) => {
    if (leadDataState === "connected") {
      showToast("Lead conversion will be enabled with the customer-account workflow.");
      return;
    }
    if (!isSimulationMode()) {
      showToast("CRM data is offline; lead was not converted.");
      return;
    }
    const existingCustomer = dashboardDB.customers.find((customer) => customer.name === lead.company);
    if (existingCustomer) {
      lead.linkedCustomerId = existingCustomer.id ?? existingCustomer.name;
      lead.linkedCustomer = existingCustomer.name;
      lead.status = "Won";
      persistSimulationState(dashboardDB);
      showToast(`${lead.company} is already a customer`);
      setLeads([...dashboardDB.leads]);
      return;
    }
    const customer: Customer = {
      id: `sim-customer-${Date.now()}`,
      name: lead.company,
      type: "B2B",
      contact: `${lead.contactName}, ${lead.phone}`,
      email: lead.email,
      credit: Math.max(lead.value || 0, 500000),
      balance: 0,
      since: String(new Date().getFullYear()),
      status: "Active",
    };
    dashboardDB.customers.unshift(customer);
    lead.linkedCustomerId = customer.id;
    lead.linkedCustomer = customer.name;
    lead.status = "Won";
    persistSimulationState(dashboardDB);
    setLeads([...dashboardDB.leads]);
    closeModal();
    navigate("customers");
    showToast(`${lead.company} converted to a customer account`);
  };

  return <>
    <div className="view-head"><div><h1>CRM &amp; Leads</h1><p>Lead capture through to customer conversion. Quotations now live in Finance.</p></div><button className="btn btn-primary" onClick={() => openLeadForm()}>＋ New lead</button></div>
    {leadDataState === "loading" && <div className="empty" role="status">Loading CRM data...</div>}
    {leadDataState === "demo" && <div className="note" role="status">{isSimulationMode() ? "Simulation mode: CRM changes stay in local demo data." : `Showing demo CRM data. Live data could not be loaded: ${leadDataError}`}</div>}
    <div className="tabs">{crmTabs.map(([key, label]) => <div className={`tab${activeTab === key ? " active" : ""}`} key={key} onClick={() => setActiveTab(key)}>{label}</div>)}</div>
    {activeTab === "pipeline" && <div className="kanban">{lanes.map((lane) => { const items = leads.filter((lead) => lane.matches(lead.status)); return <div className={`kcol${dragOverLane === lane.label ? " drag-over" : ""}`} style={{ "--kcolor": lane.color } as React.CSSProperties} onDragOver={(event) => { event.preventDefault(); setDragOverLane(lane.label); }} onDragLeave={() => setDragOverLane(null)} onDrop={(event) => { event.preventDefault(); dropLead(lane.label); }} key={lane.label}><div className="kcol-head"><h4>{lane.label}</h4><span className="badge" style={{ background: `${lane.color}22`, color: lane.color }}>{items.length}</span></div>{items.length ? items.map((lead) => <div className="kcard" draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; setDraggedLeadId(lead.id); }} onDragEnd={() => { setDraggedLeadId(null); setDragOverLane(null); }} onClick={() => openLeadDetail(lead)} key={lead.id}><div className="kcard-top"><span className="kcard-name">{lead.company}</span>{priorityBadge(lead.priority)}</div><div className="kcard-meta">{lead.contactName} · {fmtNaira(lead.value)}</div></div>) : <div className="empty">No leads</div>}</div>; })}</div>}
    {activeTab === "leads" && <AdminTable<Lead> columns={[{ key: "company", label: "Company", render: (lead) => <span className="link-cell" onClick={() => openLeadDetail(lead)}>{lead.company}</span> }, { key: "contactName", label: "Contact" }, { key: "priority", label: "Priority", render: (lead) => <select className={`switch-select st-${lead.priority.toLowerCase()}`} value={lead.priority} onChange={(event) => updateLead(lead, "priority", event.target.value)} aria-label={`Priority: ${lead.priority}`}>{selectOptions(leadPriorities, lead.priority)}</select> }, { key: "status", label: "Status", render: (lead) => <select className={`switch-select st-${lead.status.toLowerCase().replace(/[^a-z0-9]/g, "")}`} value={lead.status} onChange={(event) => updateLead(lead, "status", event.target.value)} aria-label={`Status: ${lead.status}`}>{selectOptions(leadStatuses, lead.status)}</select> }, { key: "assignedTo", label: "Assigned to" }, { key: "value", label: "Value", render: (lead) => fmtNaira(lead.value) }]} data={leads} />}
    {activeTab === "campaigns" && <div className="grid g-3"><div className="card"><div className="card-head"><div className="card-title">Lagos SME haulage push</div>{statusBadge("Active")}</div><p style={{ color: "var(--text-dim)", fontSize: 12.4, margin: 0 }}>Instagram + WhatsApp broadcast targeting SME shippers in Lagos.</p></div><div className="card"><div className="card-head"><div className="card-title">Kano corridor awareness</div>{statusBadge("Scheduled")}</div><p style={{ color: "var(--text-dim)", fontSize: 12.4, margin: 0 }}>Radio and on-ground activation for the Lagos to Kano route.</p></div><div className="card"><div className="card-head"><div className="card-title">Referral incentive</div>{statusBadge("Active")}</div><p style={{ color: "var(--text-dim)", fontSize: 12.4, margin: 0 }}>10% discount for customers referring a new business account.</p></div></div>}
    {modal === "detail" && selectedLead && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div className="modal wide"><div className="modal-head"><h3>{selectedLead.company} {priorityBadge(selectedLead.priority)} {statusBadge(selectedLead.status)}</h3><button className="x-btn" onClick={closeModal}>×</button></div><div className="modal-body"><div className="doc-grid"><div><div className="lbl">Contact</div>{selectedLead.contactName}, {selectedLead.jobTitle}<br />{selectedLead.email}<br />{selectedLead.phone}</div><div><div className="lbl">Source / industry</div>{selectedLead.source}, {selectedLead.industry || "—"}<br /><div className="lbl" style={{ marginTop: 8 }}>Assigned to</div>{selectedLead.assignedTo}<br /><div className="lbl" style={{ marginTop: 8 }}>Next follow-up</div>{formatFollowUp(selectedLead.followUp)}</div></div><div className="form-section-title">Freight specifics</div><div className="doc-grid"><div><div className="lbl">Transport mode</div>{selectedLead.transportMode}<br /><div className="lbl" style={{ marginTop: 8 }}>Cargo type</div>{selectedLead.cargoType || "—"}<br /><div className="lbl" style={{ marginTop: 8 }}>Route</div>{selectedLead.origin} to {selectedLead.destination}</div><div><div className="lbl">Frequency</div>{selectedLead.frequency}<br /><div className="lbl" style={{ marginTop: 8 }}>Volume / weight</div>{selectedLead.volume || "—"}<br /><div className="lbl" style={{ marginTop: 8 }}>Current provider</div>{selectedLead.currentProvider || "None"}</div></div>{selectedLead.requirements && <div className="note">Special requirements: {selectedLead.requirements}</div>}<div className="form-section-title">Estimated deal value</div><div style={{ fontFamily: "var(--font-d)", fontSize: 20, fontWeight: 700 }}>{fmtNaira(selectedLead.value)}</div><div className="form-section-title">Add a note</div><div style={{ display: "flex", gap: 8 }}><input id="lead-note" placeholder="Log a call, email, or update" style={{ flex: 1 }} /><button className="btn btn-sm" onClick={() => { const input = document.getElementById("lead-note") as HTMLInputElement; addLeadNote(selectedLead, input.value); input.value = ""; }}>Add</button></div><div className="form-section-title">Notes log</div>{selectedLead.notesLog.length ? selectedLead.notesLog.slice().reverse().map((note) => <div style={{ padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 12 }} key={`${note.t}-${note.text}`}><b>{note.by}</b> <span style={{ color: "var(--text-faint)" }}>{note.t}</span><div style={{ marginTop: 3, color: "var(--text-dim)" }}>{note.text}</div></div>) : <div className="empty">No notes yet</div>}</div><div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button><button className="btn" onClick={() => openLeadForm(selectedLead)}>Edit</button>{!dashboardDB.customers.some((customer) => customer.name === selectedLead.company) && <button className="btn btn-primary" onClick={() => convertLead(selectedLead)}>Convert to customer</button>}</div></div></div>}
    {modal === "form" && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div className="modal wide"><div className="modal-head"><h3>{selectedLead ? "Edit lead" : "New lead"}</h3><button className="x-btn" onClick={closeModal}>×</button></div><div className="modal-body"><div className="form-section-title">Company &amp; contact</div><div className="field"><label>Company name *</label><input value={form.company} onChange={(event) => updateForm("company", event.target.value)} /></div><div className="field-row"><div className="field"><label>Contact name *</label><input value={form.contactName} onChange={(event) => updateForm("contactName", event.target.value)} /></div><div className="field"><label>Job title</label><input value={form.jobTitle} onChange={(event) => updateForm("jobTitle", event.target.value)} /></div></div><div className="field-row"><div className="field"><label>Email</label><input value={form.email} onChange={(event) => updateForm("email", event.target.value)} /></div><div className="field"><label>Phone *</label><input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} /></div></div><div className="form-section-title">Lead details</div><div className="field-row3"><div className="field"><label>Source</label><select value={form.source} onChange={(event) => updateForm("source", event.target.value)}>{selectOptions(leadSources, form.source)}</select></div><div className="field"><label>Priority *</label><select value={form.priority} onChange={(event) => updateForm("priority", event.target.value)}>{selectOptions(leadPriorities, form.priority)}</select></div><div className="field"><label>Status *</label><select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>{selectOptions(leadStatuses, form.status)}</select></div></div><div className="field-row"><div className="field"><label>Industry</label><input value={form.industry} onChange={(event) => updateForm("industry", event.target.value)} /></div><div className="field"><label>Assigned to</label><select value={form.assignedTo} onChange={(event) => updateForm("assignedTo", event.target.value)}><option>None</option>{selectOptions(team, form.assignedTo)}</select></div></div><div className="field"><label>Next follow-up date</label><input type="date" value={form.followUp} onChange={(event) => updateForm("followUp", event.target.value)} /></div><div className="form-section-title">Freight specifics</div><div className="field-row"><div className="field"><label>Transport mode</label><select value={form.transportMode} onChange={(event) => updateForm("transportMode", event.target.value)}>{selectOptions(transportModes, form.transportMode)}</select></div><div className="field"><label>Cargo type</label><input value={form.cargoType} onChange={(event) => updateForm("cargoType", event.target.value)} /></div></div><div className="field-row"><div className="field"><label>Origin</label><input value={form.origin} onChange={(event) => updateForm("origin", event.target.value)} /></div><div className="field"><label>Destination</label><input value={form.destination} onChange={(event) => updateForm("destination", event.target.value)} /></div></div><div className="field-row"><div className="field"><label>Shipment frequency</label><select value={form.frequency} onChange={(event) => updateForm("frequency", event.target.value)}>{selectOptions(frequencies, form.frequency)}</select></div><div className="field"><label>Estimated volume / weight</label><input value={form.volume} onChange={(event) => updateForm("volume", event.target.value)} /></div></div><div className="field-row"><div className="field"><label>Current provider</label><input value={form.currentProvider} onChange={(event) => updateForm("currentProvider", event.target.value)} /></div><div className="field"><label>Estimated deal value</label><input type="number" value={form.value} onChange={(event) => updateForm("value", event.target.value)} /></div></div><div className="field"><label>Special requirements</label><textarea rows={2} value={form.requirements} onChange={(event) => updateForm("requirements", event.target.value)} /></div><div className="field"><label>Notes</label><textarea rows={2} placeholder="Optional note to log with this save" value={form.note} onChange={(event) => updateForm("note", event.target.value)} /></div></div><div className="modal-foot"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={saveLead}>Save lead</button></div></div></div>}
    {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
  </>;
}
