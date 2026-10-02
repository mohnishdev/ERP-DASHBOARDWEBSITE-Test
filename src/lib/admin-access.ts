export const adminModuleRoutes: Readonly<Record<string, string>> = {
  dashboard: "/admin/dashboard",
  crm: "/admin/crm-leads",
  customers: "/admin/customers",
  shipments: "/admin/shipments",
  fleet: "/admin/fleet",
  drivers: "/admin/drivers",
  warehouse: "/admin/warehouse",
  finance: "/admin/finance",
  hr: "/admin/hr",
  support: "/admin/support",
  reports: "/admin/reports",
  admin: "/admin/admin",
};

export function adminModuleForPath(pathname: string) {
  return Object.entries(adminModuleRoutes).find(([, route]) => pathname === route || pathname.startsWith(`${route}/`))?.[0];
}

export function canAccessAdminPath(modules: "all" | string[], pathname: string) {
  if (modules === "all") return true;
  const requiredModule = adminModuleForPath(pathname);
  return !requiredModule || modules.includes(requiredModule);
}

export function defaultAdminPath(modules: "all" | string[]) {
  if (modules === "all" || modules.includes("dashboard")) return adminModuleRoutes.dashboard;
  return modules.map((module) => adminModuleRoutes[module]).find(Boolean) ?? "/admin/login?reason=staff-access";
}