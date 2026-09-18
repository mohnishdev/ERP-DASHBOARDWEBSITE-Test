"use client";

import { useEffect, useState } from "react";
import { authStorageKey, useAppDispatch, useAppState, useNavigate } from "@/context/AppContext";
import { viewLabels } from "@/context/AppContext";

export function Topbar() {
  const { currentView, sidebarOpen, soundOn, theme, currentUser } = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<"notifications" | "profile" | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const logout = () => {
    sessionStorage.removeItem(authStorageKey);
    dispatch({ type: "SET_CURRENT_USER", user: null });
    navigate("dashboard");
  };

  const initials = currentUser?.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "AJ";
  const toggleTheme = () => dispatch({ type: "SET_THEME", theme: theme === "light" ? "dark" : "light" });

  return (
    <header id="topbar" style={{ position: "relative" }}>
      <div className="topbar-left">
        <button id="menu-toggle" type="button" aria-label="Toggle menu" onClick={() => dispatch({ type: "SET_SIDEBAR_OPEN", open: !sidebarOpen })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="crumb">{viewLabels[currentView] || currentView}</div>
      </div>

      <div className="topbar-right">
        <button className={`icon-btn${soundOn ? " on" : ""}`} type="button" aria-label="Notification sound" title={soundOn ? "Mute notification sound" : "Enable notification sound"} onClick={() => dispatch({ type: "SET_SOUND", soundOn: !soundOn })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5a5 5 0 0 1 0 10v4H9.5a1 1 0 0 1-.8-.4L6 15H4v-6h2l2.7-3.6a1 1 0 0 1 .8-.4H11z" />
            <path d="M15 9.5a4 4 0 0 1 0 5" />
          </svg>
        </button>

        <button className="icon-btn" type="button" aria-label="Notifications" title="Notifications" onClick={() => setPanel(panel === "notifications" ? null : "notifications")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
          <span className="badge-dot">2</span>
        </button>

        <button className="icon-btn" type="button" aria-label="Toggle theme" title="Toggle theme" onClick={toggleTheme}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </button>

        <button className="avatar" type="button" title="My profile" aria-label="My profile" onClick={() => setPanel(panel === "profile" ? null : "profile")}>{initials}</button>

        <button className="icon-btn" type="button" aria-label="Log out" title="Log out" onClick={logout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>
      {panel === "notifications" && <div className="topbar-panel"><div className="topbar-panel-head"><strong>Notifications</strong><button type="button" onClick={() => setPanel(null)}>×</button></div><div className="topbar-panel-item"><span className="dot red-dot" />Vehicle KJA-441-XL maintenance is due</div><div className="topbar-panel-item"><span className="dot amber-dot" />Driver licence expiry needs review</div></div>}
      {panel === "profile" && <div className="topbar-panel profile-panel"><div className="topbar-panel-head"><strong>My profile</strong><button type="button" onClick={() => setPanel(null)}>×</button></div><div className="profile-name">{currentUser?.name || "Admin user"}</div><div className="profile-role">{currentUser?.role || "Super Admin"}</div><div className="profile-email">{currentUser?.email || "admin@jaadlogistics.com"}</div></div>}
    </header>
  );
}
