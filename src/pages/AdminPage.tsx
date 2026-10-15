import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import AuthPanel from "../components/AuthPanel";
import { slugify, slugToLabel } from "../data/categories";
import { mediaError, VIDEO_ACCEPT, VIDEO_MAX_MB } from "../data/media";
import type { StoryMedia } from "../data/media";
import type { Badge, Placement } from "../data/news";
import { backend } from "../lib/backend";
import { useAds } from "../store/AdsContext";
import type { AdMedia } from "../store/AdsContext";
import { useAuth } from "../store/AuthContext";
import type { StaffUser } from "../store/AuthContext";
import { useNews } from "../store/NewsContext";
import { useCategories } from "../store/CategoriesContext";
import { PERMISSION_LABELS, type PermissionKey, type ReporterPermissions, usePermissions } from "../store/PermissionsContext";

const BADGES: (Badge | "")[] = ["", "live", "video", "analysis", "exclusive"];

type MediaKind = "none" | "image" | "video" | "youtube" | "tiktok";
type AdKind = "text" | "image" | "video";
type SiteCategory = { id: string; name: string; slug: string; sort_order: number };

export default function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = location.pathname.split("/")[2] || "dashboard";
  const { user, signOut, inviteReporter, manageStaff, loading, invitationPending } = useAuth();
  const { stories, customStories, addStory, updateStory, deleteStory, refreshStories } =
    useNews();
  const { categories: newsCategories, refreshCategories } = useCategories();
  const { permissions, loading: permissionsLoading, can, save: savePermissions } = usePermissions();
  const { ads, addAd, deleteAd } = useAds();

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("News");
  const [author, setAuthor] = useState("");
  const [badge, setBadge] = useState<Badge | "">("");
  const [mediaKind, setMediaKind] = useState<MediaKind>("none");
  const [mediaUrl, setMediaUrl] = useState("");
  const [imageData, setImageData] = useState("");
  const [videoName, setVideoName] = useState("");
  const [mediaNote, setMediaNote] = useState("");
  const [placement, setPlacement] = useState<Placement | "">("");
  const [flash, setFlash] = useState("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [openStoryMenu, setOpenStoryMenu] = useState<string | null>(null);
  const [reporterEmail, setReporterEmail] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffLoaded, setStaffLoaded] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [categoryRows, setCategoryRows] = useState<SiteCategory[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [adHeadline, setAdHeadline] = useState("");
  const [adUrl, setAdUrl] = useState("");
  const [adKind, setAdKind] = useState<AdKind>("text");
  const [adTarget, setAdTarget] = useState("");
  const [adImageData, setAdImageData] = useState("");
  const [adVideoUrl, setAdVideoUrl] = useState("");
  const [adVideoName, setAdVideoName] = useState("");
  const [adMediaNote, setAdMediaNote] = useState("");


  useEffect(() => {
    if (newsCategories.length && !newsCategories.includes(category)) setCategory(newsCategories[0]);
  }, [newsCategories, category]);
  useEffect(() => {
    if (!window.matchMedia("(max-width: 600px)").matches) return;
    const nav = document.querySelector<HTMLElement>(".owner-sidebar__nav");
    const activeLink = nav?.querySelector<HTMLElement>(".owner-sidebar__link--active");
    if (!nav || !activeLink) return;
    const left = activeLink.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
    nav.scrollTo({ left: left - (nav.clientWidth - activeLink.clientWidth) / 2, behavior: "smooth" });
  }, [activePage]);

  useEffect(() => {
    if (!user || activePage !== "staff" || (user.role !== "super_admin" && !can("manage_staff"))) return;
    let active = true;
    backend.rows<StaffUser>("staff_profiles", "select=id,email,role,display_name,is_active&order=created_at.asc")
      .then((rows) => { if (active) { setStaff(rows); setStaffError(""); } })
      .catch((cause) => { if (active) setStaffError(cause instanceof Error ? cause.message : "Could not load staff accounts."); })
      .finally(() => { if (active) setStaffLoaded(true); });
    return () => { active = false; };
  }, [user, activePage, can]);

  useEffect(() => {
    if (!user || activePage !== "categories" || (user.role !== "super_admin" && !can("manage_categories"))) return;
    let active = true;
    backend.rows<SiteCategory>("site_categories", "select=id,name,slug,sort_order&order=sort_order.asc,name.asc")
      .then((rows) => { if (active) { setCategoryRows(rows); setCategoryError(""); } })
      .catch((cause) => { if (active) setCategoryError(cause instanceof Error ? cause.message : "Could not load categories."); });
    return () => { active = false; };
  }, [user, activePage, can]);

  if (loading) return <main className="container main"><p className="empty">Loading staff workspace…</p></main>;
  if (!user || invitationPending) {
    return (
      <main className="container main">
        <div className="cat-head">
          <h1>Editorial Desk</h1>
          <span>Sign in with your GTN staff account</span>
        </div>
        <AuthPanel />
      </main>
    );
  }
  const isSuperAdmin = user.role === "super_admin";
  if (!isSuperAdmin && permissionsLoading) return <main className="container main"><p className="empty">Loading reporter permissions…</p></main>;
  if (activePage === "stories") return <Navigate to="/admin/add-story" replace />;
  if (isSuperAdmin && !["dashboard", "add-story", "my-stories", "staff", "roles", "categories", "advertising"].includes(activePage)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  const reporterPages = [
    ...(can("dashboard_view") ? ["dashboard"] : []),
    ...(can("publish_stories") ? ["add-story"] : []),
    ...(can("manage_own_stories") || can("manage_all_stories") ? ["my-stories"] : []),
    ...(can("manage_categories") ? ["categories"] : []),
    ...(can("manage_staff") ? ["staff"] : []),
    ...(can("manage_ads") ? ["advertising"] : []),
  ];
  if (!isSuperAdmin && !reporterPages.includes(activePage)) {
    return <main className="container main"><p className="empty">This workspace feature is unavailable for your account. Contact the Super Admin if you need access.</p></main>;
  }

  const term = appliedQuery.trim().toLowerCase();
  const myStories = customStories.filter((story) => (story as typeof story & { reporter_id?: string }).reporter_id === user.id);
  const managedStories = isSuperAdmin || can("manage_all_stories") ? stories : myStories;
  const visible = managedStories.filter(
    (story) =>
      !term ||
      story.title.toLowerCase().includes(term) ||
      story.category.toLowerCase().includes(term),
  );

  const isUrlKind = mediaKind === "youtube" || mediaKind === "tiktok";
  const urlError =
    isUrlKind && mediaUrl.trim() ? mediaError(mediaUrl, mediaKind) : null;

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMediaNote("Please choose an image file (JPG, PNG, GIF or WebP).");
      return;
    }
    try { setImageData(await backend.upload(file)); setMediaNote(""); }
    catch (cause) { setMediaNote(cause instanceof Error ? cause.message : "Could not upload image."); }
  }

  async function onVideoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith("video/")) {
      setMediaNote("Please choose a video file (MP4, WebM, OGG or MOV).");
      return;
    }
    if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
      setMediaNote(
        `That video is too large. Keep it under ${VIDEO_MAX_MB} MB.`,
      );
      return;
    }
    try {
      setMediaUrl(await backend.upload(file));
      setVideoName(file.name);
      setMediaNote("");
    } catch {
      setMediaNote(
        "Could not store that video in this browser. Try a smaller file.",
      );
    }
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setExcerpt("");
    setAuthor("");
    setBadge("");
    setMediaKind("none");
    setMediaUrl("");
    setImageData("");
    setVideoName("");
    setMediaNote("");
    setPlacement("");
  }

  function buildMedia(): StoryMedia | null {
    if (mediaKind === "image") {
      if (!imageData) {
        setFlash("Choose a picture to attach, or set Media to None.");
        return null;
      }
      return { type: "image", url: imageData };
    }
    if (mediaKind === "video") {
      if (!mediaUrl) {
        setFlash("Upload a video file to attach, or set Media to None.");
        return null;
      }
      return { type: "video", url: mediaUrl };
    }
    if (isUrlKind) {
      const error = mediaError(mediaUrl, mediaKind);
      if (error) {
        setFlash(error);
        return null;
      }
      return { type: mediaKind, url: mediaUrl.trim() };
    }
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setFlash("Please enter a news title.");
      return;
    }
    const media = buildMedia();
    if (!media && mediaKind !== "none") return;

    try {
      const input = {
      title,
      excerpt,
      category,
      author,
      badge: badge || undefined,
      media: media ?? undefined,
      placement: placement || undefined,
      };
      if (editingId) await updateStory(editingId, input); else await addStory(input);
    } catch (cause) { setFlash(cause instanceof Error ? cause.message : "Could not publish story."); return; }
    setFlash(editingId ? "Story updated." : `Published to ${category}. It now appears across the site.`);
    setEditingId(null);
    resetForm();
  }

  function onDelete(id: string) {
    void deleteStory(id).then(() => setFlash("Story removed from the site.")).catch((cause) => setFlash(cause instanceof Error ? cause.message : "Could not remove story."));
  }

  function editStory(story: (typeof stories)[number]) {
    setEditingId(story.id); setTitle(story.title); setExcerpt(story.excerpt || ""); setCategory(story.category); setAuthor(story.author || ""); setBadge(story.badge || ""); setMediaKind(story.media?.type || "none"); setMediaUrl(story.media?.url || ""); setImageData(story.media?.type === "image" ? story.media.url : ""); setPlacement(story.placement || "");
    navigate("/admin/add-story");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onInviteReporter(event: FormEvent) {
    event.preventDefault();
    try { await inviteReporter(reporterEmail, reporterName); setFlash(`Secure invitation sent to ${reporterEmail}.`); setReporterEmail(""); setReporterName(""); setStaff(await backend.rows<StaffUser>("staff_profiles", "select=id,email,role,display_name,is_active&order=created_at.asc")); }
    catch (cause) { setFlash(cause instanceof Error ? cause.message : "Could not invite reporter."); }
  }

  async function onStaffAction(member: StaffUser, action: "delete" | "deactivate" | "activate") {
    const verb = action === "delete" ? "delete" : action === "deactivate" ? "deactivate" : "reactivate";
    if (!window.confirm(`${verb[0].toUpperCase()}${verb.slice(1)} ${member.display_name || member.email}?`)) return;
    try {
      await manageStaff(action, member.id);
      setStaff(await backend.rows<StaffUser>("staff_profiles", "select=id,email,role,display_name,is_active&order=created_at.asc"));
      setFlash(`${member.display_name || member.email} ${action === "delete" ? "was deleted" : action === "deactivate" ? "was deactivated" : "was reactivated"}.`);
    } catch (cause) { setFlash(cause instanceof Error ? cause.message : `Could not ${verb} this account.`); }
  }

  async function loadCategoryRows() {
    const rows = await backend.rows<SiteCategory>("site_categories", "select=id,name,slug,sort_order&order=sort_order.asc,name.asc");
    setCategoryRows(rows);
    await refreshCategories();
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return setCategoryError("Enter a category name.");
    const duplicate = categoryRows.some((row) => row.name.toLowerCase() === name.toLowerCase() && row.id !== editingCategory);
    if (duplicate) return setCategoryError("A category with that name already exists.");
    setCategoryError("");
    try {
      if (editingCategory) {
        const current = categoryRows.find((row) => row.id === editingCategory);
        if (!current) throw new Error("Category not found.");
        if (current.name !== name) {
          await backend.rpc("rename_site_category", { p_category_id: current.id, p_name: name, p_slug: slugify(name) });
          await refreshStories();
          if (category === current.name) setCategory(name);
        }
        setFlash(`Category “${name}” updated.`);
      } else {
        const nextOrder = Math.max(0, ...categoryRows.map((row) => row.sort_order)) + 1;
        await backend.insert("site_categories", { name, slug: slugify(name), sort_order: nextOrder });
        setFlash(`Category “${name}” added.`);
      }
      await loadCategoryRows();
      setNewCategory("");
      setEditingCategory(null);
    } catch (cause) { setCategoryError(cause instanceof Error ? cause.message : "Could not save category."); }
  }

  async function deleteCategory(row: SiteCategory) {
    if (categoryRows.length <= 1) return setCategoryError("Keep at least one news category available.");
    if (!window.confirm(`Delete “${row.name}”? Existing stories will keep this category name.`)) return;
    setCategoryError("");
    try {
      await backend.remove("site_categories", `id=eq.${encodeURIComponent(row.id)}`);
      const remaining = await backend.rows<SiteCategory>("site_categories", "select=id,name,slug,sort_order&order=sort_order.asc,name.asc");
      setCategoryRows(remaining);
      await refreshCategories();
      if (category === row.name) setCategory(remaining[0]?.name || "News");
      if (editingCategory === row.id) { setEditingCategory(null); setNewCategory(""); }
      setFlash(`Category “${row.name}” deleted.`);
    } catch (cause) { setCategoryError(cause instanceof Error ? cause.message : "Could not delete category."); }
  }

  function startCategoryEdit(row: SiteCategory) {
    setEditingCategory(row.id);
    setNewCategory(row.name);
    setCategoryError("");
  }

  async function onAdImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAdMediaNote("Please choose an image file (JPG, PNG, GIF or WebP).");
      return;
    }
    try { setAdImageData(await backend.upload(file, "ad-media")); setAdMediaNote(""); }
    catch (cause) { setAdMediaNote(cause instanceof Error ? cause.message : "Could not upload image."); }
  }

  async function onAdVideoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith("video/")) {
      setAdMediaNote("Please choose a video file (MP4, WebM, OGG or MOV).");
      return;
    }
    if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
      setAdMediaNote(
        `That video is too large. Keep it under ${VIDEO_MAX_MB} MB.`,
      );
      return;
    }
    try {
      setAdVideoUrl(await backend.upload(file, "ad-media"));
      setAdVideoName(file.name);
      setAdMediaNote("");
    } catch {
      setAdMediaNote(
        "Could not store that video in this browser. Try a smaller file.",
      );
    }
  }

  async function onSubmitAd(event: FormEvent) {
    event.preventDefault();
    if (!adHeadline.trim()) {
      setFlash("Please enter an ad headline.");
      return;
    }
    let media: AdMedia | undefined;
    if (adKind === "image") {
      if (!adImageData) {
        setFlash("Choose a photo for the ad, or switch the type to Text.");
        return;
      }
      media = { type: "image", url: adImageData };
    } else if (adKind === "video") {
      if (!adVideoUrl) {
        setFlash("Upload a video for the ad, or switch the type to Text.");
        return;
      }
      media = { type: "video", url: adVideoUrl };
    }
    try { await addAd({ headline: adHeadline, url: adUrl, media, target: adTarget }); }
    catch (cause) { setFlash(cause instanceof Error ? cause.message : "Could not publish ad."); return; }
    setFlash(
      adTarget
        ? `Ad published for ${adTargetLabel(adTarget)}.`
        : "Ad published. It appears across the site's ad slots.",
    );
    setAdHeadline("");
    setAdUrl("");
    setAdKind("text");
    setAdTarget("");
    setAdImageData("");
    setAdVideoUrl("");
    setAdVideoName("");
    setAdMediaNote("");
  }

  function adTargetLabel(target: string): string {
    if (target === "home") return "the Home page";
    if (target === "news") return "the News page";
    return slugToLabel(target);
  }

  return (
    <main className="container main owner-admin">
      <aside className="owner-sidebar" aria-label={isSuperAdmin ? "Super Admin navigation" : "Reporter navigation"}>
        <div className="owner-sidebar__identity"><span className="owner-sidebar__eyebrow">GTN WORKSPACE</span><strong>{isSuperAdmin ? "Super Admin" : "Reporter Desk"}</strong><small>{isSuperAdmin ? "Owner controls" : "Your editorial workspace"}</small></div>
        <nav className="owner-sidebar__nav" aria-label="Workspace navigation">
          <span className="owner-sidebar__brand" role="img" aria-label="GTN logo"><img src="/logo.png" alt="" /></span>
          {(isSuperAdmin || can("dashboard_view")) && <NavLink to="/admin/dashboard" end className={({isActive})=>isActive?"owner-sidebar__link owner-sidebar__link--active":"owner-sidebar__link"}><span className="owner-sidebar__icon">⌂</span>Dashboard</NavLink>}
          {(isSuperAdmin || can("publish_stories")) && <NavLink to="/admin/add-story" className={({isActive})=>isActive?"owner-sidebar__link owner-sidebar__link--active":"owner-sidebar__link"}><span className="owner-sidebar__icon">＋</span>Add Story</NavLink>}
          {(isSuperAdmin || can("manage_own_stories") || can("manage_all_stories")) && <NavLink to="/admin/my-stories" className={({isActive})=>isActive?"owner-sidebar__link owner-sidebar__link--active":"owner-sidebar__link"}><span className="owner-sidebar__icon">▤</span>{isSuperAdmin || can("manage_all_stories") ? "Manage Stories" : "My Stories"}</NavLink>}
          {(isSuperAdmin || can("manage_staff")) && <NavLink to="/admin/staff" className={({isActive})=>isActive?"owner-sidebar__link owner-sidebar__link--active":"owner-sidebar__link"}><span className="owner-sidebar__icon">♙</span>Add Staff</NavLink>}
          {(isSuperAdmin || can("manage_categories")) && <NavLink to="/admin/categories" className={({isActive})=>isActive?"owner-sidebar__link owner-sidebar__link--categories owner-sidebar__link--active":"owner-sidebar__link owner-sidebar__link--categories"}><span className="owner-sidebar__icon">▦</span>News Categories</NavLink>}
          {isSuperAdmin && <>
          <NavLink to="/admin/roles" className={({isActive})=>isActive?"owner-sidebar__link owner-sidebar__link--roles owner-sidebar__link--active":"owner-sidebar__link owner-sidebar__link--roles"}><span className="owner-sidebar__icon">♧</span>Roles &amp; Permissions</NavLink>
          <NavLink to="/admin/advertising" className={({isActive})=>isActive?"owner-sidebar__link owner-sidebar__link--active":"owner-sidebar__link"}><span className="owner-sidebar__icon">▣</span>Advertising</NavLink></>}
          {!isSuperAdmin && can("manage_ads") && <NavLink to="/admin/advertising" className={({isActive})=>isActive?"owner-sidebar__link owner-sidebar__link--active":"owner-sidebar__link"}><span className="owner-sidebar__icon">▣</span>Advertising</NavLink>}
        </nav>
        <div className="owner-sidebar__footer"><span className="owner-sidebar__status" /> {isSuperAdmin ? "Owner access enabled" : "Reporter access enabled"}</div>
      </aside>
      <div className="owner-content">
      <div className="owner-page-heading"><div><span className="owner-sidebar__eyebrow">{isSuperAdmin ? "CONTROL CENTER" : "EDITORIAL WORKSPACE"}</span><h1>{isSuperAdmin ? ({dashboard:"Dashboard", "add-story":"Add Story", "my-stories":"Manage Stories",staff:"Add Staff",categories:"News Categories",roles:"Roles & Permissions",advertising:"Advertising"} as Record<string,string>)[activePage] || "Dashboard" : ({dashboard:"Reporter Dashboard", "add-story":"Add Story", "my-stories":"My Stories",categories:"News Categories",staff:"Add Staff",advertising:"Advertising"} as Record<string,string>)[activePage] || "Reporter Dashboard"}</h1><p>{isSuperAdmin ? "Manage publishing, staff access, categories, and advertising." : "Publish stories and manage your own reporting."}</p></div><span className="owner-page-heading__badge">{isSuperAdmin ? "OWNER" : "REPORTER"}</span></div>
      {(activePage === "dashboard" && (isSuperAdmin || can("dashboard_view"))) && <section id="admin-dashboard" className="owner-section owner-dashboard">
      <header className="owner-dashboard__welcome">
        <div className="owner-dashboard__welcome-copy">
          <span className="owner-dashboard__eyebrow">{isSuperAdmin ? "SUPER ADMIN WORKSPACE" : "REPORTER WORKSPACE"}</span>
          <h2>Welcome back, {user.display_name}</h2>
          <p>Your newsroom activity and publishing overview.</p>
        </div>
        <div className="owner-dashboard__welcome-actions">
          {(isSuperAdmin || can("publish_stories")) && <Link className="owner-dashboard__add" to="/admin/add-story"><span aria-hidden="true">＋</span> Add story</Link>}
          <button className="owner-dashboard__signout" type="button" onClick={signOut}>Sign Out</button>
        </div>
      </header>

      {(isSuperAdmin || can("manage_categories")) && <div className="chips">
        {newsCategories.map((cat) => {
          const count = stories.filter(
            (story) => story.category === cat,
          ).length;
          return (
            <Link
              className="chip"
              key={cat}
              to={`/category/${slugify(cat)}`}
              title={`View ${cat} stories`}
            >
              <span>{cat}</span>
              <b>{count}</b>
            </Link>
          );
        })}
      </div>}

      <div className="owner-dashboard__section-title"><div><span className="owner-section__eyebrow">OVERVIEW</span><h2>At a glance</h2></div><span className="owner-dashboard__live"><i /> Live data</span></div>
      <div className="stats owner-dashboard__stats">
        <div className="stats__item owner-dashboard__stat owner-dashboard__stat--stories">
          <span className="owner-dashboard__stat-icon" aria-hidden="true">▤</span><b>{stories.length}</b>
          <span>Total stories</span>
        </div>
        <div className="stats__item owner-dashboard__stat owner-dashboard__stat--published">
          <span className="owner-dashboard__stat-icon" aria-hidden="true">↗</span><b>{isSuperAdmin ? customStories.length : myStories.length}</b>
          <span>Published by you</span>
        </div>
        {(isSuperAdmin || can("manage_categories")) && <Link className="stats__item stats__item--link owner-dashboard__stat owner-dashboard__stat--categories" to="/admin/categories"><span className="owner-dashboard__stat-icon" aria-hidden="true">▦</span><b>{newsCategories.length}</b><span>News categories</span></Link>}
        {(isSuperAdmin || can("manage_ads")) && <Link className="stats__item stats__item--link owner-dashboard__stat owner-dashboard__stat--ads" to="/admin/advertising"><span className="owner-dashboard__stat-icon" aria-hidden="true">▣</span><b>{ads.length}</b><span>Live ads</span></Link>}
      </div>
      {isSuperAdmin && <div className="owner-published-content">
        <section className="owner-published-card"><header><div><span className="owner-section__eyebrow">EDITORIAL</span><h2>Stories Published</h2></div><strong>{stories.length}</strong></header><ul className="owner-published-card__list owner-published-card__list--scroll">{stories.map((story)=><li key={story.id}><Link to={`/story/${story.id}`}>{story.title}</Link><span>{story.category}</span></li>)}</ul>{stories.length===0&&<p className="admin__note">No published stories yet.</p>}</section>
        <section className="owner-published-card"><header><div><span className="owner-section__eyebrow">MONETIZATION</span><h2>Ads Published</h2></div><strong>{ads.length}</strong></header><ul>{ads.slice(0,5).map((ad)=><li key={ad.id}><span>{ad.headline}</span><span>{ad.target ? adTargetLabel(ad.target) : "All sections"}</span></li>)}</ul>{ads.length===0&&<p className="admin__note">No active ads published yet.</p>}</section>
      </div>}
      {!isSuperAdmin && <div className="owner-published-content"><section className="owner-published-card"><header><div><span className="owner-section__eyebrow">MY EDITORIAL WORK</span><h2>Stories Published</h2></div><strong>{myStories.length}</strong><Link className="admin__edit" to="/admin/add-story">Add story</Link></header>{myStories.length ? <ul className="owner-published-card__list owner-published-card__list--scroll">{myStories.map((story)=><li key={story.id}><Link to={`/story/${story.id}`}>{story.title}</Link><span>{story.category} · {story.time}</span></li>)}</ul> : <p className="admin__note">You have not published any stories yet. Use Add Story to publish your first one.</p>}</section></div>}
      </section>}

      {flash && <p className="flash">{flash}</p>}

      {(isSuperAdmin || can("manage_staff")) && activePage === "staff" && <>
        <section id="admin-add-staff" className="admin__panel admin__panel--full owner-section" aria-label="Add staff">
          <div className="owner-section__heading"><span className="owner-section__eyebrow">TEAM MANAGEMENT</span><h2>Add Staff</h2></div>
          <p className="form__hint">Create a staff account. The reporter receives a secure email invitation to set their own password.</p>
          <form className="form" onSubmit={onInviteReporter}><div className="admin__row"><label><span>Staff name</span><input value={reporterName} onChange={(e) => setReporterName(e.target.value)} required /></label><label><span>Work email</span><input type="email" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} required /></label></div><button className="btn" type="submit">Invite staff member</button></form>
        </section>
        <section className="admin__panel admin__panel--full owner-section" aria-label="Staff accounts">
          <div className="owner-section__heading"><span className="owner-section__eyebrow">STAFF DIRECTORY</span><h2>Staff Available</h2></div>
          <div className="owner-staff-summary"><strong>{staff.filter((member) => member.is_active).length}</strong><span>active staff</span><strong>{staff.length}</strong><span>total accounts</span></div>
          {staffError && <p className="form__hint form__hint--error">{staffError}</p>}
          {!staffLoaded && !staff.length ? <p className="admin__note">Loading staff accounts…</p> : staff.length ? <ul className="admin__list">{staff.map((member) => <li className="admin__item owner-staff-item" key={member.id}>
            <div><span className="admin__item-title">{member.display_name || "GTN staff"}{member.id === user.id && " · You"}</span><span className="admin__item-meta">{member.email} · {member.role.replace("_", " ")}</span></div>
            <div className="owner-staff-item__actions"><span className={`owner-status ${member.is_active ? "owner-status--active" : "owner-status--inactive"}`}>{member.is_active ? "Active" : "Inactive"}</span>{member.id !== user.id && <><button className="admin__edit" type="button" onClick={() => void onStaffAction(member, member.is_active ? "deactivate" : "activate")}>{member.is_active ? "Deactivate" : "Reactivate"}</button><button className="admin__delete" type="button" onClick={() => void onStaffAction(member, "delete")}>Delete</button></>}</div>
          </li>)}</ul> : <p className="admin__note">No staff accounts found.</p>}
        </section>
      </>}

      {(isSuperAdmin || can("manage_categories")) && activePage === "categories" && <>
        <section className="admin__panel admin__panel--full owner-section" aria-label="Add or edit news category">
          <div className="owner-section__heading"><span className="owner-section__eyebrow">SITE CONTENT</span><h2>{editingCategory ? "Edit Category" : "Add News Category"}</h2></div>
          <p className="form__hint">Categories appear in the public news navigation and the story publishing form. Renaming a category also updates stories assigned to it.</p>
          <form className="form" onSubmit={saveCategory}><label><span>Category name</span><input value={newCategory} onChange={(event)=>setNewCategory(event.target.value)} placeholder="e.g. Health" maxLength={50} required /></label><div className="admin__form-actions"><button className="btn" type="submit">{editingCategory ? "Save category" : "Add category"}</button>{editingCategory && <button className="admin__edit" type="button" onClick={()=>{setEditingCategory(null);setNewCategory("");setCategoryError("");}}>Cancel</button>}</div></form>
          {categoryError && <p className="form__hint form__hint--error">{categoryError}</p>}
        </section>
        <section className="admin__panel admin__panel--full owner-section" aria-label="Available news categories">
          <div className="owner-section__heading"><span className="owner-section__eyebrow">CATEGORY DIRECTORY</span><h2>Available News Categories <span className="owner-category-count">{categoryRows.length || newsCategories.length}</span></h2></div>
          <ul className="admin__list">{categoryRows.map((row)=><li className="admin__item" key={row.id}><div><span className="admin__item-title">{row.name}</span><span className="admin__item-meta">/{row.slug}</span></div><div className="admin__actions"><button className="admin__edit" type="button" onClick={()=>startCategoryEdit(row)}>Edit</button><button className="admin__delete" type="button" onClick={()=>void deleteCategory(row)}>Delete</button></div></li>)}</ul>
          {!categoryRows.length && <ul className="admin__list">{newsCategories.map((name)=><li className="admin__item" key={name}><div><span className="admin__item-title">{name}</span><span className="admin__item-meta">Category list is loading from Supabase or using built-in defaults.</span></div></li>)}</ul>}
        </section>
      </>}

      {isSuperAdmin && activePage === "roles" && <section id="admin-roles" className="admin__panel admin__panel--full owner-section" aria-label="Roles and permissions"><div className="owner-section__heading"><span className="owner-section__eyebrow">ACCESS CONTROL</span><h2>Roles &amp; Permissions</h2></div><p className="form__hint">Choose which workspace features reporters can use. Super Admin keeps full owner access. Changes apply to all reporter accounts.</p><div className="owner-role-grid"><article><span className="owner-role-grid__mark owner-role-grid__mark--owner">SA</span><div><h3>Super Admin</h3><p>Full access to every feature and permission.</p></div><span className="owner-role-grid__tag">Full access</span></article></div><h3>Reporter permissions</h3><div className="permission-list">{(Object.keys(PERMISSION_LABELS) as PermissionKey[]).map((key)=><label className="permission-list__item" key={key}><span>{PERMISSION_LABELS[key]}</span><input type="checkbox" checked={permissions[key]} disabled={permissionsLoading} onChange={async (event)=>{const next: ReporterPermissions={...permissions,[key]:event.target.checked};try{await savePermissions(next);setFlash("Reporter permissions updated.");}catch(cause){setFlash(cause instanceof Error?cause.message:"Could not save reporter permissions.");}}}/></label>)}</div></section>}

      {(activePage === "add-story" || activePage === "my-stories") && <div className="admin admin--single">
        {activePage === "add-story" && <section id="admin-add-story" className="admin__panel owner-section" aria-label="Add story">
          <h2>{editingId ? "Edit story" : isSuperAdmin ? "Publish a story" : "Submit a story"}</h2>
          <form className="form" onSubmit={onSubmit}>
            <label>
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Headline of the story"
                required
              />
            </label>
            <label>
              <span>Excerpt (optional)</span>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A short summary shown on the story page"
                rows={3}
              />
            </label>
            <div className="admin__row">
              <label>
                <span>Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {newsCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Badge (optional)</span>
                <select
                  value={badge}
                  onChange={(e) => setBadge(e.target.value as Badge | "")}
                >
                  {BADGES.map((value) => (
                    <option key={value || "none"} value={value}>
                      {value ? value : "None"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>Show on</span>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value as Placement | "")}
              >
                <option value="">Everywhere</option>
                <option value="for-you">For You page only</option>
                <option value="news">News &amp; other pages only</option>
              </select>
            </label>
            <p className="form__hint">
              For You = home feed; other pages = News and category sections.
            </p>
            <label>
              <span>Author</span>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="GTN Newsroom"
              />
            </label>

            <fieldset className="form__fieldset">
              <legend>Media</legend>
              <label>
                <span>Attach</span>
                <select
                  value={mediaKind}
                  onChange={(e) => setMediaKind(e.target.value as MediaKind)}
                >
                  <option value="none">None</option>
                  <option value="image">Picture</option>
                  <option value="video">Upload video</option>
                  <option value="youtube">YouTube link</option>
                  <option value="tiktok">TikTok link</option>
                </select>
              </label>

              {mediaKind === "image" && (
                <>
                  <input
                    className="form__file"
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    aria-label="Choose a picture"
                  />
                  {imageData ? (
                    <img
                      className="form__preview"
                      src={imageData}
                      alt="Selected picture preview"
                    />
                  ) : (
                    <p className="form__hint">
                      Upload a picture file to feature on the story.
                    </p>
                  )}
                  {mediaNote && (
                    <p className="form__hint form__hint--error">{mediaNote}</p>
                  )}
                </>
              )}

              {mediaKind === "video" && (
                <>
                  <input
                    className="form__file"
                    type="file"
                    accept={VIDEO_ACCEPT}
                    onChange={onVideoChange}
                    aria-label="Upload a video file"
                  />
                  {videoName ? (
                    <>
                      <p className="form__hint form__hint--ok">
                        Ready: {videoName}
                      </p>
                      <p className="form__hint">
                        The video is stored on this device and will play on the
                        story page.
                      </p>
                    </>
                  ) : (
                    <p className="form__hint">
                      Upload an MP4 or WebM file (under {VIDEO_MAX_MB} MB) to
                      feature on the story.
                    </p>
                  )}
                  {mediaNote && (
                    <p className="form__hint form__hint--error">{mediaNote}</p>
                  )}
                </>
              )}

              {isUrlKind && (
                <>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={
                      mediaKind === "youtube"
                        ? "https://www.youtube.com/watch?v=…"
                        : "https://www.tiktok.com/@user/video/…"
                    }
                  />
                  {mediaUrl.trim() ? (
                    <p
                      className={
                        urlError
                          ? "form__hint form__hint--error"
                          : "form__hint form__hint--ok"
                      }
                    >
                      {urlError ??
                        "Link looks valid — it will play on the story page."}
                    </p>
                  ) : (
                    <p className="form__hint">
                      Paste a {mediaKind === "youtube" ? "YouTube" : "TikTok"}{" "}
                      link to embed the video on the story.
                    </p>
                  )}
                </>
              )}
            </fieldset>

            <div className="admin__form-actions"><button className="btn" type="submit">{editingId ? "Save changes" : "Publish story"}</button>{editingId && <button className="admin__edit" type="button" onClick={resetForm}>Cancel edit</button>}</div>
          </form>
        </section>}

        {activePage === "my-stories" && <section className="admin__panel owner-section" aria-label="Manage stories">
          <h2>{isSuperAdmin ? "Editorial management" : "Your stories"}</h2>
          <form className="form__search owner-story-search" onSubmit={(event) => { event.preventDefault(); setAppliedQuery(query); }}>
            <label htmlFor="story-search">Find a story</label>
            <div className="form__search-controls">
              <div className="owner-story-search__input-wrap"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.3 4.3"/></svg><input id="story-search" type="search" value={query} onChange={(e) => {setQuery(e.target.value);setAppliedQuery(e.target.value);}} placeholder="Search by headline or category" /></div>
              {appliedQuery && <button className="owner-story-search__clear" type="button" onClick={() => {setQuery("");setAppliedQuery("");}}>Clear</button>}
            </div>
          </form>
          <p className="admin__count">
            Showing {visible.length} of {managedStories.length} stories
          </p>
          <ul className="admin__list admin__list--scroll-15">
            {visible.map((story) => {
              const storedStory = customStories.find((item) => item.id === story.id) as (typeof story & { reporter_id?: string }) | undefined;
              const canManage = Boolean(storedStory && (isSuperAdmin || can("manage_all_stories") || (can("manage_own_stories") && storedStory.reporter_id === user.id)));
              return <li className="admin__item" key={story.id}>
                <div>
                  <Link className="admin__item-title" to={`/story/${story.id}`}>
                    {story.title}
                  </Link>
                  <span className="admin__item-meta">
                    {story.category} · {story.time}
                    {story.media && (
                      <em className="admin__mine">
                        {" "}
                        ·{" "}
                        {story.media.type === "image"
                          ? "picture"
                          : story.media.type}
                      </em>
                    )}
                    {story.placement === "for-you" && (
                      <em className="admin__mine"> · For You</em>
                    )}
                    {story.placement === "news" && (
                      <em className="admin__mine"> · News</em>
                    )}
                    {storedStory?.reporter_id === user.id && (
                      <em className="admin__mine"> yours</em>
                    )}
                  </span>
                </div>
                {canManage && <div className="story-action-menu"><button className="story-action-menu__trigger" type="button" aria-label={`Actions for ${story.title}`} aria-haspopup="menu" aria-expanded={openStoryMenu === story.id} onClick={() => setOpenStoryMenu(openStoryMenu === story.id ? null : story.id)}><span aria-hidden="true">⋮</span></button>{openStoryMenu === story.id && <div className="story-action-menu__items" role="menu"><button type="button" role="menuitem" onClick={() => {setOpenStoryMenu(null);editStory(story);}}>Edit story</button><button className="story-action-menu__delete" type="button" role="menuitem" onClick={() => {setOpenStoryMenu(null);if(window.confirm(`Delete “${story.title}”? This cannot be undone.`))onDelete(story.id);}}>Delete story</button></div>}</div>}
              </li>
            })}
          </ul>
        </section>}
      </div>}

      {(isSuperAdmin || can("manage_ads")) && activePage === "advertising" && <section id="admin-advertising" className="admin__panel admin__panel--full owner-section"
        aria-label="Manage ads"
      >
        <h2>Advertising</h2>
        <form className="form" onSubmit={onSubmitAd}>
          <div className="admin__row">
            <label>
              <span>Ad headline</span>
              <input
                type="text"
                value={adHeadline}
                onChange={(e) => setAdHeadline(e.target.value)}
                placeholder="e.g. GTN Radio — now on FM 96.1"
                required
              />
            </label>
            <label>
              <span>Destination URL (optional)</span>
              <input
                type="text"
                value={adUrl}
                onChange={(e) => setAdUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </label>
          </div>
          <label>
            <span>Ad type</span>
            <select
              value={adKind}
              onChange={(e) => setAdKind(e.target.value as AdKind)}
            >
              <option value="text">Text link</option>
              <option value="image">Photo</option>
              <option value="video">Video</option>
            </select>
          </label>
          <label>
            <span>Show on</span>
            <select
              value={adTarget}
              onChange={(e) => setAdTarget(e.target.value)}
            >
              <option value="">All sections</option>
              <option value="home">Home (For You)</option>
              <option value="news">News page</option>
              {newsCategories.map((cat) => (
                <option key={cat} value={slugify(cat)}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <p className="form__hint">
            Pick a section to show this ad there, or leave as All sections to
            fill every slot.
          </p>

          {adKind === "image" && (
            <>
              <input
                className="form__file"
                type="file"
                accept="image/*"
                onChange={onAdImageChange}
                aria-label="Choose an ad photo"
              />
              {adImageData ? (
                <img
                  className="form__preview"
                  src={adImageData}
                  alt="Ad photo preview"
                />
              ) : (
                <p className="form__hint">
                  Upload a photo to show as the ad banner.
                </p>
              )}
              {adMediaNote && (
                <p className="form__hint form__hint--error">{adMediaNote}</p>
              )}
            </>
          )}

          {adKind === "video" && (
            <>
              <input
                className="form__file"
                type="file"
                accept={VIDEO_ACCEPT}
                onChange={onAdVideoChange}
                aria-label="Upload an ad video"
              />
              {adVideoName ? (
                <p className="form__hint form__hint--ok">
                  Ready: {adVideoName}
                </p>
              ) : (
                <p className="form__hint">
                  Upload a short MP4 or WebM clip (under {VIDEO_MAX_MB} MB).
                </p>
              )}
              {adMediaNote && (
                <p className="form__hint form__hint--error">{adMediaNote}</p>
              )}
            </>
          )}

          <button className="btn" type="submit">
            Publish ad
          </button>
        </form>

        {ads.length > 0 ? (
          <>
            <p className="admin__count">
              {ads.length} ad{ads.length === 1 ? "" : "s"} live
            </p>
            <ul className="admin__list">
              {ads.map((ad) => (
                <li className="admin__item" key={ad.id}>
                  <div>
                    <span className="admin__item-title">{ad.headline}</span>
                    <span className="admin__item-meta">
                      {ad.media?.type === "image"
                        ? "Photo"
                        : ad.media?.type === "video"
                          ? "Video"
                          : "Text"}
                      {ad.url && <> · {ad.url}</>}
                      {ad.target && (
                        <em className="admin__mine">
                          {" "}
                          · {adTargetLabel(ad.target)}
                        </em>
                      )}
                    </span>
                  </div>
                  <button
                    className="admin__delete"
                    type="button"
                    onClick={() => deleteAd(ad.id)}
                    aria-label={`Delete ad ${ad.headline}`}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="admin__note">
            No ads yet. Add text, photo or video ads — they will appear in the
            site's ad slots.
          </p>
        )}
      </section>}
      </div>
    </main>
  );
}
