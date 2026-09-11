import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type AdminShellProps = {
  children?: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div id="app" style={{ display: "flex" }}>
      <Sidebar />
      <div id="shell">
        <Topbar />
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
