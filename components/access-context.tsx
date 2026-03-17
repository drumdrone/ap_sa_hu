"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AccessRole = "viewer" | "editor";

type AccessContextValue = {
  role: AccessRole | null;
  setRole: (role: AccessRole) => void;
  logout: () => void;
};

const AccessContext = createContext<AccessContextValue | undefined>(undefined);

const STORAGE_KEY = "apotheke_sales_hub_role";

export function AccessProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<AccessRole | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as AccessRole | null;
    if (stored === "viewer" || stored === "editor") {
      setRoleState(stored);
    }
  }, []);

  const setRole = (next: AccessRole) => {
    setRoleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const logout = () => {
    setRoleState(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <AccessContext.Provider value={{ role, setRole, logout }}>
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error("useAccess must be used within AccessProvider");
  }
  return ctx;
}

