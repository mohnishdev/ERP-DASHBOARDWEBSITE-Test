import { AdminShell } from "@/components/admin/AdminShell";
import { CustomerManagement } from "@/components/admin/CustomerManagement";

export default function CustomersPage() {
  return (
    <AdminShell>
      <CustomerManagement />
    </AdminShell>
  );
}
