/* oxlint-disable react/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { backend, backendConfigured } from "../lib/backend";
import { useAuth } from "./AuthContext";

export const PERMISSION_LABELS = {
  dashboard_view: "View editorial dashboard",
  publish_stories: "Add and publish stories",
  manage_own_stories: "Edit and delete own stories",
  manage_all_stories: "Manage every reporter’s stories",
  manage_categories: "Add, edit, and delete news categories",
  manage_ads: "Manage advertising",
  manage_staff: "Invite, deactivate, and delete reporters",
  manage_news_cuts: "Create and download News Cut graphics",
} as const;
export type PermissionKey = keyof typeof PERMISSION_LABELS;
export type ReporterPermissions = Record<PermissionKey, boolean>;
export const DEFAULT_REPORTER_PERMISSIONS: ReporterPermissions = {
  dashboard_view: true,
  publish_stories: true,
  manage_own_stories: true,
  manage_all_stories: false,
  manage_categories: false,
  manage_ads: false,
  manage_staff: false,
  manage_news_cuts: false,
};
type PermissionsValue = { permissions: ReporterPermissions; loading: boolean; can: (permission: PermissionKey) => boolean; save: (next: ReporterPermissions) => Promise<void> };
const Context = createContext<PermissionsValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(DEFAULT_REPORTER_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!user || user.role === "super_admin" || !backendConfigured) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    backend.rows<ReporterPermissions>("reporter_permissions", "select=*&id=eq.true&limit=1")
      .then((rows) => { if (active && rows[0]) setPermissions({ ...DEFAULT_REPORTER_PERMISSIONS, ...rows[0] }); })
      .catch((error) => console.error("Unable to load reporter permissions", error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);
  const can = useCallback((permission: PermissionKey) => user?.role === "super_admin" || permissions[permission], [user, permissions]);
  const save = useCallback(async (next: ReporterPermissions) => {
    await backend.update("reporter_permissions", "id=eq.true", next);
    setPermissions(next);
  }, []);
  return <Context.Provider value={{ permissions, loading, can, save }}>{children}</Context.Provider>;
}
export function usePermissions() {
  const value = useContext(Context);
  if (!value) throw new Error("usePermissions must be used within a PermissionsProvider");
  return value;
}
