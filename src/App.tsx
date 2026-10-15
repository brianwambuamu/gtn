import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "./App.css";
import BreakingTicker from "./components/BreakingTicker";
import Footer from "./components/Footer";
import HeaderNav from "./components/HeaderNav";
import SearchResults from "./components/SearchResults";
import AdminPage from "./pages/AdminPage";
import CategoryPage from "./pages/CategoryPage";
import ForYouPage from "./pages/ForYouPage";
import NewsPage from "./pages/NewsPage";
import StoryPage from "./pages/StoryPage";
import TvPage from "./pages/TvPage";
import { useAuth } from "./store/AuthContext";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { invitationPending } = useAuth();
  const [entry, setEntry] = useState<{ path: string; query: string }>({
    path: location.pathname,
    query: "",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (invitationPending && location.pathname !== "/admin") {
      navigate("/admin", { replace: true });
    }
  }, [invitationPending, location.pathname, navigate]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEntry({ path: location.pathname, query: "" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [location.pathname]);

  const query = entry.path === location.pathname ? entry.query : "";
  const setQuery = (value: string) =>
    setEntry({ path: location.pathname, query: value });
  const searching = query.trim().length > 1;

  return (
    <>
      <HeaderNav query={query} onQueryChange={setQuery} />
      <BreakingTicker />
      {searching && <SearchResults query={query} />}
      <Routes>
        <Route path="/" element={<ForYouPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/tv" element={<TvPage />} />
        <Route path="/radio" element={<Navigate to="/tv" replace />} />
        <Route path="/podcasts" element={<Navigate to="/tv" replace />} />
        <Route path="/live-events" element={<Navigate to="/tv" replace />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/story/:id" element={<StoryPage />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <div className={location.pathname.startsWith("/admin") ? "site-footer site-footer--workspace" : "site-footer"}>
        <Footer />
      </div>
    </>
  );
}
