export function Topbar() {
  return (
    <header id="topbar">
      <div className="topbar-left">
        <button id="menu-toggle" type="button" aria-label="Toggle menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="crumb">Dashboard</div>
      </div>

      <div className="topbar-right">
        <button className="icon-btn on" type="button" aria-label="Notification sound" title="Notification sound">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5a5 5 0 0 1 0 10v4H9.5a1 1 0 0 1-.8-.4L6 15H4v-6h2l2.7-3.6a1 1 0 0 1 .8-.4H11z" />
            <path d="M15 9.5a4 4 0 0 1 0 5" />
          </svg>
        </button>

        <button className="icon-btn" type="button" aria-label="Notifications" title="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
          <span className="badge-dot">2</span>
        </button>

        <button className="icon-btn" type="button" aria-label="Toggle theme" title="Toggle theme">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </button>

        <div className="avatar" title="My profile" aria-label="My profile">AJ</div>

        <button className="icon-btn" type="button" aria-label="Log out" title="Log out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>
    </header>
  );
}
