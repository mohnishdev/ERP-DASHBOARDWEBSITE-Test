"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/context/AppContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type AdminShellProps = {
  children?: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const { currentUser, authReady } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (authReady && (!currentUser || currentUser.type !== "admin")) router.replace("/");
  }, [authReady, currentUser, router]);

  if (!authReady || !currentUser || currentUser.type !== "admin") return null;
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
