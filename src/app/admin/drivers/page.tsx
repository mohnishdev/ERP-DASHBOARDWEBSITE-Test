import { AdminShell } from "@/components/admin/AdminShell";
import { DriverManagement } from "@/components/admin/DriverManagement";

export default function DriversPage() {
  return (
    <AdminShell>
      <DriverManagement />
    </AdminShell>
  );
}
