"use client";

import { useEffect, useState } from "react";
import { AdminTable } from "./AdminTable";
import { dashboardDB, type AdminRole, type AdminUser, type Announcement, type Integration } from "@/lib/dashboard";
import { useAppDispatch, useAppState, viewLabels } from "@/context/AppContext";

const tabs = [
  ["users", "Users"],
  ["roles", "Roles & access"],
  ["announcements", "Announcements"],
  ["audit", "Audit log"],
  ["integrations", "Integrations"],
] as const;

export function Administration() {
  const dispatch = useAppDispatch();
  const { currentTab } = useAppState();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number][0]>((currentTab.admin as (typeof tabs)[number][0]) || "users");
  const [users, setUsers] = useState<AdminUser[]>(dashboardDB.users);
  const [roles, setRoles] = useState<AdminRole[]>(dashboardDB.roles);
  const [announcements, setAnnouncements] = useState<Announcement[]>(dashboardDB.announcements);
  const [modal, setModal] = useState<"user" | "announcement" | "role" | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "" });
  const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "" });
  const [toast, setToast] = useState("");

  useEffect(() => {
    dispatch({ type: "SET_CURRENT_VIEW", view: "admin" });
  }, [dispatch]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const selectTab = (tab: (typeof tabs)[number][0]) => {
    setActiveTab(tab);
    dispatch({ type: "SET_CURRENT_TAB", view: "admin", tab });
  };

  const updateUserStatus = (user: AdminUser, status: string) => {
    user.status = status;
    setUsers([...dashboardDB.users]);
    showToast(`${user.name} set to ${status}`);
  };

  const addUser = () => {
    if (!userForm.name.trim() || !userForm.email.trim()) { showToast("Name and email are required"); return; }
    const user = { name: userForm.name.trim(), email: userForm.email.trim(), role: userForm.role || dashboardDB.roles[0].role, status: "Active" };
    dashboardDB.users.unshift(user);
    setUsers([...dashboardDB.users]);
    setModal(null);
    setUserForm({ name: "", email: "", role: "" });
    selectTab("users");
    showToast(`User added: ${user.name}`);
  };

  const saveAnnouncement = () => {
    if (!announcementForm.title.trim() || !announcementForm.body.trim()) { showToast("Add a title and a message"); return; }
    const announcement = { id: `an${Date.now()}`, title: announcementForm.title.trim(), body: announcementForm.body.trim(), date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) };
    dashboardDB.announcements.unshift(announcement);
    setAnnouncements([...dashboardDB.announcements]);
    setAnnouncementForm({ title: "", body: "" });
    setModal(null);
    showToast("Announcement posted, customers will see it on their dashboard");
  };

  const removeAnnouncement = (index: number) => {
    dashboardDB.announcements.splice(index, 1);
    setAnnouncements([...dashboardDB.announcements]);
    showToast("Announcement removed");
  };

  const saveRoleAccess = (permissions: string[]) => {
    if (selectedRole === null) return;
    dashboardDB.roles[selectedRole].perms = permissions;
    setRoles([...dashboardDB.roles]);
    setModal(null);
    showToast(`${dashboardDB.roles[selectedRole].role} access updated`);
  };

  const renderUsers = () => <AdminTable<AdminUser> columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role" }, { key: "status", label: "Status", render: (user) => <select className={`switch-select st-${user.status.toLowerCase()}`} value={user.status} onChange={(event) => updateUserStatus(user, event.target.value)}>{["Active", "Suspended"].map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={users} />;
  const renderRoles = () => <><AdminTable<AdminRole> columns={[{ key: "role", label: "Role", render: (role) => <b>{role.role}</b> }, { key: "desc", label: "Description" }, { key: "users", label: "Users" }, { key: "perms", label: "Modules granted", render: (role) => role.perms.map((permission) => viewLabels[permission] || permission).join(", ") }, { key: "role", label: "Access", render: (role) => <button className="btn btn-sm" type="button" onClick={() => { setSelectedRole(roles.indexOf(role)); setModal("role"); }}>Edit access</button> }]} data={roles} /><div className="card" style={{ marginTop: 16 }}><div className="card-title" style={{ marginBottom: 10 }}>Preview the sidebar as a role</div><p className="note">Role preview is available when the connected administration service is enabled.</p></div></>;
  const renderAnnouncements = () => <><div className="note">Active announcements show as a banner on every customer&apos;s dashboard.</div>{announcements.length ? announcements.map((announcement, index) => <div className="card" style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }} key={announcement.id}><div><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{announcement.title}</div><p style={{ margin: 0, fontSize: 12.4, color: "var(--text-dim)" }}>{announcement.body}</p><div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 6 }}>Posted {announcement.date}</div></div><button className="btn btn-sm btn-danger" type="button" onClick={() => removeAnnouncement(index)}>Remove</button></div>) : <div className="empty">No active announcements</div>}</>;
  const renderAudit = () => <AdminTable columns={[{ key: "who", label: "User" }, { key: "action", label: "Action" }, { key: "time", label: "Time" }]} data={dashboardDB.auditLog} />;
  const renderIntegrations = () => <><div className="note">Status shown here is illustrative. It reflects what needs wiring, not a live connection check.</div><AdminTable<Integration> columns={[{ key: "name", label: "Integration" }, { key: "status", label: "Status", render: (integration) => <span className={`badge ${integration.status === "Connected" ? "st-connected" : "b-gray"}`}>{integration.status}</span> }]} data={dashboardDB.integrations} /></>;

  const closeModal = () => { setModal(null); setSelectedRole(null); };
  const selectedRoleData = selectedRole === null ? null : roles[selectedRole];
  const body = activeTab === "users" ? renderUsers() : activeTab === "roles" ? renderRoles() : activeTab === "announcements" ? renderAnnouncements() : activeTab === "audit" ? renderAudit() : renderIntegrations();

  return (
    <>
      <div className="view-head">
        <div><h1>Administration</h1><p>RBAC, audit trail, users and integrations.</p></div>
      </div>
      <div className="tabs admin-tabs">
        {tabs.map(([key, label]) => <button className={`admin-tab${activeTab === key ? " active" : ""}`} type="button" key={key} onClick={() => selectTab(key)}>{label}</button>)}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>{activeTab === "users" && <button className="btn btn-primary" type="button" onClick={() => setModal("user")}>＋ Add user</button>}{activeTab === "announcements" && <button className="btn btn-primary" type="button" onClick={() => setModal("announcement")}>＋ New announcement</button>}</div>
      {body}
      {modal === "user" && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div className="modal"><div className="modal-head"><h3>Add user</h3><button className="x-btn" type="button" onClick={closeModal}>×</button></div><div className="modal-body"><div className="field"><label>Name</label><input value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} /></div><div className="field"><label>Email</label><input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} /></div><div className="field"><label>Role</label><select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}><option value="">Choose a role</option>{roles.map((role) => <option value={role.role} key={role.role}>{role.role}</option>)}</select></div></div><div className="modal-foot"><button className="btn" type="button" onClick={closeModal}>Cancel</button><button className="btn btn-primary" type="button" onClick={addUser}>Add user</button></div></div></div>}
      {modal === "announcement" && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div className="modal"><div className="modal-head"><h3>New announcement</h3><button className="x-btn" type="button" onClick={closeModal}>×</button></div><div className="modal-body"><div className="field"><label>Title</label><input value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} /></div><div className="field"><label>Message</label><textarea rows={3} value={announcementForm.body} onChange={(event) => setAnnouncementForm({ ...announcementForm, body: event.target.value })} /></div></div><div className="modal-foot"><button className="btn" type="button" onClick={closeModal}>Cancel</button><button className="btn btn-primary" type="button" onClick={saveAnnouncement}>Post announcement</button></div></div></div>}
      {modal === "role" && selectedRoleData && <RoleAccessModal role={selectedRoleData} onClose={closeModal} onSave={saveRoleAccess} />}
      {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
    </>
  );
}

function RoleAccessModal({ role, onClose, onSave }: { role: AdminRole; onClose: () => void; onSave: (permissions: string[]) => void }) {
  const modules = ["dashboard", "crm", "customers", "shipments", "fleet", "drivers", "warehouse", "finance", "hr", "support", "reports", "admin"];
  const [permissions, setPermissions] = useState(role.perms);
  return <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal"><div className="modal-head"><h3>Edit access, {role.role}</h3><button className="x-btn" type="button" onClick={onClose}>×</button></div><div className="modal-body"><p style={{ fontSize: 12, color: "var(--text-dim)" }}>{role.desc}</p>{modules.map((module) => <label className="checkbox-row" key={module}><input type="checkbox" checked={permissions.includes(module)} onChange={(event) => setPermissions(event.target.checked ? [...permissions, module] : permissions.filter((item) => item !== module))} /><span>{viewLabels[module] || module}</span></label>)}</div><div className="modal-foot"><button className="btn" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="button" onClick={() => onSave(permissions)}>Save access</button></div></div></div>;
}
