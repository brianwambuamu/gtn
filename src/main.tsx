import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./store/AuthContext.tsx";
import { NewsProvider } from "./store/NewsContext.tsx";
import { AdsProvider } from "./store/AdsContext.tsx";
import { CategoriesProvider } from "./store/CategoriesContext.tsx";
import { PermissionsProvider } from "./store/PermissionsContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdsProvider>
          <PermissionsProvider>
            <CategoriesProvider>
              <NewsProvider>
                <App />
              </NewsProvider>
            </CategoriesProvider>
          </PermissionsProvider>
        </AdsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
