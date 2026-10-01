"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/context/AppContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Calculator } from "./Calculator";

type AdminShellProps = {
  children?: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const { currentUser, authReady } = useAppState();
  const router = useRouter();
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => {
    if (authReady && (!currentUser || currentUser.type !== "admin")) router.replace("/");
  }, [authReady, currentUser, router]);

  if (!authReady || !currentUser || currentUser.type !== "admin") return null;
  return (
    <div id="app" style={{ display: "flex" }}>
      <Sidebar onOpenCalculator={() => setCalculatorOpen(true)} />
      <div id="shell">
        <Topbar onOpenCalculator={() => setCalculatorOpen(true)} />
        <main id="main">{children}</main>
      </div>
      {calculatorOpen && <Calculator onClose={() => setCalculatorOpen(false)} />}
    </div>
  );
}
