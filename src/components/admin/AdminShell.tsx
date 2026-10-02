"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppState } from "@/context/AppContext";
import { canAccessAdminPath, defaultAdminPath } from "@/lib/admin-access";
import { isSimulationMode } from "@/lib/supabase/mode";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Calculator } from "./Calculator";

type AdminShellProps = {
  children?: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const { currentUser, authReady } = useAppState();
  const router = useRouter();
  const pathname = usePathname();
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => {
    if (authReady && (!currentUser || currentUser.type !== "admin")) router.replace("/");
    else if (authReady && currentUser?.type === "admin" && !canAccessAdminPath(currentUser.modules, pathname)) {
      router.replace(defaultAdminPath(currentUser.modules));
    }
  }, [authReady, currentUser, pathname, router]);

  if (!authReady || !currentUser || currentUser.type !== "admin" || !canAccessAdminPath(currentUser.modules, pathname)) return null;
  return (
    <div id="app" style={{ display: "flex" }}>
      <Sidebar onOpenCalculator={() => setCalculatorOpen(true)} />
      <div id="shell">
        <Topbar onOpenCalculator={() => setCalculatorOpen(true)} />
        <main id="main">
          {isSimulationMode() && <div className="demo-banner" role="status">Simulation mode. Changes are saved only in this browser.</div>}
          {children}
        </main>
      </div>
      {calculatorOpen && <Calculator onClose={() => setCalculatorOpen(false)} />}
    </div>
  );
}
