"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { Dashboard } from "@/components/admin/Dashboard";
import { Finance } from "@/components/admin/Finance";
import { useAppState } from "@/context/AppContext";

export default function HomePage() {
  const { currentView } = useAppState();

  return (
    <AdminShell>
      {currentView === "finance" ? <Finance /> : <Dashboard />}
    </AdminShell>
  );
}
