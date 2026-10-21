import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Story } from "../data/news";
import { storyMediaItems } from "../data/media";
import { backend } from "../lib/backend";

const W = 1080;
const H = 1350;
type SocialAccount = { id: string; provider: "facebook" | "instagram" | "x"; account_id: string; account_name: string; expires_at?: string | null };
type PublishResult = { accountId: string; accountName: string; provider: string; success: boolean; postId?: string; error?: string };

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  let wordIndex = 0;
  for (; wordIndex < words.length; wordIndex += 1) {
    const next = line ? `${line} ${words[wordIndex]}` : words[wordIndex];
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = words[wordIndex];
      if (lines.length === maxLines) { wordIndex += 1; break; }
    } else line = next;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (wordIndex < words.length && lines.length) {
    let last = lines[lines.length - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 4) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

function imageSource(story?: Story) {
  const image = storyMediaItems(story?.media).find((item) => item.type === "image");
  return image?.url || "";
}

export default function NewsCutMaker({ stories, isSuperAdmin }: { stories: Story[]; isSuperAdmin: boolean }) {
  const published = useMemo(() => [...stories].sort((a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || "")), [stories]);
  const [storyId, setStoryId] = useState("");
  const selected = published.find((story) => story.id === storyId);
  const [headline, setHeadline] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [photo, setPhoto] = useState("");
  const [customPhoto, setCustomPhoto] = useState("");
  const [imageError, setImageError] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [captionEdited, setCaptionEdited] = useState(false);
  const [socialMessage, setSocialMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [connecting, setConnecting] = useState("");
  const [disconnecting, setDisconnecting] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!selected) return;
    setHeadline(selected.title);
    setParagraph(selected.excerpt || selected.body?.split(/\n\s*\n/)[0] || "");
    if (!customPhoto) setPhoto(imageSource(selected));
  }, [storyId, selected, customPhoto]);

  useEffect(() => {
    void backend.invoke<{ accounts?: SocialAccount[] }>("social-account-admin", { action: "list" })
      .then(({ accounts = [] }) => { setSocialAccounts(accounts); setSelectedAccounts((previous) => [...new Set([...previous, ...accounts.map((account) => account.id)])]); })
      .catch((error) => setSocialMessage(error instanceof Error ? error.message : "Could not load connected social accounts."));
    const params = new URLSearchParams(window.location.search);
    if (params.has("social_connection")) {
      const status = params.get("social_connection"); const provider = params.get("provider") || "social";
      setSocialMessage(status === "connected" ? `${provider === "meta" ? "Facebook and Instagram" : "X"} connection completed.` : params.get("reason") || "The social account connection could not be completed.");
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    if (!captionEdited) setCaption([headline.trim(), paragraph.trim()].filter(Boolean).join("\n\n"));
  }, [headline, paragraph, captionEdited]);

  useEffect(() => () => { if (customPhoto.startsWith("blob:")) URL.revokeObjectURL(customPhoto); }, [customPhoto]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = W;
    canvas.height = H;
    setPreviewReady(false);
    setImageError(false);
    const draw = (image?: HTMLImageElement) => {
      if (image) {
        const scale = Math.max(W / image.width, H / image.height);
        const sw = W / scale; const sh = H / scale;
        ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, W, H);
      } else {
        const base = ctx.createLinearGradient(0, 0, W, H);
        base.addColorStop(0, "#173b65"); base.addColorStop(1, "#ef7620");
        ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
      }
      const shade = ctx.createLinearGradient(0, 400, 0, H);
      shade.addColorStop(0, "rgba(0,0,0,0)"); shade.addColorStop(.32, "rgba(0,0,0,.56)"); shade.addColorStop(1, "rgba(0,0,0,.96)");
      ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
      const logo = new Image();
      logo.onload = () => {
        ctx.save();
        ctx.shadowColor = "rgba(7, 32, 54, .24)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(54, 48, 138, 138, 25); ctx.fill();
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        // The source artwork has generous white margins; crop to the GTN mark for a clear, mark-only lockup.
        const sx = logo.width * .19; const sy = logo.height * .22;
        const sw = logo.width * .62; const sh = logo.height * .56;
        ctx.drawImage(logo, sx, sy, sw, sh, 66, 60, 114, 114);
        ctx.restore();
        setPreviewReady(true);
      };
      logo.onerror = () => setPreviewReady(true);
      logo.src = "/logo.png";
      const dateText = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" }).format(selected?.publishedAt ? new Date(selected.publishedAt) : new Date());
      ctx.save();
      ctx.fillStyle = "rgba(12, 22, 35, .62)"; ctx.beginPath(); ctx.roundRect(52, 198, 344, 52, 16); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.34)"; ctx.shadowBlur = 8;
      ctx.font = "700 27px Arial, sans-serif"; ctx.textBaseline = "middle"; ctx.fillText(dateText, 70, 224);
      ctx.restore();

      const alertTop = 736;
      const alertHeight = 58;
      const headlineBaseline = 862;
      const headlineLineHeight = 55;
      ctx.fillStyle = "#f58220"; ctx.beginPath(); ctx.roundRect(82, alertTop, 340, alertHeight, 3); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "800 37px Arial, sans-serif"; ctx.textBaseline = "alphabetic"; ctx.fillText("NEWS ALERT", 100, alertTop + 41);

      ctx.fillStyle = "#fff"; ctx.font = "800 48px Arial, sans-serif";
      const headlineLines = wrapLines(ctx, headline || "Your news headline", 920, 4);
      headlineLines.forEach((line, index) => ctx.fillText(line, 82, headlineBaseline + index * headlineLineHeight));

      ctx.fillStyle = "rgba(255,255,255,.96)"; ctx.font = "500 25px Arial, sans-serif";
      const paragraphLineHeight = 34;
      const paragraphBaseline = headlineBaseline + headlineLines.length * headlineLineHeight - 13;
      const paragraphMaxLines = Math.max(1, Math.min(8, Math.floor((1238 - paragraphBaseline) / paragraphLineHeight) + 1));
      const paragraphLines = wrapLines(ctx, paragraph || "Add a short summary to appear beneath the headline.", 920, paragraphMaxLines);
      paragraphLines.forEach((line, index) => ctx.fillText(line, 82, paragraphBaseline + index * paragraphLineHeight));

      const accentBottom = paragraphBaseline + Math.max(0, paragraphLines.length - 1) * paragraphLineHeight + 14;
      ctx.fillStyle = "#f58220"; ctx.beginPath(); ctx.roundRect(52, alertTop, 9, accentBottom - alertTop, 5); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.font = "700 24px Arial, sans-serif"; ctx.fillText("GTN News", 62, 1292);
    };
    if (!photo) { draw(); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => draw(img);
    img.onerror = () => { setImageError(true); draw(); };
    img.src = photo;
  }, [photo, headline, paragraph, selected]);

  function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const next = URL.createObjectURL(file);
    setCustomPhoto(next); setPhoto(next);
  }
  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !previewReady) return;
    const link = document.createElement("a");
    link.download = `gtn-news-cut-${(selected?.id || headline.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32) || "graphic")}.png`;
    try { link.href = canvas.toDataURL("image/png"); link.click(); setDownloadError(""); }
    catch { setDownloadError("This photo blocks graphic export. Upload the photo from your device, then download again."); }
  }

  async function connect(provider: "meta" | "x") {
    setConnecting(provider); setSocialMessage("");
    try { const result = await backend.invoke<{ authorizeUrl?: string; error?: string }>("social-oauth-start", { provider }); if (!result.authorizeUrl) throw new Error(result.error || "Could not start account connection."); window.location.assign(result.authorizeUrl); }
    catch (error) { setSocialMessage(error instanceof Error ? error.message : "Could not start account connection."); setConnecting(""); }
  }
  async function disconnect(account: SocialAccount) {
    if (!window.confirm(`Disconnect ${account.account_name} from News Cut publishing?`)) return;
    setDisconnecting(account.id); setSocialMessage("");
    try { await backend.invoke("social-account-admin", { action: "disconnect", id: account.id }); setSocialAccounts((current) => current.filter((entry) => entry.id !== account.id)); setSelectedAccounts((current) => current.filter((id) => id !== account.id)); setSocialMessage(`${account.account_name} was disconnected.`); }
    catch (error) { setSocialMessage(error instanceof Error ? error.message : "Could not disconnect this account."); }
    finally { setDisconnecting(""); }
  }
  async function publish() {
    if (!canvasRef.current || !selectedAccounts.length || !caption.trim()) return;
    setPublishing(true); setSocialMessage("");
    try {
      const imageBase64 = canvasRef.current.toDataURL("image/png");
      const result = await backend.invoke<{ results?: PublishResult[]; error?: string }>("publish-news-cut", { accountIds: selectedAccounts, caption: caption.trim(), imageBase64 });
      if (!result.results) throw new Error(result.error || "Could not publish the News Cut.");
      const posted = result.results.filter((item) => item.success).length;
      const failed = result.results.filter((item) => !item.success);
      const detail = failed.map((item) => `${item.accountName}: ${item.error}`).join(" · ");
      setSocialMessage(`${posted} of ${result.results.length} selected accounts published.${detail ? ` ${detail}` : ""}`);
    } catch (error) { setSocialMessage(error instanceof Error ? error.message : "Could not publish the News Cut."); }
    finally { setPublishing(false); }
  }
  async function prepareWhatsAppShare() {
    if (!canvasRef.current || !headline.trim()) return;
    const canvas = canvasRef.current;
    canvas.toBlob(async (blob) => {
      if (!blob) { setSocialMessage("Could not prepare the News Cut image for WhatsApp."); return; }
      const file = new File([blob], "gtn-news-cut.png", { type: "image/png" });
      try {
        await navigator.clipboard.writeText(caption.trim());
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = file.name; link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        setSocialMessage("The image was downloaded and its caption copied. Open your WhatsApp Channel and publish them as an update.");
      } catch { setSocialMessage("Could not copy the caption. Download the image and copy the caption manually before posting it to your WhatsApp Channel."); }
    }, "image/png");
  }

  return <section className="news-cut" aria-label="News cut maker">
    <header className="news-cut__hero"><div className="news-cut__hero-brand"><span className="news-cut__hero-icon"><img src="/logo.png" alt="GTN" /></span><span>GTN CREATIVE STUDIO</span></div><div className="news-cut__hero-copy"><div><span className="news-cut__eyebrow">SOCIAL PUBLISHING</span><h2>Create a News Cut</h2><p>Build a polished, on-brand story graphic for your social channels.</p></div><span className="news-cut__format">PORTRAIT · 4:5</span></div></header>
    <div className="news-cut__layout">
      <div className="news-cut__editor">
        <div className="news-cut__section-head"><span className="news-cut__step">01</span><div><h3>Story details</h3><p>Start with a published story or create a graphic from scratch.</p></div></div>
        <label className="news-cut__field"><span>Use a published story <small>Optional</small></span><select value={storyId} onChange={(event) => { setStoryId(event.target.value); setCustomPhoto(""); if (!event.target.value) { setHeadline(""); setParagraph(""); setPhoto(""); } }}><option value="">Create from scratch</option>{published.map((story) => <option key={story.id} value={story.id}>{story.title}</option>)}</select></label>
        <label className="news-cut__field"><span>Headline <small>{headline.length}/180</small></span><textarea rows={3} maxLength={180} value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Write a clear, engaging headline" /></label>
        <label className="news-cut__field"><span>Supporting paragraph <small>{paragraph.length}/420</small></span><textarea rows={4} maxLength={420} value={paragraph} onChange={(event) => setParagraph(event.target.value)} placeholder="Add the key details readers should know" /></label>
        <div className="news-cut__section-head news-cut__section-head--image"><span className="news-cut__step">02</span><div><h3>Choose a photo</h3><p>Use the story image or upload a new one. A branded gradient is used when no photo is selected.</p></div></div>
        {selected && imageSource(selected) && !customPhoto && <button type="button" className="news-cut__story-image" onClick={() => setPhoto(imageSource(selected))}><img src={imageSource(selected)} alt=""/><span><b>Use story image</b><small>Selected story artwork</small></span><span className="news-cut__check">✓</span></button>}
        <label className="news-cut__upload"><input type="file" accept="image/*" onChange={onPhoto}/><span className="news-cut__upload-icon">↑</span><span><b>{customPhoto ? "Replace uploaded photo" : "Upload a photo"}</b><small>JPG, PNG or WebP · high resolution recommended</small></span><span className="news-cut__upload-action">Browse files</span></label>
        {photo && <button type="button" className="news-cut__clear-photo" onClick={() => { setPhoto(""); setCustomPhoto(""); }}>Remove photo</button>}
        {imageError && <p className="news-cut__notice">This image could not be used. Upload a local image file instead.</p>}
        {downloadError && <p className="news-cut__notice">{downloadError}</p>}
        <div className="news-cut__editor-footer"><span><i/> Preview updates as you edit</span><button type="button" className="news-cut__download" onClick={download} disabled={!headline.trim() || !previewReady}><span>↓</span> Download PNG</button></div>
      </div>
      <aside className="news-cut__stage"><div className="news-cut__stage-head"><div><span className="news-cut__eyebrow">LIVE PREVIEW</span><h3>Your design</h3></div><span className="news-cut__live"><i/> LIVE</span></div><div className="news-cut__canvas-frame"><canvas ref={canvasRef} aria-label="Live preview of the GTN news cut"/></div><div className="news-cut__stage-foot"><span><b>GTN News Cut</b><small>1080 × 1350 px · PNG</small></span><span className="news-cut__stage-brand"><img src="/logo.png" alt="GTN"/></span></div></aside>
    </div>
    <section className="news-cut__social" aria-labelledby="news-cut-social-title">
      <div className="news-cut__social-heading"><div><span className="news-cut__eyebrow">DISTRIBUTION</span><h3 id="news-cut-social-title">Connected social accounts</h3><p>Connect your newsroom profiles once, then choose where each News Cut should appear.</p></div><span className="news-cut__secure">Protected account tokens</span></div>
      <div className="news-cut__connect-grid">
        <article className="news-cut__connect-card"><span className="news-cut__network news-cut__network--meta">f</span><span><b>Facebook &amp; Instagram</b><small>Connect Meta Pages and linked professional Instagram accounts.</small></span>{isSuperAdmin ? <button type="button" onClick={() => void connect("meta")} disabled={Boolean(connecting)}>{connecting === "meta" ? "Connecting…" : "Connect Meta"}</button> : <small className="news-cut__admin-note">Super Admin connects accounts</small>}</article>
        <article className="news-cut__connect-card"><span className="news-cut__network news-cut__network--x">𝕏</span><span><b>X</b><small>Connect the GTN X profile for image posts.</small></span>{isSuperAdmin ? <button type="button" onClick={() => void connect("x")} disabled={Boolean(connecting)}>{connecting === "x" ? "Connecting…" : "Connect X"}</button> : <small className="news-cut__admin-note">Super Admin connects accounts</small>}</article>
        <article className="news-cut__connect-card news-cut__connect-card--whatsapp"><span className="news-cut__network news-cut__network--whatsapp">◉</span><span><b>WhatsApp Channel</b><small>Prepare the image and caption, then post them from WhatsApp.</small></span><button type="button" onClick={() => void prepareWhatsAppShare()} disabled={!headline.trim() || !previewReady}>Prepare update</button></article>
      </div>
      {socialAccounts.length > 0 && <div className="news-cut__accounts"><div className="news-cut__accounts-heading"><b>Choose destinations</b><span>{selectedAccounts.length} selected</span></div>{socialAccounts.map((account) => <label className="news-cut__account" key={account.id}><input type="checkbox" checked={selectedAccounts.includes(account.id)} onChange={(event) => setSelectedAccounts((current) => event.target.checked ? [...current, account.id] : current.filter((id) => id !== account.id))}/><span className={`news-cut__network news-cut__network--${account.provider}`}>{account.provider === "facebook" ? "f" : account.provider === "instagram" ? "◎" : "𝕏"}</span><span><b>{account.account_name}</b><small>{account.provider === "facebook" ? "Facebook Page" : account.provider === "instagram" ? "Instagram account" : "X profile"}</small></span>{isSuperAdmin && <button type="button" className="news-cut__disconnect" disabled={disconnecting === account.id} onClick={(event) => { event.preventDefault(); void disconnect(account); }}>{disconnecting === account.id ? "…" : "Disconnect"}</button>}</label>)}</div>}
      <label className="news-cut__field news-cut__caption"><span>Social caption <small>{caption.length} characters</small></span><textarea rows={3} maxLength={1500} value={caption} onChange={(event) => { setCaptionEdited(true); setCaption(event.target.value); }} placeholder="Add the caption for your social post"/><small>Facebook and Instagram accept longer captions. X may reject captions that exceed its current account limit.</small></label>
      {socialMessage && <p className="news-cut__social-message" role="status">{socialMessage}</p>}
      <div className="news-cut__publish-actions"><span>Posts will be sent to each selected connected account.</span><button type="button" className="news-cut__download" onClick={() => void publish()} disabled={publishing || !headline.trim() || !caption.trim() || !selectedAccounts.length || !previewReady}>{publishing ? "Publishing…" : `Publish to ${selectedAccounts.length || "selected"} account${selectedAccounts.length === 1 ? "" : "s"}`}</button></div>
    </section>
  </section>;
}
