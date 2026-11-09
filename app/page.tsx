"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList as ClipboardListIcon,
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
  loadWorkspace,
  starter,
  withoutPhotos,
  type Property,
  type Task,
  type Theme,
  type View,
  type Workspace,
  type Turnover,
} from "@/lib/model";
import { CreateTurnoverForm } from "@/components/create-turnover-form";
import { turnoverLabel } from "@/lib/scheduling";
import { PropertyForm, UnsavedChangesDialog } from "@/components/property-form";
const views: View[] = [
  "home",
  "properties",
  "add-property",
  "create-turnover",
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
  const [activeTurnoverId, setActiveTurnoverId] = useState<string>();
  const [createOrigin, setCreateOrigin] = useState<View>("turnovers");
  const [createdTurnoverId, setCreatedTurnoverId] = useState<string>();
  const formDirty = useRef(false);
  const activeView = useRef<View>(view);
  activeView.current = view;
  const sessionPhotoUrls = useRef(new Set<string>());
  const [pendingNavigation, setPendingNavigation] = useState<View | null>(null);
  const onFormDirtyChange = useCallback((dirty: boolean) => {
    formDirty.current = dirty;
  }, []);
  useEffect(
    () => () => {
      for (const url of sessionPhotoUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );
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
      setActiveTurnoverId(
        sessionStorage.getItem("picsyproof-active-turnover") || undefined,
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
      if (!views.includes(hash)) return;
      if (
        (activeView.current === "add-property" ||
          activeView.current === "create-turnover") &&
        formDirty.current &&
        hash !== activeView.current
      ) {
        history.pushState(null, "", "#" + activeView.current);
        setPendingNavigation(hash);
        return;
      }
      setView(hash);
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
      if (activeTurnoverId)
        sessionStorage.setItem("picsyproof-active-turnover", activeTurnoverId);
      else sessionStorage.removeItem("picsyproof-active-turnover");
      if (reportId)
        sessionStorage.setItem("picsyproof-selected-report", reportId);
      else sessionStorage.removeItem("picsyproof-selected-report");
    } catch {}
  }, [selected, reportId, activeTurnoverId, ready]);
  function navigate(next: View, discard = false) {
    if (
      (view === "add-property" || view === "create-turnover") &&
      next !== view &&
      formDirty.current &&
      !discard
    ) {
      setPendingNavigation(next);
      return;
    }
    setView(next);
    if (next !== "reports") setReportId(undefined);
    history.pushState(null, "", "#" + next);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  }
  const baseProperty =
    data.properties.find((p) => p.id === selected) || data.properties[0];
  const activeTurnover = data.turnovers.find((t) => t.id === activeTurnoverId);
  const current =
    view === "cleaner" && activeTurnover
      ? {
          ...data.properties.find((p) => p.id === activeTurnover.propertyId),
          id: activeTurnover.propertyId,
          name: activeTurnover.name,
          address: activeTurnover.address,
          sample: activeTurnover.sample,
          tasks: activeTurnover.checklistSnapshot,
          completedAt: activeTurnover.completedAt,
        }
      : baseProperty;
  const record = data.records.find((r) => r.id === reportId);
  const report: Property | undefined = record
    ? { ...record, id: record.propertyId }
    : current;
  const completed =
    data.turnovers.filter((t) => t.status !== "completed").length +
    data.records.length +
    data.properties.filter(
      (p) =>
        p.completedAt &&
        !data.records.some(
          (r) => r.propertyId === p.id && r.completedAt === p.completedAt,
        ),
    ).length;
  const photos =
    data.properties.reduce((sum, p) => sum + (p.photos?.length || 0), 0) +
    [
      ...data.turnovers
        .filter((t) => t.status !== "completed")
        .flatMap((t) => t.checklistSnapshot),
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
    setActiveTurnoverId(undefined);
    setSelected(p.id);
    setReportId(undefined);
    navigate(next);
  }
  function updateTask(id: string, patch: Partial<Task>) {
    if (!current || current.completedAt) return;
    if (activeTurnover && view === "cleaner") {
      setData((d) => ({
        ...d,
        turnovers: d.turnovers.map((t) =>
          t.id === activeTurnover.id
            ? {
                ...t,
                status: "in-progress",
                updatedAt: new Date().toISOString(),
                checklistSnapshot: t.checklistSnapshot.map((task) =>
                  task.id === id ? { ...task, ...patch } : task,
                ),
              }
            : t,
        ),
      }));
      return;
    }
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
    if (
      !current ||
      current.completedAt ||
      !current.tasks.every((t) => t.done && (!t.requiresPhoto || t.photo))
    )
      return;
    const completedAt = new Date().toISOString();
    const id = crypto.randomUUID();
    setData((d) => ({
      ...d,
      turnovers: activeTurnover
        ? d.turnovers.map((t) =>
            t.id === activeTurnover.id
              ? {
                  ...t,
                  status: "completed",
                  completedAt,
                  updatedAt: completedAt,
                }
              : t,
          )
        : d.turnovers,
      properties: d.properties.map((p) =>
        p.id === current.id && !activeTurnover ? { ...p, completedAt } : p,
      ),
      records: [
        {
          id,
          turnoverId: activeTurnover?.id,
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
    if (activeTurnover) {
      openCreateTurnover(current.id);
      return;
    }
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
                requiresPhoto: t.requiresPhoto,
              })),
            }
          : p,
      ),
    }));
    navigate("cleaner");
  }
  function openCreateTurnover(propertyId?: string) {
    setNotice("");
    setCreatedTurnoverId(undefined);
    setCreateOrigin(view === "detail" ? "detail" : "turnovers");
    if (propertyId) setSelected(propertyId);
    navigate("create-turnover");
  }
  async function saveScheduledTurnover(turnover: Turnover) {
    const next = { ...data, turnovers: [turnover, ...data.turnovers] };
    localStorage.setItem(
      "picsyproof-workspace-v2",
      JSON.stringify(withoutPhotos(next)),
    );
    formDirty.current = false;
    setData(next);
    setSelected(turnover.propertyId);
    setCreatedTurnoverId(turnover.id);
    setActiveTurnoverId(turnover.id);
    navigate("turnovers", true);
  }
  function openJob(job: Turnover) {
    setSelected(job.propertyId);
    setActiveTurnoverId(job.id);
    const record = data.records.find((r) => r.turnoverId === job.id);
    if (job.status === "completed" && record) {
      navigate("reports");
      setReportId(record.id);
    } else navigate("cleaner");
  }
  const jobRows = (jobs: Turnover[]) =>
    jobs.map((job) => (
      <button
        key={job.id}
        className="scheduled-job-row"
        onClick={() => openJob(job)}
      >
        <ClipboardListIcon />
        <span>
          <strong>{job.name}</strong>
          <small>{turnoverLabel(job)}</small>
          <small>
            {job.status === "scheduled"
              ? "Upcoming"
              : job.status === "in-progress"
                ? "Cleaning in progress"
                : "Completed"}{" "}
            · {job.checklistSnapshot.length} tasks ·{" "}
            {job.cleanerName
              ? job.cleanerName + (job.cleanerIsDemo ? " (demo)" : " (local)")
              : "Unassigned"}
          </small>
        </span>
        <ArrowRight size={18} />
      </button>
    ));
  async function saveNewProperty(property: Property) {
    const next = { ...data, properties: [...data.properties, property] };
    // Confirm the existing local store accepted the record before leaving the form.
    localStorage.setItem(
      "picsyproof-workspace-v2",
      JSON.stringify(withoutPhotos(next)),
    );
    for (const photo of property.photos || [])
      sessionPhotoUrls.current.add(photo.url);
    formDirty.current = false;
    setData(next);
    setSelected(property.id);
    setNotice(
      "Property saved locally on this device." +
        (property.photos?.length
          ? " Photo previews will disappear on reload."
          : ""),
    );
    navigate("properties", true);
  }
  function openAdd() {
    setNotice("");
    navigate("add-property");
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
    <div
      className={
        "app-shell" +
        (view === "add-property" || view === "create-turnover"
          ? " property-creation-shell"
          : "")
      }
    >
      <MobileHeader
        view={view}
        navigate={navigate}
        onBack={
          view === "add-property"
            ? () => navigate("properties")
            : view === "create-turnover"
              ? () => navigate(createOrigin)
              : undefined
        }
      />
      <main
        ref={heading}
        tabIndex={-1}
        id="main-content"
        data-ready={ready}
        className={
          "main-content " +
          (view === "home"
            ? "dashboard"
            : view === "add-property" || view === "create-turnover"
              ? "property-creation"
              : "interior")
        }
        aria-label={view + " screen"}
      >
        {view === "create-turnover" ? (
          <CreateTurnoverForm
            properties={data.properties}
            cleaners={data.cleaners}
            initialPropertyId={selected}
            onSave={saveScheduledTurnover}
            onDirtyChange={onFormDirtyChange}
            onAddProperty={openAdd}
          />
        ) : view === "add-property" ? (
          <PropertyForm
            properties={data.properties}
            onSave={saveNewProperty}
            onDirtyChange={onFormDirtyChange}
            onCancel={() => navigate("properties")}
          />
        ) : view === "home" ? (
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
                      Photos stay in this browser session. Tasks marked as
                      requiring photos need a preview before completion;
                      previews are not secure uploads.
                    </p>
                    <div className="action-row">
                      <SwoopButton
                        onClick={() => openCreateTurnover(current.id)}
                      >
                        <Plus size={20} />
                        Create Turnover
                      </SwoopButton>
                      <SwoopButton
                        onClick={() => {
                          setActiveTurnoverId(undefined);
                          navigate("cleaner");
                        }}
                      >
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
                {jobRows(
                  data.turnovers.filter(
                    (t) =>
                      t.propertyId === current.id && t.status !== "completed",
                  ),
                )}
                {data.records.filter((r) => r.propertyId === current.id).length
                  ? data.records
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
                  : !data.turnovers.some(
                      (t) => t.propertyId === current.id,
                    ) && (
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
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setActiveTurnoverId(undefined);
                    }}
                  >
                    {data.properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.sample ? " (sample)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {activeTurnover && (
                  <section className="turnover-job-meta">
                    <h2>Assigned turnover</h2>
                    <p>{turnoverLabel(activeTurnover)}</p>
                    <p>
                      {activeTurnover.cleanerName
                        ? activeTurnover.cleanerName +
                          (activeTurnover.cleanerIsDemo
                            ? " · Demo cleaner"
                            : " · Local cleaner")
                        : "Unassigned"}{" "}
                      · {activeTurnover.status}
                    </p>
                    {activeTurnover.specialInstructions && (
                      <p>
                        <strong>Special instructions</strong>
                        <br />
                        {activeTurnover.specialInstructions}
                      </p>
                    )}
                    {activeTurnover.estimatedDurationMinutes && (
                      <p>
                        Estimated duration:{" "}
                        {activeTurnover.estimatedDurationMinutes} minutes
                      </p>
                    )}
                    <p>
                      {activeTurnover.requirePhotoEvidence
                        ? "A photo preview is required for every task."
                        : "Individually marked photo requirements remain mandatory."}{" "}
                      Local preview only; photos expire on reload.
                    </p>
                    <p>
                      Notification preference:{" "}
                      {activeTurnover.notifyCleanerPreference
                        ? "requested"
                        : "off"}
                      . No notification has been sent.
                    </p>
                  </section>
                )}
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
                        : current.tasks.every(
                              (t) => t.done && (!t.requiresPhoto || t.photo),
                            )
                          ? "Every detail, taken care of."
                          : "One detail at a time."}
                    </h2>
                    <p className="muted">
                      {current.completedAt
                        ? "Your local report is ready to view."
                        : "Complete all tasks and required photo previews to create a local completion record."}
                    </p>
                  </div>
                  {current.completedAt ? (
                    <div className="action-row">
                      <SwoopButton
                        onClick={() => {
                          navigate("reports");
                          if (activeTurnover)
                            setReportId(
                              data.records.find(
                                (r) => r.turnoverId === activeTurnover.id,
                              )?.id,
                            );
                        }}
                      >
                        View report <ArrowRight size={18} />
                      </SwoopButton>
                      <button className="secondary" onClick={newTurnover}>
                        Start next turnover
                      </button>
                    </div>
                  ) : (
                    <SwoopButton
                      disabled={
                        !current.tasks.every(
                          (t) => t.done && (!t.requiresPhoto || t.photo),
                        )
                      }
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
                <SwoopButton onClick={() => openCreateTurnover()}>
                  <Plus size={20} />
                  Create Turnover
                </SwoopButton>
                {createdTurnoverId &&
                  data.turnovers.some((t) => t.id === createdTurnoverId) && (
                    <div className="turnover-success" role="status">
                      <CheckCircle2 />
                      Turnover saved locally. No notification has been sent.
                      <button
                        className="secondary"
                        onClick={() => setCreatedTurnoverId(undefined)}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                <h2 className="spaced-title">Scheduled turnovers</h2>
                {data.turnovers.some((t) => t.status !== "completed") ? (
                  jobRows(
                    data.turnovers.filter((t) => t.status !== "completed"),
                  )
                ) : (
                  <p className="muted">No scheduled turnovers yet.</p>
                )}

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
        {view !== "add-property" && view !== "create-turnover" && (
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
        )}
      </main>
      {/* Keep fixed navigation outside main and any transformed/filtered containers. */}
      {view !== "add-property" && view !== "create-turnover" && (
        <BottomNavigation view={view} navigate={navigate} />
      )}
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
      <UnsavedChangesDialog
        title={
          view === "create-turnover" ? "Keep your turnover setup?" : undefined
        }
        description={
          view === "create-turnover"
            ? "You have unsaved scheduling and checklist changes. Discarding will remove this turnover draft."
            : undefined
        }
        destination={pendingNavigation}
        onStay={() => setPendingNavigation(null)}
        onDiscard={() => {
          const next = pendingNavigation;
          setPendingNavigation(null);
          formDirty.current = false;
          if (next) navigate(next, true);
        }}
      />
    </div>
  );
}
