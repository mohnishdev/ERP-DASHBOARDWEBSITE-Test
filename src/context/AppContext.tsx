"use client";

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DB } from "@/data/db";

type CurrentUser = {
  email: string;
  name: string;
  role: string;
  modules: "all" | string[];
  type?: "admin" | "customer";
} | null;

type AppState = {
  currentView: string;
  currentTab: Record<string, string>;
  theme: "light" | "dark";
  soundOn: boolean;
  previewRole: string | null;
  DB: typeof DB;
  currentUser: CurrentUser;
  sidebarOpen: boolean;
};

type AppAction =
  | { type: "SET_CURRENT_VIEW"; view: string }
  | { type: "SET_CURRENT_TAB"; view: string; tab: string }
  | { type: "SET_THEME"; theme: "light" | "dark" }
  | { type: "SET_SOUND"; soundOn: boolean }
  | { type: "SET_PREVIEW_ROLE"; role: string | null }
  | { type: "SET_CURRENT_USER"; user: CurrentUser }
  | { type: "SET_DB"; DB: typeof DB }
  | { type: "SET_SIDEBAR_OPEN"; open: boolean };

export const viewLabels: Record<string, string> = {
  dashboard: "Dashboard",
  crm: "CRM & Leads",
  customers: "Customer Management",
  shipments: "Shipment Operations",
  fleet: "Fleet",
  drivers: "Driver Management",
  warehouse: "Warehouse",
  finance: "Finance",
  calculator: "Calculator",
  hr: "HR & Careers",
  support: "Support",
  reports: "Reports",
  admin: "Administration",
};

const initialState: AppState = {
  currentView: "dashboard",
  currentTab: {},
  theme: "light",
  soundOn: true,
  previewRole: null,
  DB,
  currentUser: null,
  sidebarOpen: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CURRENT_VIEW":
      return { ...state, currentView: action.view };
    case "SET_CURRENT_TAB":
      return { ...state, currentTab: { ...state.currentTab, [action.view]: action.tab } };
    case "SET_THEME":
      return { ...state, theme: action.theme };
    case "SET_SOUND":
      return { ...state, soundOn: action.soundOn };
    case "SET_PREVIEW_ROLE":
      return { ...state, previewRole: action.role };
    case "SET_CURRENT_USER":
      return { ...state, currentUser: action.user };
    case "SET_DB":
      return { ...state, DB: action.DB };
    case "SET_SIDEBAR_OPEN":
      return { ...state, sidebarOpen: action.open };
    default:
      return state;
  }
}

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<Dispatch<AppAction> | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const router = useRouter();

  const navigate = (view: string) => {
    dispatch({ type: "SET_CURRENT_VIEW", view });
    dispatch({ type: "SET_SIDEBAR_OPEN", open: false });
    if (view === "dashboard") router.push("/");
    if (view === "crm") router.push("/admin/crm-leads");
    if (view === "customers") router.push("/admin/customers");
    if (view === "shipments") router.push("/admin/shipments");
    window.scrollTo(0, 0);
  };

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        <NavigationContext.Provider value={navigate}>{children}</NavigationContext.Provider>
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

const NavigationContext = createContext<((view: string) => void) | undefined>(undefined);

export function useAppState() {
  const state = useContext(AppStateContext);
  if (!state) throw new Error("useAppState must be used within AppProvider");
  return state;
}

export function useAppDispatch() {
  const dispatch = useContext(AppDispatchContext);
  if (!dispatch) throw new Error("useAppDispatch must be used within AppProvider");
  return dispatch;
}

export function useNavigate() {
  const navigate = useContext(NavigationContext);
  if (!navigate) throw new Error("useNavigate must be used within AppProvider");
  return navigate;
}
