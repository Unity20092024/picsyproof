"use client";
import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Home,
  Image as ImageIcon,
  MapPin,
  Menu,
  Moon,
  Monitor,
  Plus,
  Settings,
  Sun,
  Trash2,
  X,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import {
  dateLabel,
  type Property,
  type Task,
  type Theme,
  type View,
} from "@/lib/model";
export function SwoopCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={"swoop-card " + className}>{children}</section>;
}
export function SwoopButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={"swoop-button " + className} {...props}>
      {children}
      <span className="button-glint" aria-hidden="true">
        ✦
      </span>
    </button>
  );
}
export const navigation: { view: View; label: string; icon: typeof Home }[] = [
  { view: "home", label: "Home", icon: Home },
  { view: "properties", label: "Properties", icon: Home },
  { view: "cleaner", label: "Camera", icon: Camera },
  { view: "turnovers", label: "Turnovers", icon: ClipboardCheck },
  { view: "reports", label: "Reports", icon: ChartNoAxesColumnIncreasing },
];
export function MobileHeader({
  view,
  navigate,
}: {
  view: View;
  navigate: (v: View) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <header className="mobile-header">
        <svg
          className="header-sculpture"
          viewBox="0 0 390 110"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="header-gradient">
              <stop stopColor="var(--header-start)" />
              <stop offset="1" stopColor="var(--header-end)" />
            </linearGradient>
          </defs>
          <path
            fill="url(#header-gradient)"
            d="M0 0H296C266 0 253 31 229 46C207 60 184 61 153 61H53C29 61 9 69 0 84Z"
          />
        </svg>
        <a
          className="brand"
          href="#home"
          onClick={() => navigate("home")}
          aria-label="PicsyProof home"
        >
          <span className="brand-camera">
            <Camera />
          </span>
          <span>
            Picsy<span>Proof</span>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation
            .filter((n) => n.view !== "cleaner")
            .map((n) => (
              <a
                key={n.view}
                href={"#" + n.view}
                aria-current={view === n.view ? "page" : undefined}
                onClick={() => navigate(n.view)}
              >
                {n.label}
              </a>
            ))}
          <a
            href="#settings"
            onClick={() => navigate("settings")}
            aria-label="Settings"
          >
            <Settings size={20} />
          </a>
        </nav>
        <button
          ref={menuButton}
          className="menu-button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="header-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      {open && (
        <nav
          id="header-menu"
          className="header-menu"
          aria-label="Menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              menuButton.current?.focus();
            }
          }}
        >
          {[
            ...navigation,
            { view: "settings" as View, label: "Settings", icon: Settings },
          ].map((n) => (
            <a
              key={n.view}
              href={"#" + n.view}
              onClick={() => {
                navigate(n.view);
                setOpen(false);
              }}
            >
              <n.icon size={20} />
              {n.label}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
export function BottomNavigation({
  view,
  navigate,
}: {
  view: View;
  navigate: (v: View) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {navigation.map(({ view: target, label, icon: Icon }) => (
        <a
          key={target}
          href={"#" + target}
          className={
            (target === "cleaner" ? "camera-nav " : "") +
            (view === target || (view === "detail" && target === "properties")
              ? "selected"
              : "")
          }
          aria-current={view === target ? "page" : undefined}
          aria-label={
            target === "cleaner"
              ? "Camera: choose a turnover and upload photos"
              : label
          }
          onClick={() => navigate(target)}
        >
          <span>
            <Icon />
          </span>
          {target !== "cleaner" && <small>{label}</small>}
        </a>
      ))}
    </nav>
  );
}
export function StatCard({
  type,
  value,
  label,
}: {
  type: "properties" | "turnovers" | "photos";
  value: number;
  label: string;
}) {
  const Icon =
    type === "properties"
      ? Home
      : type === "turnovers"
        ? CheckCircle2
        : ImageIcon;
  return (
    <SwoopCard className="stat-card">
      <span className="stat-icon">
        <Icon />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </SwoopCard>
  );
}
export function StatusBadge({ property }: { property: Property }) {
  const started = property.tasks.some((t) => t.done || t.photo);
  return (
    <span
      className={
        "status-badge " +
        (property.completedAt ? "complete" : started ? "progress" : "ready")
      }
    >
      {property.completedAt ? (
        <CheckCircle2 size={14} />
      ) : (
        <ClipboardCheck size={14} />
      )}{" "}
      {property.completedAt
        ? "Turnover Complete"
        : started
          ? "Cleaning in Progress"
          : "Ready for Turnover"}
    </span>
  );
}
export function PropertyCard({
  property: p,
  onClick,
}: {
  property: Property;
  onClick: () => void;
}) {
  return (
    <button className="property-card swoop-card" onClick={onClick}>
      <img
        src={p.image || "/images/living.jpg"}
        alt=""
        width="220"
        height="170"
        loading="lazy"
      />
      <div className="property-copy">
        <h3>{p.name}</h3>
        <p>
          <MapPin size={15} />
          {p.address}
        </p>
        <StatusBadge property={p} />
        {p.completedAt && <small>{dateLabel(p.completedAt)}</small>}
        {p.sample && <small className="sample-tag">Sample property</small>}
      </div>
      <span className="property-arrow">
        <ChevronRight />
      </span>
    </button>
  );
}
export function ProgressIndicator({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter((t) => t.done).length;
  return (
    <div className="progress-indicator">
      <div>
        <span>Cleaning progress</span>
        <strong>
          {done} / {tasks.length}
        </strong>
      </div>
      <progress
        value={done}
        max={tasks.length}
        aria-label="Cleaning checklist progress"
      />
      <small>{Math.round((done / tasks.length) * 100)}% complete</small>
    </div>
  );
}
export function PhotoUploader({
  task,
  update,
  disabled,
}: {
  task: Task;
  update: (patch: Partial<Task>) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="photo-uploader">
      <button
        className="photo-button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        aria-label={
          (task.photo ? "Replace photo for " : "Add photo for ") + task.label
        }
      >
        <Camera size={17} />
        {task.photo ? "Replace" : "Add photo"}
      </button>
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        aria-label={"Upload photo for " + task.label}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setError("");
          if (
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size > 5 * 1024 * 1024
          ) {
            setError("Choose a JPEG, PNG or WebP under 5 MB.");
            return;
          }
          const reader = new FileReader();
          reader.onerror = () =>
            setError("This image could not be read. Try another image.");
          reader.onload = () => {
            const img = new window.Image();
            img.onload = () => update({ photo: String(reader.result) });
            img.onerror = () => setError("This file is not a readable image.");
            img.src = String(reader.result);
          };
          reader.readAsDataURL(file);
        }}
      />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {task.photo && (
        <div className="photo-preview">
          <img src={task.photo} alt={"Local photo preview: " + task.label} />
          <button
            disabled={disabled}
            aria-label={"Remove photo for " + task.label}
            onClick={() => update({ photo: undefined })}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
export function TurnoverChecklist({
  property,
  update,
}: {
  property: Property;
  update: (id: string, patch: Partial<Task>) => void;
}) {
  return (
    <div className="checklist">
      {property.tasks.map((t, i) => (
        <SwoopCard key={t.id} className={"task " + (t.done ? "task-done" : "")}>
          <label className="task-label">
            <input
              type="checkbox"
              checked={t.done}
              disabled={!!property.completedAt}
              onChange={() => update(t.id, { done: !t.done })}
            />
            <span>
              <small>STEP {String(i + 1).padStart(2, "0")}</small>
              <strong>{t.label}</strong>
            </span>
          </label>
          <PhotoUploader
            task={t}
            disabled={!!property.completedAt}
            update={(patch) => update(t.id, patch)}
          />
        </SwoopCard>
      ))}
    </div>
  );
}
export function ThemeSwitcher({
  theme,
  setTheme,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
}) {
  return (
    <fieldset className="theme-switcher">
      <legend>Appearance</legend>
      {(["system", "light", "dark"] as const).map((mode) => {
        const Icon =
          mode === "system" ? Monitor : mode === "light" ? Sun : Moon;
        return (
          <label key={mode} className={theme === mode ? "active" : ""}>
            <input
              type="radio"
              name="theme"
              checked={theme === mode}
              onChange={() => setTheme(mode)}
            />
            <Icon size={20} />
            {mode[0].toUpperCase() + mode.slice(1)}
          </label>
        );
      })}
    </fieldset>
  );
}
export function EvidenceReport({ property }: { property: Property }) {
  return (
    <SwoopCard className="evidence-report">
      <div className="report-heading">
        <Camera />
        <span
          className={
            "status-badge " + (property.completedAt ? "complete" : "ready")
          }
        >
          {property.completedAt ? "Completed · local record" : "Draft"}
        </span>
      </div>
      <h2>{property.name}</h2>
      <p className="muted">
        {property.address}
        {property.sample ? " · Sample property" : ""}
      </p>
      <dl>
        <div>
          <dt>Local completion time</dt>
          <dd>{dateLabel(property.completedAt)}</dd>
        </div>
        <div>
          <dt>Checklist results</dt>
          <dd>
            {property.tasks.filter((t) => t.done).length} /{" "}
            {property.tasks.length} checked
          </dd>
        </div>
      </dl>
      {property.tasks.map((t) => (
        <div className="report-task" key={t.id}>
          <p>
            {t.done ? <Check size={18} /> : <span className="pending-dot" />}
            <strong>{t.label}</strong>
            <small>{t.done ? "Checked" : "Pending"}</small>
          </p>
          {t.photo && (
            <img src={t.photo} alt={"Unverified local photo: " + t.label} />
          )}
        </div>
      ))}
      <p className="local-notice">
        LOCAL PROTOTYPE — {property.sample ? "Sample property. " : ""}Photos are
        browser-session previews and disappear on reload. Times come from this
        device. This report is not verified or tamper-resistant evidence.
      </p>
    </SwoopCard>
  );
}
