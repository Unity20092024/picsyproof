"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Download,
  Home,
  Link2,
  MapPin,
  Plus,
  Settings,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import {
  BottomNavigation,
  EvidenceReport,
  MobileHeader,
  ProgressIndicator,
  PropertyCard,
  StatCard,
  StatusBadge,
  SwoopButton,
  SwoopCard,
  ThemeSwitcher,
  TurnoverChecklist,
} from "@/components/ui";
import {
  dateLabel,
  freshTasks,
  loadWorkspace,
  starter,
  withoutPhotos,
  type Property,
  type Task,
  type Theme,
  type View,
  type Workspace,
} from "@/lib/model";
const views: View[] = [
  "home",
  "properties",
  "detail",
  "cleaner",
  "turnovers",
  "reports",
  "settings",
];
export default function HomePage() {
  const [data, setData] = useState<Workspace>(starter);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState("loft");
  const [view, setView] = useState<View>("home");
  const [theme, setTheme] = useState<Theme>("system");
  const [greeting, setGreeting] = useState("Hello");
  const [notice, setNotice] = useState("");
  const [reportId, setReportId] = useState<string>();
  const dialog = useRef<HTMLDialogElement>(null);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [workspaceName, setWorkspaceName] = useState("My workspace");
  const heading = useRef<HTMLElement>(null);
  useEffect(() => {
    setData(loadWorkspace());
    try {
      const t = localStorage.getItem("picsyproof-theme");
      if (t === "light" || t === "dark" || t === "system") setTheme(t);
      setWorkspaceName(
        localStorage.getItem("picsyproof-workspace-name") || "My workspace",
      );
      setSelected(
        localStorage.getItem("picsyproof-selected-property") || "loft",
      );
      setReportId(
        sessionStorage.getItem("picsyproof-selected-report") || undefined,
      );
    } catch {}
    const hour = new Date().getHours();
    setGreeting(
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening",
    );
    const query = new URLSearchParams(location.search);
    if (query.get("demo") === "cleaner") {
      setView("cleaner");
      if (query.get("property")) setSelected(query.get("property")!);
    } else {
      const hash = (location.hash.slice(1) || "home") as View;
      if (views.includes(hash)) setView(hash);
    }
    const onHash = () => {
      const hash = (location.hash.slice(1) || "home") as View;
      if (views.includes(hash)) setView(hash);
    };
    window.addEventListener("hashchange", onHash);
    setReady(true);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        "picsyproof-workspace-v2",
        JSON.stringify(withoutPhotos(data)),
      );
    } catch {
      setNotice(
        "Browser storage is unavailable or full. Changes will last for this session only.",
      );
    }
  }, [data, ready]);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("picsyproof-theme", theme);
    } catch {
      setNotice("Appearance cannot be saved in this browser.");
    }
  }, [theme, ready]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("picsyproof-selected-property", selected);
      if (reportId)
        sessionStorage.setItem("picsyproof-selected-report", reportId);
      else sessionStorage.removeItem("picsyproof-selected-report");
    } catch {}
  }, [selected, reportId, ready]);
  function navigate(next: View) {
    setView(next);
    if (next !== "reports") setReportId(undefined);
    history.pushState(null, "", "#" + next);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => heading.current?.focus());
  }
  const current =
    data.properties.find((p) => p.id === selected) || data.properties[0];
  const record = data.records.find((r) => r.id === reportId);
  const report: Property | undefined = record
    ? { ...record, id: record.propertyId }
    : current;
  const completed =
    data.records.length +
    data.properties.filter(
      (p) =>
        p.completedAt &&
        !data.records.some(
          (r) => r.propertyId === p.id && r.completedAt === p.completedAt,
        ),
    ).length;
  const photos = [
    ...data.records.flatMap((r) => r.tasks),
    ...data.properties
      .filter(
        (p) =>
          !p.completedAt ||
          !data.records.some(
            (r) => r.propertyId === p.id && r.completedAt === p.completedAt,
          ),
      )
      .flatMap((p) => p.tasks),
  ].filter((t) => t.photo).length;
  function select(p: Property, next: View = "detail") {
    setSelected(p.id);
    setReportId(undefined);
    navigate(next);
  }
  function updateTask(id: string, patch: Partial<Task>) {
    if (!current || current.completedAt) return;
    setData((d) => ({
      ...d,
      properties: d.properties.map((p) =>
        p.id === current.id
          ? {
              ...p,
              tasks: p.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
            }
          : p,
      ),
    }));
  }
  function finish() {
    if (!current || current.completedAt || !current.tasks.every((t) => t.done))
      return;
    const completedAt = new Date().toISOString();
    const id = crypto.randomUUID();
    setData((d) => ({
      ...d,
      properties: d.properties.map((p) =>
        p.id === current.id ? { ...p, completedAt } : p,
      ),
      records: [
        {
          id,
          propertyId: current.id,
          name: current.name,
          address: current.address,
          completedAt,
          tasks: current.tasks.map((t) => ({ ...t })),
          sample: current.sample,
        },
        ...d.records,
      ],
    }));
    navigate("reports");
    setReportId(id);
  }
  function newTurnover() {
    if (!current) return;
    setData((d) => ({
      ...d,
      records:
        current.completedAt &&
        !d.records.some(
          (r) =>
            r.propertyId === current.id &&
            r.completedAt === current.completedAt,
        )
          ? [
              {
                id: crypto.randomUUID(),
                propertyId: current.id,
                name: current.name,
                address: current.address,
                completedAt: current.completedAt,
                tasks: current.tasks.map((t) => ({ ...t })),
                sample: current.sample,
              },
              ...d.records,
            ]
          : d.records,
      properties: d.properties.map((p) =>
        p.id === current.id
          ? {
              ...p,
              completedAt: undefined,
              tasks: p.tasks.map((t) => ({
                id: t.id,
                label: t.label,
                done: false,
              })),
            }
          : p,
      ),
    }));
    navigate("cleaner");
  }
  function addProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newAddress.trim()) return;
    const id = crypto.randomUUID();
    setData((d) => ({
      ...d,
      properties: [
        ...d.properties,
        {
          id,
          name: newName.trim(),
          address: newAddress.trim(),
          tasks: freshTasks(),
        },
      ],
    }));
    setSelected(id);
    dialog.current?.close();
    setNewName("");
    setNewAddress("");
    navigate("detail");
  }
  function openAdd() {
    dialog.current?.showModal();
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        location.origin +
          "?demo=cleaner&property=" +
          encodeURIComponent(current.id),
      );
      setNotice(
        "Demo link copied. It opens this browser’s data only; it does not share records across devices.",
      );
    } catch {
      setNotice(
        "Clipboard unavailable. Demo link: " +
          location.origin +
          "?demo=cleaner&property=" +
          encodeURIComponent(current.id),
      );
    }
  }
  const propertyList = (
    <div className="property-grid">
      {data.properties.map((p) => (
        <PropertyCard key={p.id} property={p} onClick={() => select(p)} />
      ))}
    </div>
  );
  return (
    <div className="app-shell">
      <MobileHeader view={view} navigate={navigate} />
      <main
        ref={heading}
        tabIndex={-1}
        id="main-content"
        data-ready={ready}
        className={
          "main-content " + (view === "home" ? "dashboard" : "interior")
        }
        aria-label={view + " screen"}
      >
        {view === "home" ? (
          <>
            <section className="hero">
              <div className="hero-image">
                <img
                  src="/images/bedroom.jpg"
                  alt="A sunlit bedroom with soft lavender linens"
                  width="450"
                  height="450"
                  fetchPriority="high"
                />
              </div>
              <div className="hero-copy">
                <p className="greeting">
                  {greeting}! <Sun size={20} aria-hidden="true" />
                </p>
                <h1>
                  Your Turnovers,
                  <br />
                  <em>Beautifully Proven.</em>
                </h1>
                <p className="hero-description">
                  Photo-proof cleaning records for your
                  <br className="desktop-break" /> Airbnb and rental properties.
                </p>
              </div>
            </section>
            <p className="demo-label">
              <span /> Local demo workspace · includes sample properties
            </p>
            <div className="stats">
              <StatCard
                type="properties"
                value={data.properties.length}
                label="Properties"
              />
              <StatCard type="turnovers" value={completed} label="Turnovers" />
              <StatCard type="photos" value={photos} label="Photos" />
            </div>
            <SwoopButton className="add-property" onClick={openAdd}>
              <span className="plus-circle">
                <Plus />
              </span>
              Add Property
            </SwoopButton>
            <div className="section-title">
              <h2>Your Properties</h2>
              <button onClick={() => navigate("properties")}>
                View All <ArrowRight size={19} />
              </button>
            </div>
            {propertyList}
            <section className="recent">
              <div className="section-title">
                <h2>Recent activity</h2>
                <span className="eyebrow">ON THIS DEVICE</span>
              </div>
              {data.records.length ? (
                data.records.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    className="activity-row"
                    onClick={() => {
                      setSelected(r.propertyId);
                      navigate("reports");
                      setReportId(r.id);
                    }}
                  >
                    <CheckCircle2 />
                    <span>
                      <strong>{r.name}</strong>
                      <small>
                        Local turnover completed · {dateLabel(r.completedAt)}
                      </small>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                ))
              ) : (
                <SwoopCard className="empty-state">
                  <Sparkles />
                  <div>
                    <h3>A fresh start, beautifully organized.</h3>
                    <p>
                      Your completed turnovers will appear here. Choose a
                      property to try the checklist.
                    </p>
                  </div>
                </SwoopCard>
              )}
            </section>
          </>
        ) : (
          <>
            <div className="page-heading">
              <p className="eyebrow">PICSYPROOF · LOCAL PROTOTYPE</p>
              <h1>
                {view === "properties"
                  ? "Your Properties"
                  : view === "detail"
                    ? current?.name
                    : view === "cleaner"
                      ? "A beautiful clean."
                      : view === "turnovers"
                        ? "Your Turnovers"
                        : view === "reports"
                          ? "Beautifully documented."
                          : "Make yourself at home."}
              </h1>
              <p className="muted">
                {view === "properties"
                  ? "Every space, thoughtfully cared for."
                  : view === "cleaner"
                    ? "Check the details. Capture the care."
                    : view === "reports"
                      ? "Cleaning records and photo previews, all in one place."
                      : view === "settings"
                        ? "Your workspace. Your preferred appearance."
                        : "Keep every detail in view."}
              </p>
            </div>
            {view === "properties" && (
              <>
                <SwoopButton onClick={openAdd}>
                  <Plus size={20} />
                  Add Property
                </SwoopButton>
                {propertyList}
              </>
            )}
            {view === "detail" && current && (
              <>
                <button
                  className="back-link"
                  onClick={() => navigate("properties")}
                >
                  <ArrowLeft size={17} />
                  All properties
                </button>
                <SwoopCard className="property-detail">
                  <img
                    className="detail-image"
                    src={current.image || "/images/living.jpg"}
                    alt={"Illustrative interior for " + current.name}
                    width="1000"
                    height="500"
                  />
                  <div className="panel-padding">
                    <p className="location">
                      <MapPin size={17} />
                      {current.address}
                    </p>
                    {current.sample && (
                      <p className="eyebrow">
                        SAMPLE PROPERTY · ILLUSTRATIVE PHOTO
                      </p>
                    )}
                    <StatusBadge property={current} />
                    <h2>Cleaning requirements</h2>
                    <ul className="requirements">
                      {current.tasks.map((t) => (
                        <li key={t.id}>{t.label}</li>
                      ))}
                    </ul>
                    <p className="muted">
                      Photos are optional in this prototype. They preview
                      locally and are not securely uploaded.
                    </p>
                    <div className="action-row">
                      <SwoopButton onClick={() => navigate("cleaner")}>
                        <Camera size={20} />
                        {current.completedAt
                          ? "View completed checklist"
                          : "Open cleaning checklist"}
                      </SwoopButton>
                      <button
                        className="secondary"
                        onClick={() => navigate("reports")}
                      >
                        View report <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </SwoopCard>
                <h2 className="spaced-title">Turnover history</h2>
                {data.records.filter((r) => r.propertyId === current.id)
                  .length ? (
                  data.records
                    .filter((r) => r.propertyId === current.id)
                    .map((r) => (
                      <button
                        className="history-row"
                        key={r.id}
                        onClick={() => {
                          setSelected(r.propertyId);
                          navigate("reports");
                          setReportId(r.id);
                        }}
                      >
                        <CheckCircle2 />
                        <span>
                          {dateLabel(r.completedAt)}
                          <small>Completed · local record</small>
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    ))
                ) : (
                  <p className="muted">No saved turnover history yet.</p>
                )}
              </>
            )}
            {view === "cleaner" && current && (
              <>
                <label className="property-select">
                  Property
                  <select
                    value={current.id}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {data.properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.sample ? " (sample)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <SwoopCard className="workflow-head">
                  <div>
                    <p className="eyebrow">
                      {current.sample ? "SAMPLE PROPERTY" : "YOUR PROPERTY"}
                    </p>
                    <h2>{current.name}</h2>
                    <p className="location">
                      <MapPin size={16} />
                      {current.address}
                    </p>
                    <StatusBadge property={current} />
                  </div>
                  <ProgressIndicator tasks={current.tasks} />
                </SwoopCard>
                <div className="section-title">
                  <h2>Cleaning checklist</h2>
                  <Camera size={22} />
                </div>
                <p className="local-caption">
                  Photos stay in this session only. Use Add photo to capture or
                  choose an image.
                </p>
                <TurnoverChecklist property={current} update={updateTask} />
                <SwoopCard className="finish-panel">
                  <div>
                    <h2>
                      {current.completedAt
                        ? "Turnover recorded."
                        : current.tasks.every((t) => t.done)
                          ? "Every detail, taken care of."
                          : "One detail at a time."}
                    </h2>
                    <p className="muted">
                      {current.completedAt
                        ? "Your local report is ready to view."
                        : "Complete all tasks to create a local completion record."}
                    </p>
                  </div>
                  {current.completedAt ? (
                    <div className="action-row">
                      <SwoopButton onClick={() => navigate("reports")}>
                        View report <ArrowRight size={18} />
                      </SwoopButton>
                      <button className="secondary" onClick={newTurnover}>
                        Start next turnover
                      </button>
                    </div>
                  ) : (
                    <SwoopButton
                      disabled={!current.tasks.every((t) => t.done)}
                      onClick={finish}
                    >
                      Finish Turnover <CheckCircle2 size={20} />
                    </SwoopButton>
                  )}
                </SwoopCard>
                <button className="text-button" onClick={copyLink}>
                  <Link2 size={16} />
                  Copy demo cleaner link
                </button>
                <p className="local-caption">
                  Preview link only. No secure invitation or cross-device
                  sharing.
                </p>
              </>
            )}
            {view === "turnovers" && (
              <>
                <h2 className="spaced-title">Current checklists</h2>
                {data.properties.map((p) => (
                  <button
                    key={p.id}
                    className="history-row"
                    onClick={() => select(p, "cleaner")}
                  >
                    <Home />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.tasks.filter((t) => t.done).length} of{" "}
                        {p.tasks.length} tasks ·{" "}
                        {p.sample ? "Sample property" : "Local property"}
                      </small>
                    </span>
                    <StatusBadge property={p} />
                    <ArrowRight size={18} />
                  </button>
                ))}
                <h2 className="spaced-title">Completed history</h2>
                {data.records.length ? (
                  data.records.map((r) => (
                    <button
                      className="history-row"
                      key={r.id}
                      onClick={() => {
                        setSelected(r.propertyId);
                        navigate("reports");
                        setReportId(r.id);
                      }}
                    >
                      <CheckCircle2 />
                      <span>
                        <strong>{r.name}</strong>
                        <small>{dateLabel(r.completedAt)} · Local record</small>
                      </span>
                      <ArrowRight size={18} />
                    </button>
                  ))
                ) : (
                  <SwoopCard className="empty-state">
                    <CheckCircle2 />
                    <p>
                      No completed turnovers yet. Finish a checklist to create
                      your first local record.
                    </p>
                  </SwoopCard>
                )}
              </>
            )}
            {view === "reports" && report && (
              <>
                <div className="report-controls no-print">
                  <label>
                    Property
                    <select
                      value={current.id}
                      onChange={(e) => {
                        setSelected(e.target.value);
                        setReportId(undefined);
                      }}
                    >
                      {data.properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Record
                    <select
                      value={reportId || "current"}
                      onChange={(e) =>
                        setReportId(
                          e.target.value === "current"
                            ? undefined
                            : e.target.value,
                        )
                      }
                    >
                      <option value="current">
                        Current checklist{" "}
                        {current.completedAt ? "· completed" : "· draft"}
                      </option>
                      {data.records
                        .filter((r) => r.propertyId === current.id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {dateLabel(r.completedAt)}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <EvidenceReport property={report} />
                <SwoopButton
                  className="no-print"
                  onClick={() => window.print()}
                >
                  <Download size={19} />
                  Print / Save PDF
                </SwoopButton>
              </>
            )}
            {view === "settings" && (
              <div className="settings-grid">
                <SwoopCard className="panel-padding">
                  <h2>A little more you.</h2>
                  <p className="muted">
                    System follows your device. Your choice is saved in this
                    browser.
                  </p>
                  <ThemeSwitcher theme={theme} setTheme={setTheme} />
                </SwoopCard>
                <SwoopCard className="panel-padding">
                  <h2>Workspace</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      try {
                        localStorage.setItem(
                          "picsyproof-workspace-name",
                          workspaceName.trim() || "My workspace",
                        );
                        setNotice("Workspace name saved on this device.");
                      } catch {
                        setNotice(
                          "Unable to save workspace name in this browser.",
                        );
                      }
                    }}
                  >
                    <label>
                      Workspace name
                      <input
                        maxLength={80}
                        required
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                      />
                    </label>
                    <button className="secondary" type="submit">
                      Save locally
                    </button>
                  </form>
                  <p className="local-caption">
                    Local preference only. Team access and workspace permissions
                    are not connected.
                  </p>
                </SwoopCard>
                <SwoopCard className="panel-padding">
                  <h2>Account & profile</h2>
                  <p className="muted">
                    You’re exploring the local prototype. Sign-in, account
                    editing, team invitations, secure photo storage, and
                    permanent evidence reports are not connected to a backend.
                  </p>
                  <span className="status-badge ready">Not connected</span>
                </SwoopCard>
              </div>
            )}
          </>
        )}
        <footer className="app-footer">
          <Camera size={16} />
          <span>
            PicsyProof <span>·</span> A little care. A clearer record.
          </span>
          <button
            onClick={() => navigate("settings")}
            aria-label="Open settings"
          >
            <Settings size={19} />
          </button>
          <small>
            Local prototype · photos and device timestamps are unverified.
          </small>
        </footer>
      </main>
      {/* Keep fixed navigation outside main and any transformed/filtered containers. */}
      <BottomNavigation view={view} navigate={navigate} />
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="property-dialog"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <form onSubmit={addProperty}>
          <button
            type="button"
            className="dialog-close"
            aria-label="Close add property"
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
          <span className="eyebrow">A NEW SPACE</span>
          <h2>Add your property</h2>
          <p className="muted">
            A beautiful clean starts here. Saved only in this browser.
          </p>
          <label>
            Property name
            <input
              autoFocus
              required
              maxLength={100}
              placeholder="e.g. Seaside Cottage"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <label>
            City / location
            <input
              required
              maxLength={150}
              placeholder="e.g. Charleston, SC"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
            />
          </label>
          <p className="local-caption">
            An illustrative property image will be used.
          </p>
          <SwoopButton
            type="submit"
            disabled={!newName.trim() || !newAddress.trim()}
          >
            <Plus size={20} />
            Add Property
          </SwoopButton>
        </form>
      </dialog>
    </div>
  );
}
