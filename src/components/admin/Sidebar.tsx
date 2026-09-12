"use client";

import type { ReactNode } from "react";
import { useAppState, useNavigate } from "@/context/AppContext";

type NavItem = {
  key: string;
  label: string;
  icon: "grid" | "funnel" | "idcard" | "box" | "truck" | "wheel" | "shelf" | "bank" | "calc" | "people" | "headset" | "chart" | "shield";
  active?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ key: "dashboard", label: "Dashboard", icon: "grid" }],
  },
  {
    label: "Revenue & Clients",
    items: [
      { key: "crm", label: "CRM & Leads", icon: "funnel" },
      { key: "customers", label: "Customer Management", icon: "idcard" },
    ],
  },
  {
    label: "Operations",
    items: [
      { key: "shipments", label: "Shipment Operations", icon: "box" },
      { key: "fleet", label: "Fleet", icon: "truck" },
      { key: "drivers", label: "Driver Management", icon: "wheel" },
      { key: "warehouse", label: "Warehouse", icon: "shelf" },
    ],
  },
  {
    label: "Finance & People",
    items: [
      { key: "finance", label: "Finance", icon: "bank" },
      { key: "calculator", label: "Calculator", icon: "calc" },
      { key: "hr", label: "HR & Careers", icon: "people" },
    ],
  },
  {
    label: "Service & Insight",
    items: [
      { key: "support", label: "Support", icon: "headset" },
      { key: "reports", label: "Reports", icon: "chart" },
    ],
  },
  {
    label: "System",
    items: [{ key: "admin", label: "Administration", icon: "shield" }],
  },
];

function iconMarkup(icon: NavItem["icon"]) {
  const icons: Record<NavItem["icon"], ReactNode> = {
    grid: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="4" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <rect x="3" y="12" width="7" height="9" rx="1.5" />
      </svg>
    ),
    funnel: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 6h16l-6.5 7v5l-3 2v-7L4 6z" />
      </svg>
    ),
    idcard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M8 12h.01M8 16h8M14 8h4" />
      </svg>
    ),
    box: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 8l9-5 9 5-9 5-9-5z" />
        <path d="M3 8v8l9 5 9-5V8" />
        <path d="M12 13v8" />
      </svg>
    ),
    truck: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 7h11v9H3z" />
        <path d="M14 10h3l3 3v3h-6z" />
        <circle cx="7.5" cy="17.5" r="2.25" />
        <circle cx="17.5" cy="17.5" r="2.25" />
      </svg>
    ),
    wheel: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    ),
    shelf: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 8h16M4 12h16M4 16h16" />
        <path d="M7 4v16M17 4v16" />
      </svg>
    ),
    bank: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10l9-6 9 6" />
        <path d="M5 10v8h14v-8M8 18v-5h2v5M14 18v-5h2v5" />
      </svg>
    ),
    calc: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h2M12 12h2M8 16h2M12 16h2" />
      </svg>
    ),
    people: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
        <circle cx="9.5" cy="7" r="3" />
        <path d="M20 19v-1a4 4 0 0 0-3-3.87" />
        <path d="M16 4.13a4 4 0 0 1 0 7.74" />
      </svg>
    ),
    headset: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 13a8 8 0 1 1 16 0" />
        <rect x="2" y="13" width="4" height="7" rx="2" />
        <rect x="18" y="13" width="4" height="7" rx="2" />
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15V9M12 15V5M16 15v-7" />
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3z" />
        <path d="M9.5 12.5l1.5 1.5 3.5-4" />
      </svg>
    ),
  };

  return icons[icon];
}

export function Sidebar() {
  const { currentView, sidebarOpen } = useAppState();
  const navigate = useNavigate();

  return (
    <aside id="sidebar" className={sidebarOpen ? "open" : undefined}>
      <div className="brand">
        <img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" />
        <div>
          <div className="brand-word">JAAD ERP</div>
          <div className="brand-sub">Operations</div>
        </div>
      </div>

      <nav className="navlist">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`nav-item${currentView === item.key ? " active" : ""}`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(item.key);
                }}
              >
                {iconMarkup(item.icon)}
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        JAAD Logistics Ltd
        <br />
        Lagos, Nigeria &middot; est. 2018
        <br />
        Prototype build, sample data only
      </div>
    </aside>
  );
}
