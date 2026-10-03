"use client";

import { useEffect, useState } from "react";
import { AdminTable } from "./AdminTable";
import { dashboardDB, type AdminRole, type AdminUser, type Announcement, type Integration } from "@/lib/dashboard";
import { useAppDispatch, useAppState, useNavigate, viewLabels } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { isSimulationMode } from "@/lib/supabase/mode";

const tabs = [
  ["users", "Users"],
  ["roles", "Roles & access"],
  ["announcements", "Announcements"],
  ["audit", "Audit log"],
  ["integrations", "Integrations"],
] as const;

export function Administration() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentTab, currentView } = useAppState();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number][0]>((currentTab.admin as (typeof tabs)[number][0]) || "users");
  const [users, setUsers] = useState<AdminUser[]>(dashboardDB.users);
  const [roles, setRoles] = useState<AdminRole[]>(dashboardDB.roles);
  const [announcements, setAnnouncements] = useState<Announcement[]>(dashboardDB.announcements);
  const [modal, setModal] = useState<"user" | "announcement" | "role" | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [previewRoleSelection, setPreviewRoleSelection] = useState(dashboardDB.roles[0]?.role || "");
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "" });
  const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "" });
  const [toast, setToast] = useState("");

  const loadAdministrationData = async () => {
    if (isSimulationMode()) return;
    try {
      const supabase = createClient();
      const [profileResult, roleResult, announcementResult, auditResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, status, role_id"),
        supabase.from("roles").select("id, name, description, permitted_modules").order("name"),
        supabase.from("announcements").select("id, title, body, created_at").order("created_at", { ascending: false }),
        supabase.from("audit_log").select("actor_name, action, created_at").order("created_at", { ascending: false }).limit(200),
      ]);
      const error = profileResult.error || roleResult.error || announcementResult.error || auditResult.error;
      if (error) throw error;
      const roleRows: AdminRole[] = (roleResult.data || []).map((role) => ({ id: role.id, role: role.name, desc: role.description || "", users: 0, perms: role.permitted_modules || [] }));
      const roleNames = new Map(roleRows.map((role) => [role.id, role.role]));
      const nextUsers: AdminUser[] = (profileResult.data || []).map((profile) => ({ id: profile.id, name: profile.full_name, email: profile.email, status: profile.status, role: roleNames.get(profile.role_id) || "Unassigned" }));
      roleRows.forEach((role) => { role.users = nextUsers.filter((user) => user.role === role.role).length; });
      const nextAnnouncements: Announcement[] = (announcementResult.data || []).map((announcement) => ({ id: announcement.id, title: announcement.title, body: announcement.body, date: new Date(announcement.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) }));
      const nextAudit = (auditResult.data || []).map((entry) => ({ who: entry.actor_name, action: entry.action, time: new Date(entry.created_at).toLocaleString("en-GB") }));
      dashboardDB.users.splice(0, dashboardDB.users.length, ...nextUsers);
      dashboardDB.roles.splice(0, dashboardDB.roles.length, ...roleRows);
      dashboardDB.announcements.splice(0, dashboardDB.announcements.length, ...nextAnnouncements);
      dashboardDB.auditLog.splice(0, dashboardDB.auditLog.length, ...nextAudit);
      setUsers(nextUsers);
      setRoles(roleRows);
      setAnnouncements(nextAnnouncements);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not load administration data");
    }
  };

  useEffect(() => {
    dispatch({ type: "SET_CURRENT_VIEW", view: "admin" });
    if (!isSimulationMode()) queueMicrotask(() => { void loadAdministrationData(); });
  }, [dispatch]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const selectTab = (tab: (typeof tabs)[number][0]) => {
    setActiveTab(tab);
    dispatch({ type: "SET_CURRENT_TAB", view: "admin", tab });
  };

  const updateUserStatus = async (user: AdminUser, status: string) => {
    if (!isSimulationMode()) {
      try {
        if (!user.id) throw new Error("User record is missing its database ID");
        const supabase = createClient();
        const { error } = await supabase.rpc("admin_set_profile_status", { target_profile_id: user.id, target_status: status });
        if (error) throw error;
        user.status = status;
        setUsers([...users]);
      } catch (error) { showToast(error instanceof Error ? error.message : "Could not update user status"); }
      return;
    }
    user.status = status;
    setUsers([...dashboardDB.users]);
    showToast(`${user.name} set to ${status}`);
  };

  const addUser = async () => {
    if (!userForm.name.trim() || !userForm.email.trim()) { showToast("Name and email are required"); return; }
    if (!isSimulationMode()) {
      const role = roles.find((candidate) => candidate.role === userForm.role) || roles[0];
      if (!role?.id) { showToast("Choose a role with a valid database record"); return; }
      try {
        const response = await fetch("/api/admin/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: userForm.name.trim(), email: userForm.email.trim(), roleId: role.id }) });
        const result = await response.json() as { user?: AdminUser; error?: string };
        if (!response.ok || !result.user) throw new Error(result.error || "Staff invitation failed");
        setUsers((current) => [result.user as AdminUser, ...current]);
        setModal(null);
        setUserForm({ name: "", email: "", role: "" });
        selectTab("users");
        showToast(`Invitation sent to ${result.user.email}`);
      } catch (error) { showToast(error instanceof Error ? error.message : "Staff invitation failed"); }
      return;
    }
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
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase.from("announcements").insert({ title: announcementForm.title.trim(), body: announcementForm.body.trim() }).select("id, created_at").single();
          if (error) throw error;
          const announcement = { id: data.id, title: announcementForm.title.trim(), body: announcementForm.body.trim(), date: new Date(data.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) };
          dashboardDB.announcements.unshift(announcement);
          setAnnouncements([...dashboardDB.announcements]);
          setAnnouncementForm({ title: "", body: "" });
          setModal(null);
          showToast("Announcement posted");
        } catch (error) { showToast(error instanceof Error ? error.message : "Could not post announcement"); }
      })();
      return;
    }
    const announcement = { id: `an${Date.now()}`, title: announcementForm.title.trim(), body: announcementForm.body.trim(), date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) };
    dashboardDB.announcements.unshift(announcement);
    setAnnouncements([...dashboardDB.announcements]);
    setAnnouncementForm({ title: "", body: "" });
    setModal(null);
    showToast("Announcement posted, customers will see it on their dashboard");
  };

  const removeAnnouncement = (index: number) => {
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const announcement = announcements[index];
          const supabase = createClient();
          const { error } = await supabase.from("announcements").delete().eq("id", announcement.id);
          if (error) throw error;
          dashboardDB.announcements.splice(index, 1);
          setAnnouncements([...dashboardDB.announcements]);
          showToast("Announcement removed");
        } catch (error) { showToast(error instanceof Error ? error.message : "Could not remove announcement"); }
      })();
      return;
    }
    dashboardDB.announcements.splice(index, 1);
    setAnnouncements([...dashboardDB.announcements]);
    showToast("Announcement removed");
  };

  const saveRoleAccess = (permissions: string[]) => {
    if (selectedRole === null) return;
    if (!isSimulationMode()) {
      const selected = roles[selectedRole];
      const roleId = selected?.id;
      const roleName = selected?.role || "Role";
      void (async () => {
        try {
          if (!roleId) throw new Error("Role record is missing its database ID");
          const supabase = createClient();
          const { error } = await supabase.from("roles").update({ permitted_modules: permissions }).eq("id", roleId);
          if (error) throw error;
          setRoles((current) => current.map((role, index) => index === selectedRole ? { ...role, perms: permissions } : role));
          setModal(null);
          showToast(`${roleName} access updated`);
        } catch (error) { showToast(error instanceof Error ? error.message : "Could not update role access"); }
      })();
      return;
    }
    dashboardDB.roles.splice(selectedRole, 1, { ...dashboardDB.roles[selectedRole], perms: permissions });
    setRoles([...dashboardDB.roles]);
    setModal(null);
    showToast(`${dashboardDB.roles[selectedRole].role} access updated`);
  };

  const previewAsRole = () => {
    const role = roles.find((item) => item.role === previewRoleSelection);
    if (!role) return;
    dispatch({ type: "SET_PREVIEW_ROLE", role: role.role });
    const routePermissions = role.perms.filter((permission) => permission !== "calculator");
    const destination = routePermissions.includes(currentView) ? currentView : routePermissions[0] || "dashboard";
    navigate(destination);
    showToast(`Now previewing the sidebar as ${role.role}`);
  };

  const renderUsers = () => <AdminTable<AdminUser> columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role" }, { key: "status", label: "Status", render: (user) => <select className={`switch-select st-${user.status.toLowerCase()}`} value={user.status} onChange={(event) => updateUserStatus(user, event.target.value)}>{["Active", "Suspended"].map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={users} />;
  const renderRoles = () => <>
    <AdminTable<AdminRole> columns={[{ key: "role", label: "Role", render: (role) => <b>{role.role}</b> }, { key: "desc", label: "Description" }, { key: "users", label: "Users" }, { key: "perms", label: "Modules granted", render: (role) => role.perms.map((permission) => viewLabels[permission] || permission).join(", ") }, { key: "role", label: "Access", render: (role) => <button className="btn btn-sm" type="button" onClick={() => { setSelectedRole(roles.indexOf(role)); setModal("role"); }}>Edit access</button> }]} data={roles} />
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-title" style={{ marginBottom: 10 }}>Preview the sidebar as a role</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="Preview role" value={previewRoleSelection} onChange={(event) => setPreviewRoleSelection(event.target.value)}>{roles.map((role) => <option key={role.role}>{role.role}</option>)}</select>
        <button className="btn btn-primary btn-sm" type="button" onClick={previewAsRole}>Preview</button>
        <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>Sidebar will only show that role&apos;s granted modules until you exit preview.</span>
      </div>
    </div>
  </>;
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
