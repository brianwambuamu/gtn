/* oxlint-disable react/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CATEGORIES } from "../data/categories";
import { backend, backendConfigured } from "../lib/backend";

type CategoryRow = { id: string; name: string; slug: string; sort_order: number };
type CategoriesValue = { categories: string[]; refreshCategories: () => Promise<string[]> };
const CategoriesContext = createContext<CategoriesValue | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState(CATEGORIES);
  const refreshCategories = useCallback(async () => {
    if (!backendConfigured) return categories;
    const rows = await backend.rows<CategoryRow>("site_categories", "select=id,name,slug,sort_order&order=sort_order.asc,name.asc");
    const next = rows.length ? rows.map((row) => row.name) : CATEGORIES;
    setCategories(next);
    return next;
  }, [categories]);
  useEffect(() => {
    if (!backendConfigured) return;
    let active = true;
    backend.rows<CategoryRow>("site_categories", "select=id,name,slug,sort_order&order=sort_order.asc,name.asc")
      .then((rows) => { if (active) setCategories(rows.length ? rows.map((row) => row.name) : CATEGORIES); })
      .catch((error) => console.error("Unable to load news categories", error));
    return () => { active = false; };
  }, []);
  return <CategoriesContext.Provider value={{ categories, refreshCategories }}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const value = useContext(CategoriesContext);
  if (!value) throw new Error("useCategories must be used within a CategoriesProvider");
  return value;
}
