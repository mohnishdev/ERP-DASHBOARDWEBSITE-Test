"use client";

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { AdminTable } from "./AdminTable";
import { useAppDispatch } from "@/context/AppContext";
import { dashboardDB, jobPostingsStorageKey, type Applicant, type Employee, type JobPosting, type LeaveRequest } from "@/lib/dashboard";

const hrTabs = [
  ["employees", "Employees"],
  ["recruitment", "Recruitment"],
  ["postings", "Careers postings"],
  ["leave", "Leave"],
  ["eoy", "Employee of the year"],
] as const;

const employeeStatuses = ["Active", "On leave", "Sacked"];
const recruitmentStages = ["Screening", "Interview", "Offer"];
const leaveTypes = ["Annual", "Sick", "Compassionate", "Maternity", "Paternity", "Unpaid"];
const recruitmentColors: Record<string, string> = { Screening: "#2563c7", Interview: "#ca8a04", Offer: "#1f9d5c" };

function formatDate(value: string) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function initials(name: string) {
  return name.split(" ").map((word) => word[0]).slice(0, 2).join("");
}

function statusBadge(status: string) {
  const className = `st-${status.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  return <span className={`badge ${className}`}><span className="dot" />{status}</span>;
}

function EmployeeDocument({ employee }: { employee: Employee }) {
  return <div className="doc">
    <div className="doc-head"><div><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" style={{ height: 30 }} /></div><div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div></div>
    <div className="doc-grid"><div><div className="lbl">Department</div>{employee.dept}<br /><div className="lbl" style={{ marginTop: 8 }}>Role</div>{employee.role}</div><div style={{ textAlign: "right" }}><div className="lbl">Status</div>{employee.status}<br /><div className="lbl" style={{ marginTop: 8 }}>Hired</div>{employee.hired}</div></div>
    <div className="doc-grid"><div><div className="lbl">Email</div>{employee.email}</div><div style={{ textAlign: "right" }}><div className="lbl">Phone</div>{employee.phone}</div></div>
  </div>;
}

function OfferLetter({ employee }: { employee: Employee }) {
  return <div className="doc">
    <div className="doc-head"><div><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" style={{ height: 30 }} /></div><div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div></div>
    <h2>Offer letter</h2>
    <div className="doc-grid"><div><div className="lbl">Employee</div>{employee.name}</div><div style={{ textAlign: "right" }}><div className="lbl">Start date</div>{employee.hired}</div></div>
    <div style={{ fontSize: 12.6, marginTop: 10 }}><p>Dear {employee.name},</p><p>We are pleased to offer you the position of {employee.role} in the {employee.dept} department at JAAD Logistics Ltd, starting {employee.hired}.</p><p>Please review the terms of employment and reply to confirm your acceptance.</p><p>Regards,<br />HR, JAAD Logistics Ltd</p></div>
    <div className="doc-sign"><div className="line">Employer signature</div><div className="line">Employee signature</div></div>
  </div>;
}

function LeaveLetter({ leave }: { leave: LeaveRequest }) {
  const decided = leave.status === "Approved" || leave.status === "Declined";
  return <div className="doc">
    <div className="doc-head"><div><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" style={{ height: 30 }} /></div><div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div></div>
    {decided ? <><h2>Leave letter</h2><div className="doc-grid"><div><div className="lbl">Employee</div>{leave.name}</div><div style={{ textAlign: "right" }}><div className="lbl">Decision</div>{leave.status}</div></div><div style={{ fontSize: 12.6, marginTop: 10 }}><p>Dear {leave.name},</p><p>This letter confirms your {leave.type.toLowerCase()} leave request from {formatDate(leave.from)} to {formatDate(leave.to)} has been <b>{leave.status.toUpperCase()}</b>.</p>{leave.status === "Approved" ? <p>Please hand over any active tasks before your leave begins and coordinate cover with your supervisor.</p> : <p>Please speak with your supervisor if you would like to discuss alternative dates.</p>}<p>Regards,<br />HR, JAAD Logistics Ltd</p></div></> : <><h2>Request for leave</h2><div className="doc-grid"><div><div className="lbl">Employee</div>{leave.name}<br /><div className="lbl" style={{ marginTop: 8 }}>Leave type</div>{leave.type}</div><div style={{ textAlign: "right" }}><div className="lbl">Requested on</div>{formatDate(leave.requestedOn)}<br /><div className="lbl" style={{ marginTop: 8 }}>Status</div>{leave.status}</div></div><div className="doc-grid"><div><div className="lbl">From</div>{formatDate(leave.from)}</div><div style={{ textAlign: "right" }}><div className="lbl">To</div>{formatDate(leave.to)}</div></div><div className="form-section-title">Reason</div><p style={{ fontSize: 12.6 }}>{leave.reason || "—"}</p></>}
    <div className="doc-sign"><div className="line">Employee signature</div><div className="line">Supervisor approval</div></div>
  </div>;
}

export function HR() {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<(typeof hrTabs)[number][0]>("employees");
  const [employees, setEmployees] = useState<Employee[]>(dashboardDB.employees);
  const [applicants, setApplicants] = useState<Applicant[]>(dashboardDB.applicants);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>(dashboardDB.jobPostings);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(dashboardDB.leave);
  const [modal, setModal] = useState<"employee" | "offer" | "leave" | "posting" | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Employee | null>(null);
  const [selectedLeaveIndex, setSelectedLeaveIndex] = useState<number | null>(null);
  const [postingForm, setPostingForm] = useState({ title: "", location: "", type: "Full-time", desc: "" });
  const [leaveForm, setLeaveForm] = useState({ name: dashboardDB.employees[0]?.name || "", type: "Annual", from: "", to: "", reason: "" });
  const [toast, setToast] = useState("");

  useEffect(() => {
    dispatch({ type: "SET_CURRENT_VIEW", view: "hr" });
    try {
      const saved = JSON.parse(localStorage.getItem(jobPostingsStorageKey) || "null") as JobPosting[] | null;
      if (saved) {
        dashboardDB.jobPostings.splice(0, dashboardDB.jobPostings.length, ...saved);
        queueMicrotask(() => setJobPostings(saved));
      }
    } catch { /* Keep the in-memory postings when stored data is invalid. */ }
  }, [dispatch]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const closeModal = () => {
    setModal(null);
    setSelectedEmployee(null);
    setSelectedOffer(null);
    setSelectedLeaveIndex(null);
    setPostingForm({ title: "", location: "", type: "Full-time", desc: "" });
    setLeaveForm({ name: dashboardDB.employees[0]?.name || "", type: "Annual", from: "", to: "", reason: "" });
  };

  const openEmployee = (employee: Employee) => { setSelectedEmployee(employee); setModal("employee"); };
  const openOffer = (employee: Employee) => { setSelectedOffer(employee); setModal("offer"); };
  const openLeaveLetter = (index: number) => { setSelectedLeaveIndex(index); setModal("leave"); };

  const updateEmployeeStatus = (employee: Employee, status: string) => {
    setEmployees((currentEmployees) => currentEmployees.map((currentEmployee) => currentEmployee === employee ? { ...currentEmployee, status } : currentEmployee));
    showToast(`${employee.name} set to ${status}`);
  };

  const updateApplicantStage = (applicant: Applicant, stage: string) => {
    setApplicants((currentApplicants) => currentApplicants.map((currentApplicant) => currentApplicant === applicant ? { ...currentApplicant, stage } : currentApplicant));
    showToast(`${applicant.name} moved to ${stage}`);
  };

  const savePosting = () => {
    const title = postingForm.title.trim();
    const location = postingForm.location.trim();
    if (!title || !location) { showToast("Add a title and location"); return; }
    const posting = { title, location, type: postingForm.type, desc: postingForm.desc.trim() };
    dashboardDB.jobPostings.unshift(posting);
    localStorage.setItem(jobPostingsStorageKey, JSON.stringify(dashboardDB.jobPostings));
    setJobPostings([...dashboardDB.jobPostings]);
    closeModal();
    setActiveTab("postings");
    showToast("Role posted, now live on the website");
  };

  const removePosting = (index: number) => {
    dashboardDB.jobPostings.splice(index, 1);
    localStorage.setItem(jobPostingsStorageKey, JSON.stringify(dashboardDB.jobPostings));
    setJobPostings([...dashboardDB.jobPostings]);
    showToast("Posting removed");
  };

  const voteEmployee = (employee: Employee) => {
    setEmployees((currentEmployees) => currentEmployees.map((currentEmployee) => currentEmployee === employee ? { ...currentEmployee, eoyVotes: (currentEmployee.eoyVotes || 0) + 1 } : currentEmployee));
    showToast(`Vote counted for ${employee.name}`);
  };

  const setLeaveStatus = (index: number, status: string) => {
    setLeaveRequests((currentRequests) => currentRequests.map((request, currentIndex) => currentIndex === index ? { ...request, status } : request));
    showToast(`Leave request ${status.toLowerCase()}`);
    openLeaveLetter(index);
  };

  const saveLeave = () => {
    if (!leaveForm.from || !leaveForm.to) { showToast("Add a start and end date"); return; }
    setLeaveRequests((currentRequests) => [{ name: leaveForm.name, type: leaveForm.type, from: leaveForm.from, to: leaveForm.to, status: "Requested", reason: leaveForm.reason.trim() || "No reason given.", requestedOn: new Date().toISOString().slice(0, 10) }, ...currentRequests]);
    closeModal();
    setActiveTab("leave");
    showToast(`Leave application submitted for ${leaveForm.name}`);
  };

  const uploadPhoto = (event: React.ChangeEvent<HTMLInputElement>, employee: Employee) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEmployees((currentEmployees) => currentEmployees.map((currentEmployee) => currentEmployee === employee ? { ...currentEmployee, photo: String(reader.result) } : currentEmployee));
      showToast(`Photo updated for ${employee.name}`);
    };
    reader.readAsDataURL(file);
  };

  const downloadLeavePDF = (leave: LeaveRequest) => {
    const decided = leave.status === "Approved" || leave.status === "Declined";
    const document = new jsPDF({ unit: "pt", format: "a4" });
    document.setFontSize(15);
    document.text(decided ? `Leave letter, ${leave.name}` : `Request for leave, ${leave.name}`, 48, 56);
    document.setFontSize(10.5);
    document.text(`Leave type: ${leave.type}`, 48, 84);
    document.text(`From: ${formatDate(leave.from)}`, 48, 102);
    document.text(`To: ${formatDate(leave.to)}`, 48, 120);
    document.text(`Status: ${leave.status}`, 48, 138);
    document.text(`Reason: ${leave.reason || "—"}`, 48, 156);
    document.save(`${leave.name.replace(/\s+/g, "-")}-leave.pdf`);
  };

  const renderEmployees = () => <AdminTable<Employee> columns={[{ key: "photo", label: "", render: (employee) => employee.photo ? <img src={employee.photo} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--text-dim)" }}>{initials(employee.name)}</div> }, { key: "name", label: "Name", render: (employee) => <span className="link-cell" onClick={() => openEmployee(employee)}>{employee.name}</span> }, { key: "dept", label: "Department" }, { key: "role", label: "Role" }, { key: "hired", label: "Offer letter", render: (employee) => <span className="link-cell" onClick={() => openOffer(employee)}>View</span> }, { key: "status", label: "Status", render: (employee) => <select className="switch-select" value={employee.status} onChange={(event) => updateEmployeeStatus(employee, event.target.value)}>{employeeStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={employees} />;

  const renderRecruitment = () => <AdminTable<Applicant> columns={[{ key: "name", label: "Applicant" }, { key: "role", label: "Role applied for" }, { key: "stage", label: "Stage", render: (applicant) => <select className="switch-select" value={applicant.stage} style={{ backgroundColor: `${recruitmentColors[applicant.stage]}29`, color: recruitmentColors[applicant.stage] }} onChange={(event) => updateApplicantStage(applicant, event.target.value)}>{recruitmentStages.map((stage) => <option value={stage} key={stage}>{stage}</option>)}</select> }]} data={applicants} />;

  const renderPostings = () => <><div className="note">Anything posted here appears live on the public website’s Careers section.</div>{jobPostings.length ? jobPostings.map((posting, index) => <div className="card" style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }} key={`${posting.title}-${index}`}><div><div style={{ fontWeight: 700, fontSize: 13 }}>{posting.title}</div><div style={{ fontSize: 11.5, color: "var(--text-faint)", margin: "2px 0 6px" }}>{posting.location} · {posting.type}</div><p style={{ margin: 0, fontSize: 12.4, color: "var(--text-dim)" }}>{posting.desc}</p></div><button className="btn btn-sm btn-danger" onClick={() => removePosting(index)}>Remove</button></div>) : <div className="empty">No open roles posted</div>}</>;

  const renderLeave = () => <AdminTable<LeaveRequest> columns={[{ key: "name", label: "Employee", render: (leave) => <span className="link-cell" onClick={() => openLeaveLetter(leaveRequests.indexOf(leave))}>{leave.name}</span> }, { key: "type", label: "Type" }, { key: "from", label: "From", render: (leave) => formatDate(leave.from) }, { key: "to", label: "To", render: (leave) => formatDate(leave.to) }, { key: "status", label: "Status", render: (leave) => statusBadge(leave.status) }, { key: "reason", label: "Action", render: (leave) => { const index = leaveRequests.indexOf(leave); return leave.status === "Requested" ? <div className="row-actions"><button className="btn btn-sm" onClick={() => setLeaveStatus(index, "Approved")}>Approve</button><button className="btn btn-sm btn-danger" onClick={() => setLeaveStatus(index, "Declined")}>Decline</button></div> : <button className="btn btn-sm" onClick={() => openLeaveLetter(index)}>View letter</button>; } }]} data={leaveRequests} />;

  const renderEoy = () => { const ranked = [...employees].sort((first, second) => (second.eoyVotes || 0) - (first.eoyVotes || 0)); return <><div className="note">Anyone on the admin team can cast one vote per person. Most votes wins for the month.</div><AdminTable<Employee> columns={[{ key: "name", label: "Employee", render: (employee) => <>{employee.eoyVotes ? (ranked[0] === employee ? "⭐ " : "") : ""}{employee.name}</> }, { key: "dept", label: "Department" }, { key: "eoyVotes", label: "Votes", render: (employee) => String(employee.eoyVotes || 0) }, { key: "role", label: "", render: (employee) => <button className="btn btn-sm" onClick={() => voteEmployee(employee)}>Vote</button> }]} data={ranked} /></>; };

  const body = activeTab === "employees" ? renderEmployees() : activeTab === "recruitment" ? renderRecruitment() : activeTab === "postings" ? renderPostings() : activeTab === "leave" ? renderLeave() : renderEoy();
  const action = activeTab === "employees" ? <button className="btn btn-primary" onClick={() => showToast("Add employee form is a stub in this prototype")}>＋ Add employee</button> : activeTab === "postings" ? <button className="btn btn-primary" onClick={() => setModal("posting")}>＋ Post a role</button> : activeTab === "leave" ? <button className="btn btn-primary" onClick={() => setModal("leave")}>＋ Apply for leave</button> : null;
  const selectedLeave = selectedLeaveIndex === null ? null : leaveRequests[selectedLeaveIndex];

  return <>
    <div className="view-head"><div><h1>HR &amp; Careers</h1><p>Employees, recruitment, careers postings and leave.</p></div><div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>{action}</div></div>
    <div className="tabs">{hrTabs.map(([key, label]) => <div className={`tab${activeTab === key ? " active" : ""}`} key={key} onClick={() => setActiveTab(key)}>{label}</div>)}</div>
    {body}
    {modal && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div className={modal === "employee" || modal === "offer" || modal === "leave" ? "modal doc-modal" : "modal"}>
      {modal === "employee" && selectedEmployee ? <><div className="modal-head"><h3>{selectedEmployee.name}</h3><button className="x-btn" onClick={closeModal}>×</button></div><div className="modal-body"><div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}><div style={{ position: "relative" }}>{selectedEmployee.photo ? <img id="emp-photo-preview" src={selectedEmployee.photo} alt="" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover" }} /> : <div id="emp-photo-preview" style={{ width: 72, height: 72, borderRadius: 12, background: "var(--surface3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "var(--text-dim)" }}>{initials(selectedEmployee.name)}</div>}</div><div><label className="btn btn-sm">Upload photo<input type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => uploadPhoto(event, selectedEmployee)} /></label><div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 6 }}>Stored locally in this session only.</div></div></div><EmployeeDocument employee={selectedEmployee} /></div><div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button></div></> : modal === "offer" && selectedOffer ? <><div className="modal-head"><h3>Offer letter, {selectedOffer.name}</h3><button className="x-btn" onClick={closeModal}>×</button></div><div className="modal-body"><OfferLetter employee={selectedOffer} /></div><div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button><button className="btn btn-primary" onClick={() => window.print()}>Print</button></div></> : modal === "leave" && selectedLeave ? <><div className="modal-head"><h3>{selectedLeave.status === "Requested" ? "Request for leave" : "Leave letter"}, {selectedLeave.name}</h3><button className="x-btn" onClick={closeModal}>×</button></div><div className="modal-body"><LeaveLetter leave={selectedLeave} /></div><div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button><button className="btn" onClick={() => downloadLeavePDF(selectedLeave)}>Download PDF</button><button className="btn btn-primary" onClick={() => window.print()}>Print</button></div></> : modal === "posting" ? <><div className="modal-head"><h3>Post a role</h3><button className="x-btn" onClick={closeModal}>×</button></div><div className="modal-body"><div className="field"><label>Title</label><input placeholder="e.g. Fleet Dispatcher" value={postingForm.title} onChange={(event) => setPostingForm({ ...postingForm, title: event.target.value })} /></div><div className="grid g-2"><div className="field"><label>Location</label><input placeholder="e.g. Lagos" value={postingForm.location} onChange={(event) => setPostingForm({ ...postingForm, location: event.target.value })} /></div><div className="field"><label>Type</label><select value={postingForm.type} onChange={(event) => setPostingForm({ ...postingForm, type: event.target.value })}><option>Full-time</option><option>Part-time</option><option>Contract</option></select></div></div><div className="field"><label>Description</label><textarea rows={3} value={postingForm.desc} onChange={(event) => setPostingForm({ ...postingForm, desc: event.target.value })} /></div></div><div className="modal-foot"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={savePosting}>Post role</button></div></> : <><div className="modal-head"><h3>Apply for leave</h3><button className="x-btn" onClick={closeModal}>×</button></div><div className="modal-body"><div className="field"><label>Employee</label><select value={leaveForm.name} onChange={(event) => setLeaveForm({ ...leaveForm, name: event.target.value })}>{dashboardDB.employees.map((employee) => <option key={employee.name}>{employee.name}</option>)}</select></div><div className="grid g-2"><div className="field"><label>Type</label><select value={leaveForm.type} onChange={(event) => setLeaveForm({ ...leaveForm, type: event.target.value })}>{leaveTypes.map((type) => <option key={type}>{type}</option>)}</select></div><div className="field" /><div className="field"><label>From</label><input type="date" value={leaveForm.from} onChange={(event) => setLeaveForm({ ...leaveForm, from: event.target.value })} /></div><div className="field"><label>To</label><input type="date" value={leaveForm.to} onChange={(event) => setLeaveForm({ ...leaveForm, to: event.target.value })} /></div></div><div className="field"><label>Reason</label><textarea rows={2} value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} /></div></div><div className="modal-foot"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={saveLeave}>Submit application</button></div></>}
    </div></div>}
    {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
  </>;
}
