import { AdminShell } from "@/components/admin/AdminShell";
import { Dashboard } from "@/components/admin/Dashboard";

export default function HomePage() {
  return (
    <AdminShell>
      <Dashboard />
    </AdminShell>
  );
}
